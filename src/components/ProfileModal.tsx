"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRow } from "@/lib/types";
import { updateUserNickname } from "@/lib/db";
import { describeError, friendlyError } from "@/lib/errors";
import { dayNumberFor, formatDateShort } from "@/lib/date";
import { TOTAL_DAYS } from "@/lib/plan";
import { authEnabled, signInWithEmail, signOut } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";
import NotificationOptIn from "./NotificationOptIn";

interface Props {
  user: UserRow;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: UserRow) => void;
}

/**
 * Unmounts entirely while closed, so every field starts fresh on the next open
 * without a reset effect. `key` covers the rare case of the signed-in user
 * changing while the dialog is up.
 */
export default function ProfileModal({ user, isOpen, onClose, onUserUpdated }: Props) {
  if (!isOpen) return null;
  return (
    <ProfileDialog
      key={user.id}
      user={user}
      onClose={onClose}
      onUserUpdated={onUserUpdated}
    />
  );
}

function ProfileDialog({ user, onClose, onUserUpdated }: Omit<Props, "isOpen">) {
  const router = useRouter();
  const { clearSession } = useCurrentUser();
  const [nickname, setNickname] = useState(user.nickname || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "sending" | "sent">("idle");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const currentDay = dayNumberFor(user.start_date, TOTAL_DAYS);
  const displayName = nickname.trim() || user.name;
  const initial = displayName.slice(0, 1).toUpperCase();

  async function handleSaveNickname(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      const updated = await updateUserNickname(user.id, nickname.trim());
      onUserUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(`Failed to update nickname — ${describeError(err)}`);
      setError(`Couldn't update your nickname. ${friendlyError(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLinkState("sending");
    setLinkError(null);
    const res = await signInWithEmail(email, user.id);
    if (res.ok) {
      setLinkState("sent");
    } else {
      setLinkState("idle");
      setLinkError(res.message ?? "Couldn't send the link. Try again.");
    }
  }

  async function handleSignOut() {
    if (authEnabled) await signOut();
    clearSession();
    onClose();
    router.replace("/");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="glass-card relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain p-4 animate-fade-in-up sm:p-6"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-border-soft">
          <h2 className="font-display text-[18px] font-bold text-text">Your Profile</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* User Info Section */}
        <div className="mt-5 flex items-center gap-3.5 sm:gap-4">
          <span
            aria-hidden
            className="grid h-13 w-13 shrink-0 place-items-center rounded-full text-[19px] font-bold text-white shadow-md sm:h-14 sm:w-14 sm:text-[20px]"
            style={{ background: "var(--accent-gradient)" }}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[17px] font-bold text-text sm:text-[18px]">
              {displayName}
            </h3>
            <p className="truncate text-[12.5px] text-text-muted sm:text-[13px]">
              Username: <span className="font-semibold text-text">@{user.name}</span>
            </p>
          </div>
        </div>

        {/* Sprint Stats Badges */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
          <div
            className="rounded-xl border border-border bg-surface p-2.5 text-center sm:p-3"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[11px]">
              Current Progress
            </p>
            <p className="mt-1 text-[17px] font-bold text-text sm:text-[18px]">
              Day {currentDay} <span className="text-[13px] text-text-faint">/ {TOTAL_DAYS}</span>
            </p>
          </div>

          <div
            className="rounded-xl border border-border bg-surface p-2.5 text-center sm:p-3"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-faint sm:text-[11px]">
              Sprint Started
            </p>
            <p className="mt-1 text-[15px] font-bold text-text sm:text-[16px]">
              {formatDateShort(user.start_date)}
            </p>
          </div>
        </div>

        {/* Nickname Editor Form */}
        <form onSubmit={handleSaveNickname} className="mt-5 flex flex-col gap-3">
          <div>
            <label
              htmlFor="edit-nickname"
              className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 text-[12px] font-semibold uppercase tracking-wider text-text-muted"
            >
              <span>Display Nickname</span>
              <span className="text-[11px] font-normal normal-case text-text-faint">
                Shown on Squad leaderboard
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id="edit-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Captain"
                maxLength={30}
                className="input-field flex-1"
              />
              <button
                type="submit"
                disabled={saving || nickname.trim() === (user.nickname || "")}
                className="btn-primary min-h-[44px] shrink-0 px-4 py-2 text-[13px]"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {savedSuccess && (
            <p className="text-[13px] font-medium text-done flex items-center gap-1.5 animate-fade-in">
              <span>✓</span> Nickname updated successfully!
            </p>
          )}

          {error && (
            <p className="text-[13px] text-warn animate-fade-in">{error}</p>
          )}
        </form>

        {/* Account / sign-in */}
        <div className="mt-6 border-t border-border-soft pt-5">
          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-text-muted">
            Account
          </p>

          {user.email ? (
            <div className="flex items-center gap-3 rounded-xl border border-done/25 bg-done-soft px-3.5 py-3">
              <span aria-hidden className="text-[16px]">🔒</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-text">{user.email}</p>
                <p className="text-[11px] text-text-muted">
                  Only this email can tick your boxes.
                </p>
              </div>
            </div>
          ) : authEnabled ? (
            linkState === "sent" ? (
              <div className="rounded-xl border border-accent/25 px-3.5 py-3" style={{ background: "var(--accent-soft)" }}>
                <p className="text-[13px] font-semibold text-text">Check your inbox</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
                  Open the link we sent to <span className="font-semibold">{email}</span> on this
                  device and this profile becomes yours alone.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLinkEmail}>
                <p className="mb-2 text-[12px] leading-relaxed text-text-muted">
                  Right now anyone who types <span className="font-semibold text-text">@{user.name}</span>{" "}
                  can open this profile. Add an email to claim it.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={120}
                    className="input-field flex-1"
                    required
                  />
                  <button
                    type="submit"
                    disabled={linkState === "sending" || !email.trim()}
                    className="btn-primary min-h-[44px] shrink-0 px-4 py-2 text-[13px]"
                  >
                    {linkState === "sending" ? "Sending…" : "Claim profile"}
                  </button>
                </div>
                {linkError && (
                  <p className="mt-2 text-[12px] text-warn animate-fade-in">{linkError}</p>
                )}
              </form>
            )
          ) : (
            <p className="text-[12px] leading-relaxed text-text-muted">
              Email sign-in is turned off for this room, so profiles are name-only.
            </p>
          )}
        </div>

        {/* Daily Reminder Settings */}
        <NotificationOptIn />

        {/* Footer */}
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border-soft pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[44px] rounded-lg border border-warn/30 px-4 text-[13px] font-semibold text-warn transition-colors hover:bg-warn-soft"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-text transition-colors hover:border-accent"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
