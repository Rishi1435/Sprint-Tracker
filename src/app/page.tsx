"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useClientValue } from "@/lib/useClientValue";
import { getOrCreateUser } from "@/lib/db";
import { describeError } from "@/lib/errors";
import { supabaseConfigured } from "@/lib/supabaseClient";
import { authEnabled, signInWithEmail } from "@/lib/auth";
import { TOTAL_DAYS, TOTAL_TASKS } from "@/lib/plan";
import Icon from "@/components/Icon";

type Mode = "email" | "name";

const LINK_ERROR =
  "That sign-in link didn't work — it may have expired. Send yourself a fresh one.";

/**
 * The `?auth_error` param set by the magic-link callback route is the source of
 * truth for the failure message, read during render (never in an effect) so the
 * server and hydration passes agree.
 */
function readLinkFailed(): boolean {
  return new URLSearchParams(window.location.search).has("auth_error");
}

/** Strip the param so a reload doesn't resurrect the message. */
function clearLinkFailed() {
  if (typeof window === "undefined") return;
  if (!readLinkFailed()) return;
  window.history.replaceState({}, "", window.location.pathname);
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, setSession } = useCurrentUser();
  const [mode, setMode] = useState<Mode>(authEnabled ? "email" : "name");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Falls back to `false` during SSR/hydration, then re-reads on the client.
  const linkFailed = useClientValue(readLinkFailed, false);
  const shownError = error ?? (linkFailed ? LINK_ERROR : null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  function resetError() {
    setError(null);
    clearLinkFailed();
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    resetError();
    try {
      const u = await getOrCreateUser(name, nickname);
      setSession(u);
      router.push("/dashboard");
    } catch (err) {
      setError(
        supabaseConfigured
          ? "Couldn't reach the database. Check your Supabase setup and try again."
          : "Supabase isn't configured yet — add your env vars first (see README)."
      );
      console.error(`Sign-in failed — ${describeError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    resetError();
    const res = await signInWithEmail(email);
    setSubmitting(false);
    if (res.ok) {
      setSent(true);
    } else {
      setError(res.message ?? "Couldn't send the sign-in link. Try again.");
    }
  }

  return (
    /* `dvh`, not `vh`: mobile browsers count the collapsing URL bar in `vh`, which
       would leave the hero pushed below the fold on first paint. */
    <div className="flex min-h-[calc(100dvh-140px)] items-center justify-center py-8 sm:py-10">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,21rem)] lg:gap-14">
        {/* Pitch */}
        <div className="animate-fade-in-up flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="max-w-[20ch] font-display text-4xl font-semibold leading-[1.07] text-text sm:text-5xl">
            Every day checked off, in front of everyone.
          </h1>

          <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-text-muted">
            Aptitude, reasoning, verbal, CS fundamentals, Java, DSA and LeetCode —
            one plan, ticked off nightly, visible to the whole squad.
          </p>

          {/* The sprint, drawn. Three rows of seven is the thing the whole app is
              about, so it opens the page instead of a stock graphic. Fixed demo
              state, not live data — identical markup on the server and after
              hydration. */}
          <div className="mt-9 w-full max-w-[19.5rem]">
            <div aria-hidden className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const day = i + 1;
                const done = day <= 8;
                const today = day === 9;
                return (
                  <span
                    key={day}
                    className={`grid aspect-square place-items-center rounded-md text-xs font-semibold ${
                      done
                        ? "bg-done text-on-fill"
                        : today
                          ? "bg-accent-soft text-accent"
                          : "bg-surface-raised text-text-faint"
                    }`}
                    style={today ? { boxShadow: "inset 0 0 0 1.5px var(--accent)" } : undefined}
                  >
                    {done ? (
                      <Icon name="check" size={12} strokeWidth={2.8} />
                    ) : (
                      <span className="num">{day}</span>
                    )}
                  </span>
                );
              })}
            </div>
            <p className="mt-3.5 text-sm leading-relaxed text-text-muted">
              {TOTAL_DAYS} days, {TOTAL_TASKS} tasks a night, one square each. Nothing to set up.
            </p>
          </div>
        </div>

        {/* Sign-in */}
        <div
          className="panel animate-fade-in-up w-full max-w-sm justify-self-center p-5 sm:p-6"
          style={{ animationDelay: "0.12s" }}
        >
          {authEnabled && !sent && (
            <div
              role="tablist"
              aria-label="Sign-in method"
              className="mb-5 flex items-stretch gap-1 rounded-lg border border-border-soft bg-surface-raised p-1"
            >
              {([
                { key: "email" as Mode, label: "Email link" },
                { key: "name" as Mode, label: "Quick join" },
              ]).map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={mode === t.key}
                  onClick={() => {
                    setMode(t.key);
                    resetError();
                  }}
                  className={`min-h-[40px] flex-1 rounded-md px-3 text-base font-semibold transition-colors duration-200 ${
                    mode === t.key
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {sent ? (
            <div className="py-4 text-center">
              <div
                className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full text-accent"
                style={{ background: "var(--accent-soft)" }}
              >
                <Icon name="mail" size={22} />
              </div>
              <h2 className="font-display text-lg font-semibold text-text">Check your inbox</h2>
              <p className="mt-2 text-base leading-relaxed text-text-muted">
                We sent a sign-in link to <span className="font-semibold text-text">{email}</span>.
                Open it on this device to enter the sprint room.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  resetError();
                }}
                className="btn-ghost mt-5 min-h-[44px] w-full"
              >
                Use a different email
              </button>
            </div>
          ) : mode === "email" ? (
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-5">
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-text-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  maxLength={120}
                  className="input-field"
                  required
                />
              </div>
              {shownError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-base leading-relaxed text-warn"
                >
                  {shownError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="btn-primary min-h-[48px] w-full"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Sending the link…
                  </>
                ) : (
                  "Email me a link"
                )}
              </button>

              <p className="mt-4 text-center text-sm leading-relaxed text-text-faint">
                No password. Your progress is tied to your email, so only you can tick your boxes.
              </p>
            </form>
          ) : (
            <form onSubmit={handleNameSubmit}>
              <div className="mb-5">
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-text-muted">
                  Username
                </label>
                <input
                  id="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. rishi"
                  autoFocus
                  maxLength={40}
                  className="input-field"
                  required
                />
              </div>
              <div className="mb-5">
                <label htmlFor="nickname" className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted">
                  Nickname
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-2xs font-medium text-text-faint">
                    optional
                  </span>
                </label>
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Captain"
                  maxLength={30}
                  className="input-field"
                />
              </div>

              {shownError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-base leading-relaxed text-warn"
                >
                  {shownError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="btn-primary min-h-[48px] w-full"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    Joining…
                  </>
                ) : (
                  "Enter the sprint room"
                )}
              </button>

              <p className="mt-4 text-center text-sm leading-relaxed text-text-faint">
                Used this name before? You&apos;ll pick up right where you left off.
                {authEnabled && " Add an email later from your profile to lock it to you."}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}





