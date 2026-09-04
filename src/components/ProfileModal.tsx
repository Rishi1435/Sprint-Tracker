"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRow } from "@/lib/types";
import { updateUserNickname } from "@/lib/db";
import { describeError, friendlyError } from "@/lib/errors";
import { dayNumberFor, formatDateShort } from "@/lib/date";
import { TOTAL_DAYS } from "@/lib/plan";
import { authEnabled, signInWithEmail, signOut } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";
import NotificationOptIn from "./NotificationOptIn";
import Icon from "./Icon";
import Modal from "./Modal";

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
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      lead={
        /* Same disc as the header and the leaderboard, one size up. */
        <span aria-hidden className="avatar h-10 w-10 font-display text-lg">
          {initial}
        </span>
      }
      title={displayName}
      subtitle={`@${user.name}`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-ghost min-h-[44px] border-warn/30 text-warn hover:border-warn/40 hover:bg-warn-soft"
          >
            Sign out
          </button>
          <button type="button" onClick={onClose} className="btn-primary min-h-[44px]">
            Done
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Where this person is in the sprint — the one thing a profile is for
            that the leaderboard doesn't already say. Inset surfaces, because the
            dialog itself is already sitting on --surface. */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border-soft bg-surface-raised p-3">
            <div className="flex items-center gap-1.5 text-text-faint">
              <Icon name="target" size={13} />
              <span className="truncate text-xs font-semibold">Sprint day</span>
            </div>
            <p className="mt-1.5 flex items-baseline gap-1">
              <span className="num font-display text-xl font-semibold leading-none text-text">
                {currentDay}
              </span>
              <span className="num text-sm font-medium text-text-faint">of {TOTAL_DAYS}</span>
            </p>
          </div>

          <div className="rounded-xl border border-border-soft bg-surface-raised p-3">
            <div className="flex items-center gap-1.5 text-text-faint">
              <Icon name="calendar" size={13} />
              <span className="truncate text-xs font-semibold">Started</span>
            </div>
            <p className="num mt-1.5 font-display text-lg font-semibold leading-none text-text">
              {formatDateShort(user.start_date)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveNickname}>
          <label
            htmlFor="edit-nickname"
            className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
          >
            <span className="text-sm font-semibold text-text-muted">Nickname</span>
            <span className="text-2xs font-medium text-text-faint">
              Shown on the squad board
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
              className="btn-primary min-h-[44px] shrink-0"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {savedSuccess && (
            <p className="animate-fade-in mt-2 flex items-center gap-1.5 text-sm font-semibold text-done">
              <Icon name="check" size={14} strokeWidth={2.6} />
              Nickname saved.
            </p>
          )}

          {error && (
            <p role="alert" className="animate-fade-in mt-2 text-sm text-warn">
              {error}
            </p>
          )}
        </form>

        <hr className="rule" />

        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-muted">Account</h3>

          {user.email ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-done/25 bg-done-soft px-3.5 py-3">
              <Icon name="lock" size={15} className="shrink-0 text-done" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-text">{user.email}</p>
                <p className="text-xs text-text-muted">Only this email can tick your boxes.</p>
              </div>
            </div>
          ) : authEnabled ? (
            linkState === "sent" ? (
              <div className="rounded-xl border border-accent/25 bg-accent-soft px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-base font-semibold text-text">
                  <Icon name="mail" size={14} className="text-accent" />
                  Check your inbox
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Open the link we sent to <span className="font-semibold text-text">{email}</span>{" "}
                  on this device and this profile becomes yours alone.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLinkEmail}>
                <p className="mb-2 text-sm leading-relaxed text-text-muted">
                  Right now anyone who types{" "}
                  <span className="font-semibold text-text">@{user.name}</span> can open this
                  profile. Add an email to claim it.
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
                    className="btn-primary min-h-[44px] shrink-0"
                  >
                    {linkState === "sending" ? "Sending…" : "Claim profile"}
                  </button>
                </div>
                {linkError && (
                  <p role="alert" className="animate-fade-in mt-2 text-sm text-warn">
                    {linkError}
                  </p>
                )}
              </form>
            )
          ) : (
            <p className="text-sm leading-relaxed text-text-muted">
              Email sign-in is turned off for this room, so profiles are name-only.
            </p>
          )}
        </div>

        <hr className="rule" />

        <NotificationOptIn />
      </div>
    </Modal>
  );
}
