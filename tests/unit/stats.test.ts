import { describe, expect, it } from "vitest";
import {
  categoryStats,
  completedDaysCount,
  countCheckedForDay,
  currentStreak,
  isDayComplete,
  overallPercent,
  rowForDay,
  totalCheckedForUser,
} from "@/lib/stats";
import { TOTAL_DAYS, TOTAL_TASKS, buildSprintPlan } from "@/lib/plan";
import { MONDAY_PLAN, START_DATES, completeDays, makeRow } from "./fixtures";

/** Started on a Tuesday, so its Sundays are sprint days 6, 13 and 20. */
const TUE_PLAN = buildSprintPlan(START_DATES[2]);

describe("countCheckedForDay", () => {
  it("is 0 for a missing row", () => {
    expect(countCheckedForDay(MONDAY_PLAN, undefined, 1)).toBe(0);
  });

  it("counts the seven weekday tasks", () => {
    expect(countCheckedForDay(MONDAY_PLAN, makeRow(1, "all"), 1)).toBe(7);
    expect(countCheckedForDay(MONDAY_PLAN, makeRow(1, ["aptitude", "leetcode"]), 1)).toBe(2);
  });

  it("counts eight on a Sunday, GPP included", () => {
    expect(countCheckedForDay(MONDAY_PLAN, makeRow(7, "all"), 7)).toBe(8);
  });

  it("ignores a GPP tick on a weekday, where the task isn't scheduled", () => {
    const row = makeRow(1, ["gpp_project"]);
    expect(countCheckedForDay(MONDAY_PLAN, row, 1)).toBe(0);
  });

  it("falls back to the row's own day number", () => {
    expect(countCheckedForDay(MONDAY_PLAN, makeRow(7, "all"))).toBe(8);
  });

  it("counts the eighth task on the plan's own Sunday, not day 7", () => {
    // A Tuesday start puts the 8-task Sunday on day 6 and a 7-task Monday on day 7.
    const sunday = makeRow(6, "all", null, TUE_PLAN);
    expect(countCheckedForDay(TUE_PLAN, sunday, 6)).toBe(8);
    expect(countCheckedForDay(TUE_PLAN, makeRow(7, "all", null, TUE_PLAN), 7)).toBe(7);
    // The same row read against a Monday-start plan would miss the GPP tick.
    expect(countCheckedForDay(MONDAY_PLAN, sunday, 6)).toBe(7);
  });
});

describe("isDayComplete", () => {
  it("needs all seven weekday tasks", () => {
    expect(isDayComplete(MONDAY_PLAN, makeRow(3, "all"), 3)).toBe(true);
    expect(
      isDayComplete(
        MONDAY_PLAN,
        makeRow(3, ["aptitude", "reasoning", "verbal", "cs_fundamentals", "java_core", "dsa_concept"]),
        3
      )
    ).toBe(false);
  });

  it("needs all eight on a Sunday", () => {
    const withoutGpp = makeRow(7, [
      "aptitude",
      "reasoning",
      "verbal",
      "cs_fundamentals",
      "java_core",
      "dsa_concept",
      "leetcode",
    ]);
    expect(isDayComplete(MONDAY_PLAN, withoutGpp, 7)).toBe(false);
    expect(isDayComplete(MONDAY_PLAN, makeRow(7, "all"), 7)).toBe(true);
  });

  it("holds the GPP task against the plan's real Sunday", () => {
    const sevenTicks = makeRow(6, [
      "aptitude",
      "reasoning",
      "verbal",
      "cs_fundamentals",
      "java_core",
      "dsa_concept",
      "leetcode",
    ]);
    expect(isDayComplete(TUE_PLAN, sevenTicks, 6)).toBe(false);
    expect(isDayComplete(MONDAY_PLAN, sevenTicks, 6)).toBe(true);
  });

  it("is false for a missing row", () => {
    expect(isDayComplete(MONDAY_PLAN, undefined, 1)).toBe(false);
  });
});

describe("totals", () => {
  it("sums checked tasks across days", () => {
    const rows = [makeRow(1, "all"), makeRow(2, ["aptitude"]), makeRow(7, "all")];
    expect(totalCheckedForUser(MONDAY_PLAN, rows)).toBe(7 + 1 + 8);
  });

  it("reports 0% with no rows and 100% with the whole plan done", () => {
    expect(overallPercent(MONDAY_PLAN, [])).toBe(0);
    expect(totalCheckedForUser(MONDAY_PLAN, completeDays(TOTAL_DAYS))).toBe(TOTAL_TASKS);
    expect(overallPercent(MONDAY_PLAN, completeDays(TOTAL_DAYS))).toBe(100);
  });

  it("still reaches 100% from a start weekday that moves the Sundays", () => {
    const rows = completeDays(TOTAL_DAYS, TUE_PLAN);
    expect(totalCheckedForUser(TUE_PLAN, rows)).toBe(TOTAL_TASKS);
    expect(overallPercent(TUE_PLAN, rows)).toBe(100);
  });

  it("rounds the overall percentage", () => {
    // 7 of 150 tasks is 4.67% -> 5%.
    expect(overallPercent(MONDAY_PLAN, [makeRow(1, "all")])).toBe(5);
  });
});

describe("currentStreak", () => {
  it("is 0 when day 1 is unfinished", () => {
    expect(currentStreak(MONDAY_PLAN, [])).toBe(0);
    expect(currentStreak(MONDAY_PLAN, [makeRow(1, ["aptitude"])])).toBe(0);
  });

  it("counts consecutive complete days from day 1", () => {
    expect(currentStreak(MONDAY_PLAN, completeDays(3))).toBe(3);
    expect(currentStreak(MONDAY_PLAN, completeDays(TOTAL_DAYS))).toBe(TOTAL_DAYS);
  });

  it("counts a full sprint from a Tuesday start too", () => {
    expect(currentStreak(TUE_PLAN, completeDays(TOTAL_DAYS, TUE_PLAN))).toBe(TOTAL_DAYS);
  });

  it("breaks at the first gap, ignoring later complete days", () => {
    const rows = [makeRow(1, "all"), makeRow(2, ["aptitude"]), makeRow(3, "all"), makeRow(4, "all")];
    expect(currentStreak(MONDAY_PLAN, rows)).toBe(1);
  });

  it("breaks on a missing row as well as an incomplete one", () => {
    const rows = [makeRow(1, "all"), makeRow(3, "all")];
    expect(currentStreak(MONDAY_PLAN, rows)).toBe(1);
  });
});

describe("completedDaysCount", () => {
  it("counts fully-finished days anywhere in the sprint", () => {
    const rows = [makeRow(1, "all"), makeRow(5, ["aptitude"]), makeRow(14, "all")];
    expect(completedDaysCount(MONDAY_PLAN, rows)).toBe(2);
  });
});

describe("categoryStats", () => {
  it("starts every subject at zero", () => {
    const stats = categoryStats([]);
    expect(Object.values(stats).every((v) => v === 0)).toBe(true);
    expect(Object.keys(stats)).toHaveLength(8);
  });

  it("tallies each subject across days", () => {
    const rows = [makeRow(1, ["aptitude", "leetcode"]), makeRow(2, ["aptitude"]), makeRow(7, "all")];
    const stats = categoryStats(rows);
    expect(stats.aptitude).toBe(3);
    expect(stats.leetcode).toBe(2);
    expect(stats.gpp_project).toBe(1);
    expect(stats.verbal).toBe(1);
  });

  it("caps out at the planned count for a full sprint", () => {
    const stats = categoryStats(completeDays(TOTAL_DAYS));
    expect(stats.aptitude).toBe(TOTAL_DAYS);
    expect(stats.gpp_project).toBe(3);
  });

  it("counts three GPP days from any start weekday", () => {
    const stats = categoryStats(completeDays(TOTAL_DAYS, TUE_PLAN));
    expect(stats.gpp_project).toBe(3);
  });
});

describe("rowForDay", () => {
  it("finds by day number and returns undefined otherwise", () => {
    const rows = [makeRow(1, "all"), makeRow(4, "all")];
    expect(rowForDay(rows, 4)?.day_number).toBe(4);
    expect(rowForDay(rows, 2)).toBeUndefined();
  });
});
