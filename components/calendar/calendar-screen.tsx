"use client";

import { addDays } from "date-fns";
import { useEffect, useMemo } from "react";
import Link from "next/link";

import { CalendarEventsPanel } from "@/components/calendar/calendar-events-panel";
import { formatIsoDate } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { getCalendarRangeKey } from "@/store/slices/shared";

export function CalendarScreen() {
  const ensureCalendarRange = useAppStore((state) => state.ensureCalendarRange);
  const fetchCalendarConnections = useAppStore((state) => state.fetchCalendarConnections);
  const calendarConnections = useAppStore((state) => state.calendarConnections);
  const connectionsStatus = useAppStore((state) => state.calendarConnectionsStatus);

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
    void fetchCalendarConnections();
  }, [ensureCalendarRange, fetchCalendarConnections, previewWindow.dateFrom, previewWindow.dateTo]);

  return (
    <div className="space-y-6">
      {connectionsStatus !== "loading" && calendarConnections.length === 0 ? (
        <Link
          className="flex min-h-40 items-center justify-center rounded-[32px] border border-dashed border-line bg-paper/60 px-6 text-base font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          href="/profile"
        >
          + Добавить календарь
        </Link>
      ) : (
        <CalendarEventsPanel
          emptyMessage="Пока нет ближайших внешних событий на горизонте недели."
          events={previewEvents}
          isLoading={previewStatus === "loading" && previewEvents.length === 0}
          kicker="Превью"
          title="Ближайшие 7 дней"
        />
      )}
    </div>
  );
}
