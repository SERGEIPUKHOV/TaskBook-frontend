"use client";

import { addDays } from "date-fns";
import { useEffect, useMemo } from "react";

import { CalendarEventsPanel } from "@/components/calendar/calendar-events-panel";
import { formatIsoDate } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { getCalendarRangeKey } from "@/store/slices/shared";

export function CalendarScreen() {
  const ensureCalendarRange = useAppStore((state) => state.ensureCalendarRange);

  const previewWindow = useMemo(() => {
    const today = new Date();
    return {
      dateFrom: formatIsoDate(today),
      dateTo: formatIsoDate(addDays(today, 7)),
    };
  }, []);
  const previewRangeKey = getCalendarRangeKey(previewWindow.dateFrom, previewWindow.dateTo);
  const previewEvents = useAppStore((state) => state.calendarRanges[previewRangeKey]?.events ?? []);
  const previewStatus = useAppStore((state) => state.calendarRangeLoadStates[previewRangeKey] ?? "idle");

  useEffect(() => {
    void ensureCalendarRange(previewWindow.dateFrom, previewWindow.dateTo);
  }, [ensureCalendarRange, previewWindow.dateFrom, previewWindow.dateTo]);

  return (
    <div className="space-y-6">
      <header className="rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:px-5 sm:py-5">
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Превью</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Календарь</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Здесь остаётся только обзор ближайших внешних событий. Управление подключениями и выбором календарей теперь находится в профиле.
        </p>
      </header>

      <CalendarEventsPanel
        emptyMessage="Пока нет ближайших внешних событий на горизонте недели."
        events={previewEvents}
        isLoading={previewStatus === "loading" && previewEvents.length === 0}
        kicker="Превью"
        title="Ближайшие 7 дней"
      />
    </div>
  );
}
