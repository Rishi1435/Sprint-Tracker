import { describe, expect, it } from "vitest";
import { dayNumberFor, formatDateShort, todayISO } from "@/lib/date";
import { TOTAL_DAYS } from "@/lib/plan";

/** Local-midnight ISO date `offset` days from today, matching `todayISO`'s basis. */
function isoDaysAgo(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

describe("todayISO", () => {
  it("returns a local YYYY-MM-DD date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses the local calendar day, not UTC", () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    expect(todayISO()).toBe(expected);
  });
});

describe("dayNumberFor", () => {
  it("treats a user who hasn't started as being on day 1", () => {
    expect(dayNumberFor(null, TOTAL_DAYS)).toBe(1);
    expect(dayNumberFor(undefined, TOTAL_DAYS)).toBe(1);
  });

  it("counts the start date itself as day 1", () => {
    expect(dayNumberFor(todayISO(), TOTAL_DAYS)).toBe(1);
  });

  it("advances one day per calendar day", () => {
    expect(dayNumberFor(isoDaysAgo(1), TOTAL_DAYS)).toBe(2);
    expect(dayNumberFor(isoDaysAgo(6), TOTAL_DAYS)).toBe(7);
    expect(dayNumberFor(isoDaysAgo(20), TOTAL_DAYS)).toBe(21);
  });

  it("clamps to the last day once the sprint window has passed", () => {
    expect(dayNumberFor(isoDaysAgo(60), TOTAL_DAYS)).toBe(TOTAL_DAYS);
  });

  it("clamps to day 1 for a start date in the future", () => {
    expect(dayNumberFor(isoDaysAgo(-5), TOTAL_DAYS)).toBe(1);
  });
});

describe("formatDateShort", () => {
  it("labels a missing date rather than rendering Invalid Date", () => {
    expect(formatDateShort(null)).toBe("Not started yet");
    expect(formatDateShort(undefined)).toBe("Not started yet");
  });

  it("formats as day + short month", () => {
    // en-IN gives "5 Mar"; assert on the parts so the test survives ICU tweaks.
    const label = formatDateShort("2026-03-05");
    expect(label).toContain("5");
    expect(label).toMatch(/Mar/i);
  });

  it("does not shift the day across timezones", () => {
    expect(formatDateShort("2026-01-01")).toContain("1");
    expect(formatDateShort("2026-01-01")).toMatch(/Jan/i);
  });
});
