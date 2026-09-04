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
    <div className="flex min-h-[calc(100dvh-140px)] flex-col items-center justify-center py-8 sm:py-10">
      {/* Hero section */}
      <div className="mb-8 flex flex-col items-center text-center animate-fade-in-up sm:mb-10">
        {/* Floating badge */}
        <span
          className="badge mb-5 border border-accent/20 text-accent"
          style={{ background: 'var(--accent-soft)' }}
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          {TOTAL_DAYS}-day sprint · {TOTAL_TASKS} tasks
        </span>

        <h1 className="font-display max-w-lg text-[28px] font-bold leading-[1.1] tracking-tight text-text sm:text-[44px] sm:leading-[1.08]">
          Every day checked off,{" "}
          <span style={{ backgroundImage: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            in front of everyone.
          </span>
        </h1>

        <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-text-muted sm:text-[15px]">
          Aptitude, Reasoning, Verbal, CS Fundamentals, Java Core, DSA, LeetCode
          — one plan, tracked daily, visible to your whole squad.
        </p>
      </div>
      {/* Login card */}
      <div
        className="glass-card w-full max-w-sm p-5 sm:p-6 animate-fade-in-up"
        style={{ animationDelay: '0.15s' }}
      >
        {authEnabled && !sent && (
          <div
            role="tablist"
            aria-label="Sign-in method"
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-raised p-1"
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
                className={`min-h-[40px] rounded-lg px-3 text-[13px] font-semibold transition-all duration-200 ${
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
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-accent"
              style={{ background: 'var(--accent-soft)' }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-display text-[17px] font-semibold text-text">Check your inbox</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              We sent a sign-in link to <span className="font-semibold text-text">{email}</span>.
              Open it on this device to enter the sprint room.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                resetError();
              }}
              className="mt-5 min-h-[44px] w-full rounded-xl border border-border bg-surface px-4 text-[13px] font-semibold text-text-muted transition-colors hover:border-accent/30 hover:text-text"
            >
              Use a different email
            </button>
          </div>
        ) : mode === "email" ? (
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-5">
              <label htmlFor="email" className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-text-muted">
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
              <div className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
                {shownError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="btn-primary w-full min-h-[48px]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Sending link…
                </span>
              ) : (
                "Email me a sign-in link →"
              )}
            </button>

            <p className="mt-4 text-center text-[12px] leading-relaxed text-text-faint">
              No password. Your progress is tied to your email, so only you can tick your boxes.
            </p>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit}>
            <div className="mb-5">
              <label htmlFor="username" className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-text-muted">
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
              <label htmlFor="nickname" className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-text-muted">
                Nickname
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-text-faint">
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
              <div className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
                {shownError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn-primary w-full min-h-[48px]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Joining…
                </span>
              ) : (
                "Enter Sprint Room →"
              )}
            </button>

            <p className="mt-4 text-center text-[12px] leading-relaxed text-text-faint">
              Already used this name before? You&apos;ll pick up right where you left off.
              {authEnabled && " Add an email later from your profile to lock it to you."}
            </p>
          </form>
        )}
      </div>
      {/* Features grid */}
      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 animate-fade-in-up sm:mt-12 sm:grid-cols-3 sm:gap-4" style={{ animationDelay: '0.3s' }}>
        {[
          { icon: "📋", label: "Personal Checklist", desc: "7 tasks per day" },
          { icon: "🏆", label: "Squad Board", desc: "See everyone's progress" },
          { icon: "🔥", label: "Streak Tracking", desc: "Stay consistent" },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all duration-200 hover:border-accent/30 sm:flex-col sm:gap-2 sm:p-4 sm:text-center"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <span aria-hidden className="text-2xl leading-none">{f.icon}</span>
            <span className="flex min-w-0 flex-col sm:items-center">
              <span className="text-[12.5px] font-semibold text-text sm:text-[12px]">{f.label}</span>
              <span className="text-[11.5px] text-text-faint sm:text-[11px]">{f.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}





