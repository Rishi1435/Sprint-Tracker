"use client";

import { useState, useEffect } from "react";
import type { UserRow } from "@/lib/types";
import { updateUserNickname } from "@/lib/db";
import { dayNumberFor, formatDateShort } from "@/lib/date";
import { TOTAL_DAYS } from "@/lib/plan";

interface Props {
  user: UserRow;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: UserRow) => void;
}

export default function ProfileModal({ user, isOpen, onClose, onUserUpdated }: Props) {
  const [nickname, setNickname] = useState(user.nickname || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(user.nickname || "");
    setError(null);
    setSavedSuccess(false);
  }, [user, isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      console.error(err);
      setError("Failed to update nickname. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
        className="glass-card relative z-10 w-full max-w-md p-6 animate-fade-in-up"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-border-soft">
          <h2 className="font-display text-[18px] font-bold text-text">Your Profile</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
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
        <div className="mt-5 flex items-center gap-4">
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[20px] font-bold text-white shadow-md"
            style={{ background: "var(--accent-gradient)" }}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[18px] font-bold text-text">
              {displayName}
            </h3>
            <p className="truncate text-[13px] text-text-muted">
              Username: <span className="font-semibold text-text">@{user.name}</span>
            </p>
          </div>
        </div>

        {/* Sprint Stats Badges */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl border border-border bg-surface p-3 text-center"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Current Progress
            </p>
            <p className="mt-1 text-[18px] font-bold text-text">
              Day {currentDay} <span className="text-[13px] text-text-faint">/ {TOTAL_DAYS}</span>
            </p>
          </div>

          <div
            className="rounded-xl border border-border bg-surface p-3 text-center"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Sprint Started
            </p>
            <p className="mt-1 text-[16px] font-bold text-text">
              {formatDateShort(user.start_date)}
            </p>
          </div>
        </div>

        {/* Nickname Editor Form */}
        <form onSubmit={handleSaveNickname} className="mt-5 flex flex-col gap-3">
          <div>
            <label
              htmlFor="edit-nickname"
              className="mb-1.5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wider text-text-muted"
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
                className="btn-primary shrink-0 px-4 py-2 text-[13px]"
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

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border-soft flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text hover:border-accent transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
