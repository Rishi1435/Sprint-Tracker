import { buildSprintPlan, type SprintPlan, type TaskKey } from "@/lib/plan";
import type { ProgressRow, UserRow } from "@/lib/types";

/**
 * 2026-01-05 is a Monday, so this user's Sundays are sprint days 7, 14 and 21 —
 * the shape the app used to hardcode, which makes it the least surprising
 * default for tests that don't care about the start weekday.
 */
export const TEST_USER: UserRow = {
  id: "user-1",
  name: "Rishi",
  nickname: "Rish",
  email: null,
  auth_user_id: null,
  start_date: "2026-01-05",
  created_at: "2026-01-05T00:00:00.000Z",
};

export const MONDAY_PLAN: SprintPlan = buildSprintPlan(TEST_USER.start_date);

/**
 * One start date per weekday, so a test can sweep all seven alignments.
 * Indexed the same way `Date#getDay` is: `START_DATES[0]` is a Sunday.
 */
export const START_DATES = [
  "2026-01-04", // Sunday
  "2026-01-05", // Monday
  "2026-01-06", // Tuesday
  "2026-01-07", // Wednesday
  "2026-01-08", // Thursday
  "2026-01-09", // Friday
  "2026-01-10", // Saturday
] as const;

/** A `progress` row with the given keys ticked; `"all"` ticks that day's plan. */
export function makeRow(
  day: number,
  checked: TaskKey[] | "all" | "none" = "none",
  notes?: string | null,
  plan: SprintPlan = MONDAY_PLAN
): ProgressRow {
  const dayPlan = plan.getDay(day);
  if (!dayPlan) throw new Error(`No plan for day ${day}`);
  const keys: TaskKey[] = checked === "all" ? dayPlan.taskKeys : checked === "none" ? [] : checked;
  const has = (k: TaskKey) => keys.includes(k);
  return {
    id: `row-${day}`,
    user_id: TEST_USER.id,
    day_number: day,
    aptitude: has("aptitude"),
    reasoning: has("reasoning"),
    verbal: has("verbal"),
    cs_fundamentals: has("cs_fundamentals"),
    java_core: has("java_core"),
    dsa_concept: has("dsa_concept"),
    leetcode: has("leetcode"),
    gpp_project: has("gpp_project"),
    notes: notes ?? null,
    updated_at: "2026-01-05T12:00:00.000Z",
  };
}

/** Days 1..n fully ticked, against `plan`'s own mix of 7- and 8-task days. */
export function completeDays(n: number, plan: SprintPlan = MONDAY_PLAN): ProgressRow[] {
  return Array.from({ length: n }, (_, i) => makeRow(i + 1, "all", null, plan));
}
