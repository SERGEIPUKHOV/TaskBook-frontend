"use client";

import { addDays, addWeeks, format, startOfISOWeek } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarWeekGrid } from "@/components/calendar/calendar-week-grid";
import { formatIsoDate } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { getCalendarRangeKey } from "@/store/slices/shared";

export function CalendarScreen() {
  const [weekOffset, setWeekOffset] = useState(0);

  const ensureCalendarRange = useAppStore((state) => state.ensureCalendarRange);
  const fetchCalendarConnections = useAppStore((state) => state.fetchCalendarConnections);
  const calendarConnections = useAppStore((state) => state.calendarConnections);
  const connectionsStatus = useAppStore((state) => state.calendarConnectionsStatus);

  const { dateFrom, dateTo, weekStart } = useMemo(() => {
    const weekStartDate = startOfISOWeek(addWeeks(new Date(), weekOffset));
    return {
      weekStart: weekStartDate,
      dateFrom: formatIsoDate(weekStartDate),
      dateTo: formatIsoDate(addDays(weekStartDate, 6)),
    };
  }, [weekOffset]);
  const rangeKey = getCalendarRangeKey(dateFrom, dateTo);
  const weekEvents = useAppStore((state) => state.calendarRanges[rangeKey]?.events ?? []);
  const rangeStatus = useAppStore((state) => state.calendarRangeLoadStates[rangeKey] ?? "idle");

  useEffect(() => {
    void fetchCalendarConnections();
  }, [fetchCalendarConnections]);

  useEffect(() => {
    void ensureCalendarRange(dateFrom, dateTo);
  }, [dateFrom, dateTo, ensureCalendarRange]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: ru })} – ${format(addDays(weekStart, 6), "d MMM", {
    locale: ru,
  })}`;

  const handlePrev = useCallback(() => setWeekOffset((offset) => offset - 1), []);
  const handleNext = useCallback(() => setWeekOffset((offset) => offset + 1), []);
  const handleToday = useCallback(() => setWeekOffset(0), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition-colors hover:border-accent hover:text-accent"
          onClick={handlePrev}
          type="button"
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{weekLabel}</span>
          {weekOffset !== 0 ? (
            <button
              className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={handleToday}
              type="button"
            >
              Сегодня
            </button>
          ) : null}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-paper text-ink transition-colors hover:border-accent hover:text-accent"
          onClick={handleNext}
          type="button"
        >
          →
        </button>
      </div>

      {connectionsStatus !== "loading" && calendarConnections.length === 0 ? (
        <Link
          className="flex min-h-40 items-center justify-center rounded-[32px] border border-dashed border-line bg-paper/60 px-6 text-base font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          href="/profile"
        >
          + Добавить календарь
        </Link>
      ) : (
        <CalendarWeekGrid
          events={weekEvents}
          isLoading={rangeStatus === "loading" && weekEvents.length === 0}
          weekStart={weekStart}
        />
      )}
    </div>
  );
}
