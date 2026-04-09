"use client";

import { addDays, addWeeks, differenceInCalendarWeeks, format, getISOWeek, getISOWeekYear, isValid, parseISO, startOfISOWeek } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CalendarBulkImportModal } from "@/components/calendar/calendar-bulk-import-modal";
import { isCalendarEventImportable } from "@/components/calendar/calendar-import-helpers";
import { CalendarWeekGrid } from "@/components/calendar/calendar-week-grid";
import { CalendarPlusIcon, PlusCircleIcon } from "@/components/ui/icons";
import { formatIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { getCalendarRangeKey } from "@/store/slices/shared";

function parseWeekStartParam(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = parseISO(value);
  if (!isValid(parsedDate)) {
    return null;
  }

  return startOfISOWeek(parsedDate);
}

export function CalendarScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ensureCalendarRange = useAppStore((state) => state.ensureCalendarRange);
  const fetchCalendarConnections = useAppStore((state) => state.fetchCalendarConnections);
  const importSuggestionsEnabled = useAppStore((state) => state.importSuggestionsEnabled);
  const toggleImportSuggestions = useAppStore((state) => state.toggleImportSuggestions);
  const calendarConnections = useAppStore((state) => state.calendarConnections);
  const connectionsStatus = useAppStore((state) => state.calendarConnectionsStatus);
  const currentWeekStart = useMemo(() => startOfISOWeek(new Date()), []);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const urlWeekStart = parseWeekStartParam(searchParams.get("ws"));
    return urlWeekStart ?? currentWeekStart;
  }, [currentWeekStart, searchParams]);
  const weekYear = useMemo(() => getISOWeekYear(weekStart), [weekStart]);
  const weekNumber = useMemo(() => getISOWeek(weekStart), [weekStart]);
  const weekOffset = useMemo(
    () => differenceInCalendarWeeks(weekStart, currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart, weekStart],
  );

  const { dateFrom, dateTo } = useMemo(() => {
    return {
      dateFrom: formatIsoDate(weekStart),
      dateTo: formatIsoDate(addDays(weekStart, 6)),
    };
  }, [weekStart]);
  const rangeKey = getCalendarRangeKey(dateFrom, dateTo);
  const weekEvents = useAppStore((state) => state.calendarRanges[rangeKey]?.events ?? []);
  const importableEvents = useMemo(
    () => weekEvents.filter((event) => isCalendarEventImportable(event)),
    [weekEvents],
  );
  const rangeStatus = useAppStore((state) => state.calendarRangeLoadStates[rangeKey] ?? "idle");

  useEffect(() => {
    void fetchCalendarConnections();
  }, [fetchCalendarConnections]);

  useEffect(() => {
    void ensureCalendarRange(dateFrom, dateTo);
  }, [dateFrom, dateTo, ensureCalendarRange]);

  useEffect(() => {
    const nextWeekStart = formatIsoDate(weekStart);
    if (searchParams.get("ws") === nextWeekStart) {
      return;
    }

    router.replace(`/calendar?ws=${nextWeekStart}`, { scroll: false });
  }, [router, searchParams, weekStart]);

  useEffect(() => {
    if (!bulkNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setBulkNotice(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [bulkNotice]);

  useEffect(() => {
    if (importableEvents.length === 0 && bulkModalOpen) {
      setBulkModalOpen(false);
    }
  }, [bulkModalOpen, importableEvents.length]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: ru })} – ${format(addDays(weekStart, 6), "d MMM", {
    locale: ru,
  })}`;

  const handleNavigateWeek = useCallback(
    (delta: number) => {
      const nextWeekStart = addWeeks(weekStart, delta);
      router.replace(`/calendar?ws=${formatIsoDate(nextWeekStart)}`, { scroll: false });
    },
    [router, weekStart],
  );
  const handlePrev = useCallback(() => handleNavigateWeek(-1), [handleNavigateWeek]);
  const handleNext = useCallback(() => handleNavigateWeek(1), [handleNavigateWeek]);
  const handleToday = useCallback(() => {
    router.replace(`/calendar?ws=${formatIsoDate(currentWeekStart)}`, { scroll: false });
  }, [currentWeekStart, router]);

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

        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
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
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
              importSuggestionsEnabled
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line bg-paper text-muted hover:border-accent hover:text-accent",
            )}
            onClick={toggleImportSuggestions}
            type="button"
          >
            <PlusCircleIcon className="h-3.5 w-3.5" />
            Предложения
          </button>
          {importSuggestionsEnabled && importableEvents.length > 0 ? (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={() => setBulkModalOpen(true)}
              type="button"
            >
              <CalendarPlusIcon className="h-3.5 w-3.5" />
              В план ({importableEvents.length})
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
          connections={calendarConnections}
          events={weekEvents}
          isLoading={rangeStatus === "loading" && weekEvents.length === 0}
          showImportSuggestions={importSuggestionsEnabled}
          weekStart={weekStart}
        />
      )}

      {bulkModalOpen ? (
        <CalendarBulkImportModal
          events={importableEvents}
          onClose={() => setBulkModalOpen(false)}
          onImported={(summary) => {
            setBulkNotice(
              summary.failedCount > 0
                ? `Перенесено в план: ${summary.importedCount} из ${summary.requestedCount}.`
                : `Перенесено в план: ${summary.importedCount}.`,
            );
          }}
          weekNumber={weekNumber}
          weekYear={weekYear}
        />
      ) : null}

      {bulkNotice ? (
        <div className="fixed bottom-5 right-5 z-[80] rounded-[20px] border border-accent/30 bg-paper px-4 py-3 text-sm font-medium text-accent shadow-paper">
          {bulkNotice}
        </div>
      ) : null}
    </div>
  );
}
