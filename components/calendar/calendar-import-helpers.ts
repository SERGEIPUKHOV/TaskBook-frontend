import { differenceInCalendarDays, format, getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

import type { CalendarEvent, CalendarEventImportPayload, PlannerLinkTargetKind } from "@/lib/planner-types";

// BLOCK-START: CALENDAR_IMPORT_HELPERS_MODULE
// Description: Shared importability rules and payload builders for calendar event suggestions and bulk import UX.
export type CalendarBulkImportRow = {
  checked: boolean;
  error?: string;
  event: CalendarEvent;
  targetType: PlannerLinkTargetKind;
};

export function estimateCalendarEventTimePlanned(event: CalendarEvent): number | null {
  if (event.isAllDay) {
    return null;
  }

  const durationMinutes = Math.max(
    0,
    Math.round((parseISO(event.endsAt).getTime() - parseISO(event.startsAt).getTime()) / 60_000),
  );
  if (durationMinutes <= 0) {
    return null;
  }

  return Math.max(1, Math.round(durationMinutes / 60));
}

export function getCalendarEventStartDay(event: CalendarEvent): number {
  const day = parseISO(event.startsAt).getDay();
  return day === 0 ? 7 : day;
}

export function getCalendarImportBlockedReason(event: CalendarEvent): string | null {
  if (event.status === "cancelled") {
    return "Отменённое событие пока нельзя перенести в план.";
  }

  const start = parseISO(event.startsAt);
  const end = parseISO(event.endsAt);
  const spansMultipleDays = event.isAllDay
    ? differenceInCalendarDays(end, start) > 1
    : start.toDateString() !== end.toDateString();

  if (spansMultipleDays) {
    return "События на несколько дней пока не импортируются в план автоматически.";
  }

  return null;
}

export function isCalendarEventImportable(event: CalendarEvent): boolean {
  return !event.plannerLink && !getCalendarImportBlockedReason(event);
}

export function buildCalendarBulkImportRows(events: CalendarEvent[]): CalendarBulkImportRow[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = event.recurringEventId;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((event) => ({
      checked: true,
      error: undefined,
      event,
      targetType: event.suggestedTargetType,
    }));
}

export function buildCalendarEventImportPayload(
  event: CalendarEvent,
  targetType: PlannerLinkTargetKind,
  weekYear: number,
  weekNumber: number,
): CalendarEventImportPayload {
  if (targetType === "habit") {
    const start = parseISO(event.startsAt);
    return {
      month: start.getMonth() + 1,
      targetType: "habit",
      title: event.title,
      year: start.getFullYear(),
    };
  }

  const start = parseISO(event.startsAt);
  return {
    isPriority: false,
    startDay: getCalendarEventStartDay(event),
    targetType: "task",
    timePlanned: estimateCalendarEventTimePlanned(event),
    title: event.title,
    week: weekNumber || getISOWeek(start),
    year: weekYear || getISOWeekYear(start),
  };
}

export function formatCalendarBulkEventMeta(event: CalendarEvent): string {
  if (event.isAllDay) {
    return `${format(parseISO(event.startsAt), "EEE, d MMM", { locale: ru })} · весь день`;
  }

  return `${format(parseISO(event.startsAt), "EEE, d MMM · HH:mm", { locale: ru })} – ${format(parseISO(event.endsAt), "HH:mm", {
    locale: ru,
  })}`;
}

export function formatCalendarBulkEventDate(event: CalendarEvent): string {
  return format(parseISO(event.startsAt), "EEE, d MMM", { locale: ru });
}

export function formatCalendarBulkEventTime(event: CalendarEvent): string {
  if (event.isAllDay) {
    return "весь день";
  }

  return `${format(parseISO(event.startsAt), "HH:mm", { locale: ru })} – ${format(parseISO(event.endsAt), "HH:mm", {
    locale: ru,
  })}`;
}
// BLOCK-END: CALENDAR_IMPORT_HELPERS_MODULE
