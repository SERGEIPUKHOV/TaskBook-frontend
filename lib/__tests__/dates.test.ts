import { describe, expect, it } from "vitest";

import { dayIsInWeek, getISOWeekReference, getMonthKey, getWeekKey } from "../dates";

describe("getISOWeekReference", () => {
  it("returns ISO week 2 for January 5, 2026", () => {
    expect(getISOWeekReference(new Date("2026-01-05T12:00:00Z"))).toEqual({
      year: 2026,
      week: 2,
    });
  });

  it("handles ISO year boundaries", () => {
    expect(getISOWeekReference(new Date("2025-12-29T12:00:00Z"))).toEqual({
      year: 2026,
      week: 1,
    });
  });
});

describe("getMonthKey", () => {
  it("formats month keys as YYYY-MM", () => {
    expect(getMonthKey(2026, 3)).toBe("2026-03");
  });

  it("pads single-digit months", () => {
    expect(getMonthKey(2026, 1)).toBe("2026-01");
  });
});

describe("getWeekKey", () => {
  it("formats week keys as YYYY-Www", () => {
    expect(getWeekKey(2026, 11)).toBe("2026-W11");
  });
});

describe("dayIsInWeek", () => {
  it("returns true for a day inside the requested ISO week", () => {
    expect(dayIsInWeek("2026-03-12", 2026, 11)).toBe(true);
  });

  it("returns false for a day outside the requested ISO week", () => {
    expect(dayIsInWeek("2026-03-22", 2026, 11)).toBe(false);
  });
});
