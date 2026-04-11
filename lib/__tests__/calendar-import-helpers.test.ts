import { describe, expect, it } from "vitest";

import {
  buildCalendarBulkImportRows,
  buildCalendarEventImportPayload,
  isCalendarEventImportable,
  parseRruleScheduleDays,
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
    seriesLinked: false,
    sourceTimezone: "UTC",
    startsAt: "2026-04-09T09:00:00Z",
    status: "confirmed",
    suggestedTargetType: "habit",
    title: "Review",
    ...overrides,
  };
}

describe("calendar import RRULE helpers", () => {
  it("parses BYDAY recurrence into ISO weekday numbers", () => {
    expect(parseRruleScheduleDays(["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"])).toEqual([1, 3, 5]);
    expect(parseRruleScheduleDays(["RRULE:FREQ=MONTHLY"])).toEqual([]);
    expect(parseRruleScheduleDays(undefined)).toEqual([]);
  });

  it("falls back to the event weekday for weekly habit imports without BYDAY", () => {
    expect(
      buildCalendarEventImportPayload(
        buildEvent({
          recurrence: ["RRULE:FREQ=WEEKLY"],
          startsAt: "2026-04-08T09:00:00Z",
        }),
        "habit",
        2026,
        15,
      ),
    ).toEqual({
      month: 4,
      scheduleDays: [3],
      targetType: "habit",
      title: "Review",
      year: 2026,
    });
  });

  it("includes parsed schedule days in habit import payloads", () => {
    expect(
      buildCalendarEventImportPayload(
        buildEvent({ recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH"] }),
        "habit",
        2026,
        15,
      ),
    ).toEqual({
      month: 4,
      scheduleDays: [2, 4],
      targetType: "habit",
      title: "Review",
      year: 2026,
    });
  });

  it("keeps one recurring row per series and prefers the linked instance", () => {
    const rows = buildCalendarBulkImportRows([
      buildEvent({
        externalEventId: "event-1",
        id: "event-1",
        recurringEventId: "series-1",
        title: "Weekly Review",
      }),
      buildEvent({
        externalEventId: "event-2",
        id: "event-2",
        plannerLink: {
          id: "link-1",
          linkMode: "import_copy",
          openPath: "/month/2026/4",
          targetId: "habit-1",
          targetKind: "habit",
        },
        recurringEventId: "series-1",
        title: "Weekly Review",
      }),
      buildEvent({
        externalEventId: "event-3",
        id: "event-3",
        recurringEventId: "series-2",
        title: "Daily Stretch",
      }),
      buildEvent({
        externalEventId: "event-4",
        id: "event-4",
        recurringEventId: "series-2",
        title: "Daily Stretch",
      }),
    ]);

    expect(rows.map((row) => row.event.id)).toEqual(["event-2", "event-3"]);
    expect(rows.map((row) => row.checked)).toEqual([false, true]);
  });

  it("treats series-linked events as not importable", () => {
    expect(isCalendarEventImportable(buildEvent({ seriesLinked: true }))).toBe(false);
    expect(isCalendarEventImportable(buildEvent())).toBe(true);
  });
});
