import { describe, expect, it } from "vitest";
import { evaluateAchievements } from "@/lib/achievements";
import { TOTAL_DAYS, buildSprintPlan } from "@/lib/plan";
import { MONDAY_PLAN, START_DATES, completeDays, makeRow } from "./fixtures";
import type { ProgressRow } from "@/lib/types";
import type { SprintPlan } from "@/lib/plan";

function earnedIds(rows: ProgressRow[] = [], plan: SprintPlan = MONDAY_PLAN) {
  return evaluateAchievements(plan, rows)
    .filter((a) => a.earned)
    .map((a) => a.id);
}

describe("evaluateAchievements", () => {
  it("returns a stable set of badges with titles, descriptions and icons", () => {
    const all = evaluateAchievements(MONDAY_PLAN, []);
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const a of all) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
    }
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
  });

  it("earns nothing on an empty sprint", () => {
    expect(earnedIds([])).toEqual([]);
  });

  it("earns First Step on a single tick", () => {
    expect(earnedIds([makeRow(1, ["aptitude"])])).toContain("first-task");
  });

  it("earns Perfect Day only once a whole day is done", () => {
    expect(earnedIds([makeRow(1, ["aptitude", "reasoning"])])).not.toContain("perfect-day");
    expect(earnedIds([makeRow(1, "all")])).toContain("perfect-day");
  });

  it("unlocks streak badges at 3, 7 and 14 days", () => {
    expect(earnedIds(completeDays(2))).not.toContain("streak-3");
    expect(earnedIds(completeDays(3))).toContain("streak-3");
    expect(earnedIds(completeDays(6))).not.toContain("streak-7");
    expect(earnedIds(completeDays(7))).toContain("streak-7");
    expect(earnedIds(completeDays(14))).toContain("streak-14");
  });

  it("unlocks the week milestones from finished-day counts", () => {
    expect(earnedIds(completeDays(7))).toContain("week-1");
    expect(earnedIds(completeDays(14))).toContain("week-2");
    expect(earnedIds(completeDays(20))).not.toContain("finish");
    expect(earnedIds(completeDays(TOTAL_DAYS))).toContain("finish");
  });

  it("earns every badge on a fully-completed sprint", () => {
    const all = evaluateAchievements(MONDAY_PLAN, completeDays(TOTAL_DAYS));
    expect(all.every((a) => a.earned)).toBe(true);
  });

  it("earns every badge from any start weekday", () => {
    START_DATES.forEach((iso) => {
      const plan = buildSprintPlan(iso);
      const all = evaluateAchievements(plan, completeDays(TOTAL_DAYS, plan));
      expect(all.every((a) => a.earned), iso).toBe(true);
    });
  });

  it("reads Perfect Day off the real Sunday, not day 7", () => {
    // A Tuesday start makes day 6 the 8-task day; seven ticks there isn't a
    // perfect day, and the GPP tick on day 7 doesn't make one either.
    const tuePlan = buildSprintPlan(START_DATES[2]);
    const sevenOnSunday = makeRow(6, [
      "aptitude",
      "reasoning",
      "verbal",
      "cs_fundamentals",
      "java_core",
      "dsa_concept",
      "leetcode",
    ]);
    expect(earnedIds([sevenOnSunday], tuePlan)).not.toContain("perfect-day");
    expect(earnedIds([makeRow(6, "all", null, tuePlan)], tuePlan)).toContain("perfect-day");
  });

  it("earns Subject Master once three subjects are fully cleared", () => {
    // Aptitude, reasoning and verbal on all 21 days; nothing else.
    const rows = Array.from({ length: TOTAL_DAYS }, (_, i) =>
      makeRow(i + 1, ["aptitude", "reasoning", "verbal"])
    );
    expect(earnedIds(rows)).toContain("subject-master");
    expect(earnedIds(rows)).not.toContain("all-subjects");
  });
});
