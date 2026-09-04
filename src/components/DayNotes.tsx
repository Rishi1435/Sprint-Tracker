"use client";

import { useEffect, useRef, useState } from "react";
import { setDayNotes } from "@/lib/db";
import { describeError, friendlyError } from "@/lib/errors";
import Icon from "./Icon";

interface Props {
  userId: string;
  day: number;
  initialValue: string;
  isFuture: boolean;
}

export default function DayNotes({ userId, day, initialValue, isFuture }: Props) {
  const [open, setOpen] = useState(Boolean(initialValue));
  const [value, setValue] = useState(initialValue || "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adjust state during render when the row changes underneath us (realtime),
  // which is React's recommended alternative to a syncing effect.
  const [syncedFrom, setSyncedFrom] = useState(initialValue);
  if (initialValue !== syncedFrom) {
    setSyncedFrom(initialValue);
    setValue(initialValue || "");
  }

  // Auto-save with debounce
  useEffect(() => {
    if (isFuture) return;
    if (value === (initialValue || "")) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await setDayNotes(userId, day, value);
        setSavedAt(new Date());
        setFailed(null);
      } catch (err) {
        // A thrown Error loses its own fields on the way to the console, so the
        // description is built here rather than handing the object over.
        console.error(`Failed to save notes — ${describeError(err)}`);
        setFailed(friendlyError(err));
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, initialValue, userId, day, isFuture]);

  if (isFuture) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/50 p-4 text-sm text-text-faint">
        <Icon name="lock" size={14} />
        <span>Notes open up when the day does.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-border bg-surface-raised/40 px-3.5 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-accent/40 hover:text-text"
      >
        <Icon name="note" size={14} />
        <span>Add a note for day {day}</span>
      </button>
    );
  }

  return (
    <div className="card mt-4 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
          <Icon name="note" size={13} />
          Day {day} notes
        </span>
        <span
          className={`text-xs ${failed ? "font-semibold text-warn" : "text-text-faint"}`}
          role={failed ? "alert" : undefined}
        >
          {failed
            ? `Not saved — ${failed}`
            : saving
              ? "Saving…"
              : savedAt
                ? `Saved ${formatRelative(savedAt)}`
                : "Saves as you type"}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What landed? What tripped you up? What deserves another pass on Sunday?"
        rows={3}
        maxLength={1000}
        className="input-field w-full resize-y"
      />
    </div>
  );
}

function formatRelative(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}
