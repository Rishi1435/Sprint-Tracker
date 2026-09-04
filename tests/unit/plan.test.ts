import { describe, expect, it } from "vitest";
import {
  SUNDAY_TASK_KEYS,
  SUNDAY_TIMINGS,
  SPRINT_RULES,
  SPRINT_TIMETABLE_SUNDAY,
  SPRINT_TIMETABLE_WEEKDAYS,
  TASK_KEYS,
  TASK_LABELS,
  TOTAL_DAYS,
  TOTAL_TASKS,
  WEEKDAY_NAMES,
  WEEKDAY_TASK_KEYS,
  WEEKDAY_TIMINGS,
  buildSprintPlan,
  sprintPlanForStartWeekday,
  weekdayOfISO,
} from "@/lib/plan";
import { MONDAY_PLAN, START_DATES } from "./fixtures";

/** Which sprint days are Sundays, per start weekday (index 0 = started Sunday). */
const SUNDAY_DAYS_BY_START: number[][] = [
  [1, 8, 15], // started on a Sunday
  [7, 14, 21], // Monday
  [6, 13, 20], // Tuesday
  [5, 12, 19], // Wednesday
  [4, 11, 18], // Thursday
  [3, 10, 17], // Friday
  [2, 9, 16], // Saturday
];

const ALL_STARTS = [0, 1, 2, 3, 4, 5, 6];

describe("plan shape", () => {
  it("is a 21-day sprint numbered 1..21 from any start weekday", () => {
    expect(TOTAL_DAYS).toBe(21);
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      expect(plan.days).toHaveLength(TOTAL_DAYS);
      expect(plan.days.map((d) => d.day)).toEqual(
        Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1)
      );
    }
  });

  it("totals 150 tasks from every start weekday — 18 weekdays x 7 plus 3 Sundays x 8", () => {
    expect(TOTAL_TASKS).toBe(150);
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      const summed = plan.days.reduce((acc, d) => acc + d.taskKeys.length, 0);
      expect(summed, `start weekday ${dow}`).toBe(TOTAL_TASKS);
    }
  });

  it("gives Sundays 8 tasks including the GPP project, weekdays 7 without it", () => {
    for (const dow of ALL_STARTS) {
      for (const day of sprintPlanForStartWeekday(dow).days) {
        if (day.isSunday) {
          expect(day.taskKeys).toEqual(SUNDAY_TASK_KEYS);
          expect(day.taskKeys).toContain("gpp_project");
          expect(day.taskKeys).toHaveLength(8);
          expect(day.timings).toBe(SUNDAY_TIMINGS);
        } else {
          expect(day.taskKeys).toEqual(WEEKDAY_TASK_KEYS);
          expect(day.taskKeys).not.toContain("gpp_project");
          expect(day.taskKeys).toHaveLength(7);
          expect(day.timings).toBe(WEEKDAY_TIMINGS);
        }
      }
    }
  });

  it("assigns each day to week 1, 2 or 3 in seven-day blocks", () => {
    for (const dow of ALL_STARTS) {
      for (const day of sprintPlanForStartWeekday(dow).days) {
        expect(day.week).toBe(Math.ceil(day.day / 7));
      }
    }
  });

  it("gives every task on every day both a description and a timing", () => {
    for (const dow of ALL_STARTS) {
      for (const day of sprintPlanForStartWeekday(dow).days) {
        for (const key of day.taskKeys) {
          expect(day.tasks[key], `start ${dow} day ${day.day} ${key} description`).toBeTruthy();
          expect(day.timings[key], `start ${dow} day ${day.day} ${key} timing`).toBeTruthy();
          expect(day.timings[key]?.time).toMatch(/\d/);
          expect(day.timings[key]?.duration).toMatch(/\d/);
        }
      }
    }
  });

  it("labels and times every task key", () => {
    for (const key of TASK_KEYS) {
      expect(TASK_LABELS[key]).toBeTruthy();
      expect(WEEKDAY_TIMINGS[key]).toBeTruthy();
      expect(SUNDAY_TIMINGS[key]).toBeTruthy();
    }
    expect(TASK_KEYS).toHaveLength(8);
  });
});

describe("calendar alignment", () => {
  it("puts the Sunday schedule on the real Sundays for each start weekday", () => {
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      expect(plan.sundayDays, `start weekday ${dow}`).toEqual(SUNDAY_DAYS_BY_START[dow]);
      for (const day of plan.days) {
        expect(plan.isSunday(day.day)).toBe(SUNDAY_DAYS_BY_START[dow].includes(day.day));
      }
    }
  });

  it("regression: a Tuesday start does not treat day 7 as a Sunday", () => {
    // The reported bug — Sunday's daytime timetable landed on the Monday.
    const plan = sprintPlanForStartWeekday(2);
    expect(plan.getDay(6)?.weekday).toBe("Sunday");
    expect(plan.getDay(6)?.isSunday).toBe(true);
    expect(plan.getDay(7)?.weekday).toBe("Monday");
    expect(plan.getDay(7)?.isSunday).toBe(false);
    expect(plan.getDay(7)?.timings).toBe(WEEKDAY_TIMINGS);
  });

  it("names weekdays by walking the real calendar from day 1", () => {
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      expect(plan.startWeekday).toBe(dow);
      expect(plan.days[0].weekday).toBe(WEEKDAY_NAMES[dow]);
      for (const day of plan.days) {
        expect(day.weekday).toBe(WEEKDAY_NAMES[(dow + day.day - 1) % 7]);
        expect(day.isSunday).toBe(day.weekday === "Sunday");
      }
    }
  });

  it("lands exactly one Sunday in each of the three weeks", () => {
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      for (const week of [1, 2, 3]) {
        const sundays = plan.days.filter((d) => d.week === week && d.isSunday);
        expect(sundays, `start ${dow} week ${week}`).toHaveLength(1);
      }
    }
  });

  it("moves the review day onto the Sunday without changing its content", () => {
    // Every plan reuses the same syllabus; only where the review day sits moves.
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      for (const week of [1, 2, 3] as const) {
        const review = plan.days.find((d) => d.week === week && d.isSunday);
        const mondayReview = MONDAY_PLAN.days.find((d) => d.week === week && d.isSunday);
        expect(review?.tasks).toEqual(mondayReview?.tasks);
      }
    }
  });

  it("hands the six weekday templates to the week's non-Sundays in order", () => {
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      for (const week of [1, 2, 3] as const) {
        const weekdayTasks = (p: typeof plan) =>
          p.days.filter((d) => d.week === week && !d.isSunday).map((d) => d.tasks);
        expect(weekdayTasks(plan)).toEqual(weekdayTasks(MONDAY_PLAN));
      }
    }
  });

  it("uses each of the 21 syllabus entries exactly once", () => {
    for (const dow of ALL_STARTS) {
      const seen = new Set(sprintPlanForStartWeekday(dow).days.map((d) => JSON.stringify(d.tasks)));
      expect(seen.size, `start weekday ${dow}`).toBe(TOTAL_DAYS);
    }
  });

  it("counts planned days per subject from the plan, not a hardcoded 21", () => {
    for (const dow of ALL_STARTS) {
      const plan = sprintPlanForStartWeekday(dow);
      for (const key of TASK_KEYS) {
        expect(plan.plannedFor(key)).toBe(key === "gpp_project" ? 3 : TOTAL_DAYS);
      }
    }
  });
});

describe("weekdayOfISO", () => {
  it("reads the weekday off a local YYYY-MM-DD date", () => {
    START_DATES.forEach((iso, dow) => {
      expect(weekdayOfISO(iso), iso).toBe(dow);
    });
  });
});

describe("buildSprintPlan", () => {
  it("aligns to the user's start date", () => {
    START_DATES.forEach((iso, dow) => {
      const plan = buildSprintPlan(iso);
      expect(plan.startWeekday).toBe(dow);
      expect(plan.sundayDays).toEqual(SUNDAY_DAYS_BY_START[dow]);
    });
  });

  it("falls back to today's weekday before the sprint has started", () => {
    // The first tick records `start_date = today`, so this preview is honest.
    const today = new Date().getDay();
    expect(buildSprintPlan(undefined).startWeekday).toBe(today);
    expect(buildSprintPlan(null).startWeekday).toBe(today);
  });

  it("reuses one plan per start weekday", () => {
    expect(buildSprintPlan("2026-01-05")).toBe(buildSprintPlan("2026-01-12"));
    expect(sprintPlanForStartWeekday(1)).toBe(MONDAY_PLAN);
  });

  it("normalises out-of-range weekdays", () => {
    expect(sprintPlanForStartWeekday(7)).toBe(sprintPlanForStartWeekday(0));
    expect(sprintPlanForStartWeekday(-1)).toBe(sprintPlanForStartWeekday(6));
  });
});

describe("plan lookups", () => {
  it("returns the matching day", () => {
    expect(MONDAY_PLAN.getDay(1)?.day).toBe(1);
    expect(MONDAY_PLAN.getDay(21)?.day).toBe(21);
    expect(MONDAY_PLAN.getDay(7)?.isSunday).toBe(true);
  });

  it("returns undefined outside the sprint", () => {
    expect(MONDAY_PLAN.getDay(0)).toBeUndefined();
    expect(MONDAY_PLAN.getDay(22)).toBeUndefined();
  });

  it("falls back to the weekday task list off the end of the sprint", () => {
    expect(MONDAY_PLAN.isSunday(99)).toBe(false);
    expect(MONDAY_PLAN.taskKeysFor(99)).toEqual(WEEKDAY_TASK_KEYS);
    expect(MONDAY_PLAN.taskKeysFor(7)).toEqual(SUNDAY_TASK_KEYS);
  });
});

describe("timetables", () => {
  it("provides both a weekday and a Sunday timetable", () => {
    expect(SPRINT_TIMETABLE_WEEKDAYS.length).toBeGreaterThan(0);
    expect(SPRINT_TIMETABLE_SUNDAY.length).toBeGreaterThan(0);
  });

  it("uses only known slot types", () => {
    for (const slot of [...SPRINT_TIMETABLE_WEEKDAYS, ...SPRINT_TIMETABLE_SUNDAY]) {
      expect(["study", "break", "rest"]).toContain(slot.type);
      expect(slot.time).toBeTruthy();
      expect(slot.title).toBeTruthy();
    }
  });

  it("ships the five sprint rules", () => {
    expect(SPRINT_RULES.length).toBeGreaterThanOrEqual(5);
  });
});
