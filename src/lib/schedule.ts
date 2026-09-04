import { SPRINT_TIMETABLE_WEEKDAYS, SPRINT_TIMETABLE_SUNDAY } from "./plan";
import type { TimetableSlot } from "./plan";

/** Alias kept for readability at call sites; the shape lives in plan.ts. */
export type ScheduleSlot = TimetableSlot;

export interface CurrentBlock {
  slot: ScheduleSlot;
  startMin: number; // minutes from local midnight
  endMin: number;
  nowMin: number;
  remainingMs: number;
  isStudy: boolean;
}

export interface UpcomingBlock {
  slot: ScheduleSlot;
  startMin: number; // minutes from local midnight
  startsInMs: number;
}

/** Parse a "7:30 – 7:55 PM" or "9:00 – 10:00 AM" range into [startMin, endMin] local-time minutes. */
export function parseRange(range: string): [number, number] | null {
  // Match patterns like "6:00 – 7:30 PM" or "12:00 AM" (single endpoint)
  const m = range.match(/(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  const [, h1, m1, h2, m2, mer] = m;
  const toMin = (h: string, min: string, suffix?: string) => {
    let hh = parseInt(h, 10);
    const mm = parseInt(min || "0", 10);
    if (suffix) {
      const s = suffix.toUpperCase();
      if (s === "PM" && hh !== 12) hh += 12;
      if (s === "AM" && hh === 12) hh = 0;
    }
    return hh * 60 + mm;
  };
  return [toMin(h1, m1, mer), toMin(h2, m2, mer)];
}

/** Parse a single endpoint like "12:00 AM" or "7:30 PM". */
function parseSingle(time: string): number | null {
  const m = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2] || "0", 10);
  if (m[3]) {
    const s = m[3].toUpperCase();
    if (s === "PM" && hh !== 12) hh += 12;
    if (s === "AM" && hh === 12) hh = 0;
  }
  return hh * 60 + mm;
}

function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/** Returns the current block for a given Date, or null if outside the schedule. */
export function getCurrentBlock(date: Date = new Date()): CurrentBlock | null {
  const isSunday = date.getDay() === 0;
  const timetable: ScheduleSlot[] = isSunday ? SPRINT_TIMETABLE_SUNDAY : SPRINT_TIMETABLE_WEEKDAYS;
  const nowMin = nowMinutes(date);

  for (const slot of timetable) {
    // Special: "12:00 AM" sleep marker is a single time
    if (/^\d{1,2}(?::\d{2})?\s*(AM|PM)$/i.test(slot.time.trim()) && !slot.time.includes("–") && !slot.time.includes("-")) {
      const startMin = parseSingle(slot.time);
      if (startMin == null) continue;
      // For single-point "Sleep" type, mark as not active
      if (slot.type === "rest" && slot.title.toLowerCase().includes("sleep")) continue;
    }
    const range = parseRange(slot.time);
    if (!range) continue;
    const [startMin, endMin] = range;
    if (nowMin >= startMin && nowMin < endMin) {
      const remainingMs = Math.max(0, (endMin - nowMin) * 60_000);
      return {
        slot,
        startMin,
        endMin,
        nowMin,
        remainingMs,
        isStudy: slot.type === "study",
      };
    }
  }
  return null;
}

/** Find the next study block (used to display "Next: …" in the timer). */
export function getNextStudyBlock(date: Date = new Date()): ScheduleSlot | null {
  const isSunday = date.getDay() === 0;
  const timetable: ScheduleSlot[] = isSunday ? SPRINT_TIMETABLE_SUNDAY : SPRINT_TIMETABLE_WEEKDAYS;
  const nowMin = nowMinutes(date);
  for (const slot of timetable) {
    if (slot.type !== "study") continue;
    const range = parseRange(slot.time);
    if (!range) continue;
    if (range[0] > nowMin) return slot;
  }
  return null;
}

/**
 * The next study block plus how long until it starts, so a widget waiting on it
 * can count down instead of showing a title that never moves. The weekday
 * timetable is gapless from 6 PM to midnight, so this is what's on screen for
 * most of the day.
 */
export function getNextStudyStart(date: Date = new Date()): UpcomingBlock | null {
  const slot = getNextStudyBlock(date);
  if (!slot) return null;
  const range = parseRange(slot.time);
  if (!range) return null;
  return {
    slot,
    startMin: range[0],
    startsInMs: Math.max(0, (range[0] - nowMinutes(date)) * 60_000),
  };
}

/** Format ms as MM:SS. */
export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Like `formatMs`, but for waits that can run most of a day — `MM:SS` under an
 * hour and `H:MM:SS` past it. Seconds are always shown so the countdown is
 * visibly alive even when the block is hours off.
 */
export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
