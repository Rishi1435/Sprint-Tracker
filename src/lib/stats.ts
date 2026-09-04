import type { ProgressRow } from "./types";
import { TASK_KEYS, TOTAL_DAYS, TOTAL_TASKS, type SprintPlan } from "./plan";

/**
 * Everything here needs the user's own `SprintPlan`, because whether a day has
 * seven tasks or eight depends on which calendar weekday it lands on — and that
 * differs between squad members who started on different days.
 */
export function countCheckedForDay(
  plan: SprintPlan,
  row: ProgressRow | undefined,
  dayNumber?: number
): number {
  if (!row) return 0;
  const keys = plan.taskKeysFor(dayNumber ?? row.day_number);
  return keys.reduce((acc, k) => acc + (row[k] ? 1 : 0), 0);
}

export function isDayComplete(
  plan: SprintPlan,
  row: ProgressRow | undefined,
  dayNumber: number
): boolean {
  if (!row) return false;
  return countCheckedForDay(plan, row, dayNumber) >= plan.taskKeysFor(dayNumber).length;
}

export function totalCheckedForUser(plan: SprintPlan, rows: ProgressRow[]): number {
  return rows.reduce((acc, r) => acc + countCheckedForDay(plan, r, r.day_number), 0);
}

export function overallPercent(plan: SprintPlan, rows: ProgressRow[]): number {
  if (TOTAL_TASKS === 0) return 0;
  return Math.round((totalCheckedForUser(plan, rows) / TOTAL_TASKS) * 100);
}

/** Consecutive fully-completed days starting from day 1. Breaks at the first incomplete day. */
export function currentStreak(plan: SprintPlan, rows: ProgressRow[]): number {
  const byDay = new Map(rows.map((r) => [r.day_number, r]));
  let streak = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const row = byDay.get(d);
    if (row && isDayComplete(plan, row, d)) {
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

export function completedDaysCount(plan: SprintPlan, rows: ProgressRow[]): number {
  return rows.filter((r) => isDayComplete(plan, r, r.day_number)).length;
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
