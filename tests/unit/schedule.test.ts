import { describe, expect, it } from "vitest";
import { formatMs, getCurrentBlock, getNextStudyBlock, parseRange } from "@/lib/schedule";

/** A local Date on a known weekday (2026-01-05 is a Monday). */
function monday(hour: number, minute = 0): Date {
  return new Date(2026, 0, 5, hour, minute, 0);
}

/** 2026-01-04 is a Sunday. */
function sunday(hour: number, minute = 0): Date {
  return new Date(2026, 0, 4, hour, minute, 0);
}

describe("parseRange", () => {
  it("parses a PM range, applying the meridiem to both endpoints", () => {
    expect(parseRange("7:30 – 7:55 PM")).toEqual([19 * 60 + 30, 19 * 60 + 55]);
  });

  it("parses an AM range", () => {
    expect(parseRange("9:00 – 10:00 AM")).toEqual([9 * 60, 10 * 60]);
  });

  it("handles a hyphen as well as an en dash", () => {
    expect(parseRange("7:30 - 7:55 PM")).toEqual([19 * 60 + 30, 19 * 60 + 55]);
  });

  it("maps 12 PM to noon and 12 AM to midnight", () => {
    expect(parseRange("12:00 – 1:00 PM")).toEqual([12 * 60, 13 * 60]);
    expect(parseRange("12:00 – 1:00 AM")).toEqual([0, 60]);
  });

  it("returns null for text with no time in it", () => {
    expect(parseRange("Rest of the evening")).toBeNull();
  });
});

describe("getCurrentBlock", () => {
  it("finds the weekday block covering the given moment", () => {
    const block = getCurrentBlock(monday(19, 40));
    expect(block).not.toBeNull();
    expect(block?.startMin).toBeLessThanOrEqual(19 * 60 + 40);
    expect(block?.endMin).toBeGreaterThan(19 * 60 + 40);
  });

  it("reports remaining time inside the block", () => {
    const block = getCurrentBlock(monday(19, 40));
    expect(block?.remainingMs).toBeGreaterThan(0);
    expect(block!.remainingMs).toBeLessThanOrEqual((block!.endMin - block!.startMin) * 60_000);
  });

  it("flags study blocks", () => {
    const block = getCurrentBlock(monday(19, 40));
    expect(block?.isStudy).toBe(true);
  });

  it("uses the Sunday timetable on Sundays", () => {
    // 9:30 AM is a study slot on Sunday but outside the weekday evening plan.
    expect(getCurrentBlock(sunday(9, 30))?.isStudy).toBe(true);
    expect(getCurrentBlock(monday(9, 30))).toBeNull();
  });

  it("returns null outside the schedule", () => {
    expect(getCurrentBlock(monday(4, 0))).toBeNull();
  });

  it("never returns a block whose range doesn't contain the moment", () => {
    for (let h = 0; h < 24; h++) {
      const at = monday(h, 15);
      const block = getCurrentBlock(at);
      if (!block) continue;
      const nowMin = h * 60 + 15;
      expect(block.startMin).toBeLessThanOrEqual(nowMin);
      expect(block.endMin).toBeGreaterThan(nowMin);
    }
  });
});

describe("getNextStudyBlock", () => {
  it("returns the first study slot starting after now", () => {
    const next = getNextStudyBlock(monday(18, 0));
    expect(next?.type).toBe("study");
    expect(parseRange(next!.time)![0]).toBeGreaterThan(18 * 60);
  });

  it("returns null once the day's study slots are behind us", () => {
    expect(getNextStudyBlock(monday(23, 59))).toBeNull();
  });
});

describe("formatMs", () => {
  it("formats as zero-padded MM:SS", () => {
    expect(formatMs(0)).toBe("00:00");
    expect(formatMs(65_000)).toBe("01:05");
    expect(formatMs(25 * 60_000)).toBe("25:00");
  });

  it("clamps negatives to zero rather than printing -1:-1", () => {
    expect(formatMs(-5000)).toBe("00:00");
  });

  it("truncates sub-second remainders", () => {
    expect(formatMs(1999)).toBe("00:01");
  });
});
