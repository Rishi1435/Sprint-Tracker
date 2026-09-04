// Magic-link authentication via Supabase Auth.
// The local "name" flow remains as a fallback when auth is disabled or the
// user prefers not to use email.

import { supabase, supabaseConfigured } from "./supabaseClient";
import { linkAuthUser, getUserByAuthId } from "./db";
import type { UserRow } from "./types";

export const authEnabled = Boolean(
  supabaseConfigured && (process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED ?? "true") !== "false"
);

/**
 * The origin a magic link should come back to.
 *
 * Reading `window.location.origin` instead meant the mailed link was whichever
 * host happened to ask for it, so requesting one from `npm run dev` sent out
 * http://localhost:3000 — an address that resolves only on the machine that
 * asked, and never on the phone where the mail actually gets opened.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when set. Vercel's own production domain is the
 * fallback (it publishes `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` on every
 * deployment, preview builds included), so a deploy points at itself without
 * anyone configuring anything. Only with neither does the current tab's origin
 * stand in, which is what a local-only setup wants.
 */
export function siteOrigin(): string | undefined {
  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (configured) {
    return /^https?:\/\//.test(configured) ? configured : `https://${configured}`;
  }
  return typeof window !== "undefined" ? window.location.origin : undefined;
}

export async function signInWithEmail(email: string, existingUserId?: string): Promise<{ ok: boolean; message?: string }> {
  if (!supabaseConfigured) {
    return { ok: false, message: "Supabase is not configured. Add env vars first." };
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "Please enter a valid email." };
  }
  // `/auth/callback` rather than `/dashboard` directly: that route exchanges the
  // code for a session and links this email to the local profile before handing
  // over to the dashboard, so skipping it signs nobody in.
  const origin = siteOrigin();
  const redirectTo = origin ? `${origin}/auth/callback` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  // Stash the current local user id so we can link after the magic-link callback
  if (existingUserId && typeof window !== "undefined") {
    localStorage.setItem("sprintroom_link_to", existingUserId);
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — local session will still be cleared by the consumer
  }
}

/**
 * Resolve the local user row for the currently signed-in Supabase Auth user.
 * If no row is linked yet, a fresh one is created from the email.
 * Returns null when nobody is signed in.
 */
export async function resolveLocalUserForCurrentAuth(): Promise<{
  user: UserRow | null;
  authUserId: string | null;
  email: string | null;
}> {
  if (!supabaseConfigured) return { user: null, authUserId: null, email: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("auth.getSession error", error);
  }
  const session = data.session;
  if (!session) return { user: null, authUserId: null, email: null };
  const authUserId = session.user.id;
  const email = session.user.email ?? null;

  const linked = await getUserByAuthId(authUserId).catch(() => null);
  if (linked) return { user: linked, authUserId, email };

  // First-time sign-in: link to existing local user if requested via stash, else create.
  let linkTo: string | undefined;
  if (typeof window !== "undefined") {
    const stash = localStorage.getItem("sprintroom_link_to");
    if (stash) {
      linkTo = stash;
      localStorage.removeItem("sprintroom_link_to");
    }
  }
  if (!email) return { user: null, authUserId, email: null };
  const created = await linkAuthUser(authUserId, email, linkTo);
  return { user: created, authUserId, email };
}

/**
 * Listen for Supabase Auth state changes. Returns an unsubscribe function.
 * The callback receives the resolved local user row (or null if signed out /
 * no row exists yet).
 */
export function onAuthChange(cb: (info: { user: UserRow | null; event: string }) => void): () => void {
  if (!supabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange(async (event) => {
    try {
      const { user } = await resolveLocalUserForCurrentAuth();
      cb({ user, event });
    } catch (err) {
      console.warn("onAuthChange error", err);
      cb({ user: null, event });
    }
  });
  return () => {
    data.subscription.unsubscribe();
  };
}
