"use client";

import { useState } from "react";
import { addReaction } from "@/lib/db";
import { describeError, friendlyError } from "@/lib/errors";
import type { ReactionType } from "@/lib/types";
import Icon from "./Icon";

interface Props {
  fromUserId: string;
  toUserId: string;
  toName: string;
  size?: "sm" | "md";
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "cheer", emoji: "🎉", label: "Cheer" },
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "star", emoji: "⭐", label: "Star" },
];

export default function CheerButton({ fromUserId, toUserId, toName, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<ReactionType | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function send(type: ReactionType) {
    if (sending) return;
    setSending(true);
    setFailed(null);
    try {
      await addReaction(fromUserId, toUserId, type);
      setSent(type);
      setOpen(false);
      setTimeout(() => setSent(null), 1500);
    } catch (err) {
      // describeError, not the raw value: an Error's own fields don't survive
      // the console's serialisation, which is how this arrived as `{}`.
      console.error(`Failed to send reaction — ${describeError(err)}`);
      setFailed(friendlyError(err));
      setOpen(false);
      setTimeout(() => setFailed(null), 4000);
    } finally {
      setSending(false);
    }
  }

  /* Thumb-sized on phones, back to the compact chip once there's a cursor. */
  const pad =
    size === "sm"
      ? "min-h-[40px] px-3 text-xs sm:min-h-0 sm:py-1.5"
      : "min-h-[44px] px-3.5 text-sm sm:min-h-0 sm:py-2";

  return (
    <div className="relative inline-block">
      {/* The four emoji live in the popover, where each one is a distinct choice.
          Putting one on the trigger too just repeated it. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`btn-ghost gap-1.5 rounded-full ${pad} ${
          failed
            ? "border-warn/40 text-warn hover:border-warn/40 hover:bg-warn-soft hover:text-warn"
            : "hover:border-accent hover:text-accent"
        }`}
        title={failed ?? `Cheer for ${toName}`}
        aria-expanded={open}
      >
        {failed ? (
          <Icon name="cloudOff" size={13} />
        ) : sent ? (
          <span aria-hidden>{REACTIONS.find((r) => r.type === sent)?.emoji}</span>
        ) : null}
        <span>{failed ? "Failed" : sent ? "Sent" : "Cheer"}</span>
      </button>

      {/* Absolute so a failure can't reflow the squad row it sits in. */}
      {failed && (
        <p
          role="alert"
          className="absolute right-0 top-full z-40 mt-1 w-max max-w-[15rem] rounded-lg border border-warn/30 bg-warn-soft px-2 py-1 text-xs leading-relaxed text-warn"
        >
          {failed}
        </p>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="panel absolute right-0 z-50 mt-2 flex gap-1 rounded-full p-1"
            onClick={(e) => e.stopPropagation()}
          >
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => send(r.type)}
                disabled={sending}
                className="grid h-11 w-11 place-items-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-surface-raised disabled:opacity-50 sm:h-9 sm:w-9"
                title={r.label}
                aria-label={r.label}
              >
                <span aria-hidden>{r.emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
