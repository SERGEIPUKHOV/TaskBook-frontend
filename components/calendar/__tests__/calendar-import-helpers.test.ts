import { describe, expect, it } from "vitest";

import {
  buildCalendarBulkImportRows,
  buildCalendarEventImportPayload,
  getCalendarImportBlockedReason,
  isCalendarEventImportable,
} from "@/components/calendar/calendar-import-helpers";
import type { CalendarEvent } from "@/lib/planner-types";

function buildEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    accountLabel: "Work",
    connectionId: "connection-1",
    description: null,
    endsAt: "2026-04-09T10:00:00Z",
    externalCalendarId: "primary",
    externalEventId: "event-1",
    id: "event-1",
    isAllDay: false,
    location: null,
    plannerLink: null,
    provider: "google",
    sourceTimezone: "UTC",
    startsAt: "2026-04-09T09:00:00Z",
    status: "confirmed",
    suggestedTargetType: "task",
    title: "Review",
    ...overrides,
  };
}

describe("calendar import helpers", () => {
  it("marks normal unlinked events as importable", () => {
    expect(isCalendarEventImportable(buildEvent())).toBe(true);
  });

  it("blocks cancelled and multi-day events", () => {
    expect(getCalendarImportBlockedReason(buildEvent({ status: "cancelled" }))).toMatch("Отменённое");
    expect(
      getCalendarImportBlockedReason(
        buildEvent({
          endsAt: "2026-04-11T10:00:00Z",
          startsAt: "2026-04-09T09:00:00Z",
        }),
      ),
    ).toMatch("несколько дней");
  });

  it("prefills bulk rows from suggested target type", () => {
    expect(
      buildCalendarBulkImportRows([buildEvent({ suggestedTargetType: "habit" })])[0],
    ).toEqual(
      expect.objectContaining({
        checked: true,
        targetType: "habit",
      }),
    );
  });

  it("builds habit payloads from event month and task payloads from visible week", () => {
    expect(
      buildCalendarEventImportPayload(buildEvent({ suggestedTargetType: "habit" }), "habit", 2026, 15),
    ).toEqual({
      month: 4,
      targetType: "habit",
      title: "Review",
      year: 2026,
    });

    expect(buildCalendarEventImportPayload(buildEvent(), "task", 2026, 15)).toEqual({
      isPriority: false,
      startDay: 4,
      targetType: "task",
      timePlanned: 1,
      title: "Review",
      week: 15,
      year: 2026,
    });
  });
});
