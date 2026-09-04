"use client";

import { useEffect, useState } from "react";
import {
  getCurrentBlock,
  getNextStudyStart,
  formatMs,
  formatCountdown,
} from "@/lib/schedule";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function StudyTimer() {
  const { user, loading } = useCurrentUser();
  const [block, setBlock] = useState(() => getCurrentBlock());
  const [now, setNow] = useState<Date>(() => new Date());
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    const id = setInterval(() => {
      const d = new Date();
      setNow(d);
      setBlock(getCurrentBlock(d));
    }, 1000);
    return () => clearInterval(id);
  }, [loading, user]);

  // Audio ping at block end (only if not muted and tab visible)
  useEffect(() => {
    if (!block || muted) return;
    if (block.remainingMs > 1500 || block.remainingMs < 500) return;
    try {
      // Safari still only exposes the prefixed constructor.
      const Ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }, [block, muted]);

  if (!user) return null;

  const isStudy = block?.isStudy;
  const upcoming = getNextStudyStart(now);

  // If no current block and nothing left today, hide the widget
  if (!block && !upcoming) return null;

  return (
    <div
      className="floating-widget z-40 max-w-[280px] rounded-2xl border border-border bg-surface/95 shadow-lg backdrop-blur-md transition-all duration-300"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {/* One button for both states — the header is tappable whether a block is
          running or the next one is still hours away. */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-label="Toggle study timer details"
        aria-expanded={expanded}
      >
        {block ? (
          <>
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
              style={{ background: isStudy ? "var(--accent-gradient)" : "var(--warn-soft)" }}
            >
              {isStudy ? "⏱️" : "☕"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-text">
                {isStudy ? "📚 " : "🍽️ "}
                {block.slot.title}
              </p>
              <p className="text-[11px] text-text-faint">
                {block.slot.time} · {formatMs(block.remainingMs)} left
              </p>
            </div>
          </>
        ) : upcoming ? (
          <>
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-raised text-text-muted"
            >
              ⏳
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-text">
                Up next: {upcoming.slot.title}
              </p>
              {/* `formatCountdown`, not `formatMs`: the wait back to the 7:30 PM
                  block can be most of a day, which MM:SS would print as a
                  four-digit minute count. */}
              <p className="truncate text-[11px] text-text-faint">
                {upcoming.slot.time} · in {formatCountdown(upcoming.startsInMs)}
              </p>
            </div>
          </>
        ) : null}
      </button>

      {/* Open in both states: the mute switch used to be reachable only while a
          block was running, which is the minority of the day. */}
      {expanded && (
        <div className="border-t border-border-soft px-4 py-3 animate-fade-in">
          {block && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, ((block.endMin - block.nowMin) / Math.max(1, block.endMin - block.startMin)) * 100))}%`,
                  background: isStudy ? "var(--accent-gradient)" : "var(--warn)",
                }}
              />
            </div>
          )}
          <div
            className={`flex items-center justify-between gap-2 text-[11px] text-text-faint ${
              block ? "mt-2" : ""
            }`}
          >
            <span className="truncate">{(block ?? upcoming)?.slot.duration}</span>
            <button
              onClick={() => setMuted((m) => !m)}
              className="min-h-[32px] shrink-0 rounded-full border border-border px-3 text-[10.5px] font-semibold text-text-muted hover:border-accent"
              aria-pressed={!muted}
            >
              {muted ? "🔇 Unmute" : "🔔 Mute"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
