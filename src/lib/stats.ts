import type { ProgressRow } from "./types";
import { TASK_KEYS, WEEKDAY_TASK_KEYS, SUNDAY_TASK_KEYS, TOTAL_DAYS, TOTAL_TASKS, TaskKey } from "./plan";

export function countCheckedForDay(row: ProgressRow | undefined, dayNumber?: number): number {
  if (!row) return 0;
  const day = dayNumber ?? row.day_number;
  const keys = day && day % 7 === 0 ? SUNDAY_TASK_KEYS : WEEKDAY_TASK_KEYS;
  return keys.reduce((acc, k) => acc + (row[k] ? 1 : 0), 0);
}

export function isDayComplete(row: ProgressRow | undefined, dayNumber: number): boolean {
  if (!row) return false;
  const requiredCount = dayNumber % 7 === 0 ? 8 : 7;
  return countCheckedForDay(row, dayNumber) >= requiredCount;
}

export function totalCheckedForUser(rows: ProgressRow[]): number {
  return rows.reduce((acc, r) => acc + countCheckedForDay(r, r.day_number), 0);
}

export function overallPercent(rows: ProgressRow[]): number {
  if (TOTAL_TASKS === 0) return 0;
  return Math.round((totalCheckedForUser(rows) / TOTAL_TASKS) * 100);
}

/** Consecutive fully-completed days starting from day 1. Breaks at the first incomplete day. */
export function currentStreak(rows: ProgressRow[]): number {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));
  let streak = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const row = byDay.get(d);
    if (row && isDayComplete(row, d)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function rowForDay(rows: ProgressRow[], day: number): ProgressRow | undefined {
  return rows.find((r) => r.day_number === day);
}

export function completedDaysCount(rows: ProgressRow[]): number {
  return rows.filter((r) => isDayComplete(r, r.day_number)).length;
}

export function categoryStats(rows: ProgressRow[]): Record<string, number> {
  const stats: Record<string, number> = {
    aptitude: 0,
    reasoning: 0,
    verbal: 0,
    cs_fundamentals: 0,
    java_core: 0,
    dsa_concept: 0,
    leetcode: 0,
    gpp_project: 0,
  };
  for (const r of rows) {
    for (const key of TASK_KEYS) {
      if (r[key]) stats[key] = (stats[key] || 0) + 1;
    }
  }
  return stats;
}
