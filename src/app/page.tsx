"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getOrCreateUser } from "@/lib/db";
import { supabaseConfigured } from "@/lib/supabaseClient";
import { TOTAL_DAYS, TOTAL_TASKS } from "@/lib/plan";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, setSession } = useCurrentUser();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
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
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center py-10">
      {/* Hero section */}
      <div className="mb-10 flex flex-col items-center text-center animate-fade-in-up">
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

        <h1 className="font-display max-w-lg text-[36px] font-bold leading-[1.08] tracking-tight text-text sm:text-[44px]">
          Every day checked off,{" "}
          <span style={{ backgroundImage: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            in front of everyone.
          </span>
        </h1>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-muted">
          Aptitude, Reasoning, Verbal, CS Fundamentals, Java Core, DSA, LeetCode
          — one plan, tracked daily, visible to your whole squad.
        </p>
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit}
        className="glass-card w-full max-w-sm p-6 animate-fade-in-up"
        style={{ animationDelay: '0.15s' }}
      >
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

        {error && (
          <div className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="btn-primary w-full"
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

        <p className="mt-4 text-center text-[12px] text-text-faint">
          Already used this name before? You&apos;ll pick up right where you left off.
        </p>
      </form>

      {/* Features grid */}
      <div className="mt-12 grid w-full max-w-lg grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {[
          { icon: "📋", label: "Personal Checklist", desc: "7 tasks per day" },
          { icon: "🏆", label: "Squad Board", desc: "See everyone's progress" },
          { icon: "🔥", label: "Streak Tracking", desc: "Stay consistent" },
        ].map((f) => (
          <div
            key={f.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition-all duration-200 hover:border-accent/30"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <span className="text-2xl">{f.icon}</span>
            <span className="text-[12px] font-semibold text-text">{f.label}</span>
            <span className="text-[11px] text-text-faint">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
