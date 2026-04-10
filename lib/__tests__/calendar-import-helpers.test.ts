import { describe, expect, it } from "vitest";

import {
  buildCalendarEventImportPayload,
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
});
