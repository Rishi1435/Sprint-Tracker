"use client";

import { useEffect, useState } from "react";
import {
  getCurrentBlock,
  getNextStudyStart,
  formatMs,
  formatCountdown,
} from "@/lib/schedule";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Icon from "./Icon";

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
    <div className="floating-widget glass-card z-40 max-w-[280px] overflow-hidden">
      {/* One button for both states — the header is tappable whether a block is
          running or the next one is still hours away. */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-label="Study timer details"
        aria-expanded={expanded}
      >
        {block ? (
          <>
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
              style={
                isStudy
                  ? { background: "var(--accent)", color: "var(--on-fill)" }
                  : { background: "var(--warn-soft)", color: "var(--warn)" }
              }
            >
              <Icon name={isStudy ? "clock" : "coffee"} size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text">
                {block.slot.title}
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-text-faint">
                <span className="num shrink-0 font-semibold text-text-muted">
                  {formatMs(block.remainingMs)} left
                </span>
                <span aria-hidden className="h-2.5 w-px shrink-0 bg-border" />
                <span className="num truncate">{block.slot.time}</span>
              </span>
            </span>
          </>
        ) : upcoming ? (
          <>
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-raised text-text-muted"
            >
              <Icon name="clock" size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text">
                Up next: {upcoming.slot.title}
              </span>
              {/* `formatCountdown`, not `formatMs`: the wait back to the 7:30 PM
                  block can be most of a day, which MM:SS would print as a
                  four-digit minute count. */}
              <span className="mt-0.5 flex items-center gap-2 text-xs text-text-faint">
                <span className="num shrink-0 font-semibold text-text-muted">
                  in {formatCountdown(upcoming.startsInMs)}
                </span>
                <span aria-hidden className="h-2.5 w-px shrink-0 bg-border" />
                <span className="num truncate">{upcoming.slot.time}</span>
              </span>
            </span>
          </>
        ) : null}
      </button>

      {/* Open in both states: the mute switch used to be reachable only while a
          block was running, which is the minority of the day. */}
      {expanded && (
        <div className="animate-fade-in border-t border-border-soft px-4 py-3">
          {block && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-1.5 rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, ((block.endMin - block.nowMin) / Math.max(1, block.endMin - block.startMin)) * 100))}%`,
                  background: isStudy ? "var(--accent-gradient)" : "var(--warn)",
                }}
              />
            </div>
          )}
          <div
            className={`flex items-center justify-between gap-2 text-xs text-text-faint ${
              block ? "mt-2.5" : ""
            }`}
          >
            <span className="truncate">{(block ?? upcoming)?.slot.duration}</span>
            <button
              onClick={() => setMuted((m) => !m)}
              className="flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-text"
              aria-pressed={!muted}
            >
              <Icon name={muted ? "bellOff" : "bell"} size={12} />
              {muted ? "Chime at the end" : "Silence the chime"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
