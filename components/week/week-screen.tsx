"use client";

import { addDays } from "date-fns";
import Link from "next/link";
import { useEffect } from "react";

import { WeekPlannerBoard } from "@/components/week/week-planner-board";
import { WeekReflection } from "@/components/week/week-reflection";
import { WeekStatePanel } from "@/components/week/week-state-panel";
import { WeekSummary } from "@/components/week/week-summary";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatWeekDateRange, getAdjacentWeek, getISOWeekStart, getMonthKey, getWeekKey, getWeekNumberInMonth } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { useNavStore } from "@/store/nav-store";

type WeekScreenProps = {
  year: number;
  week: number;
};

const SHOW_WEEK_STATE_PANEL = false;

export function WeekScreen({ year, week }: WeekScreenProps) {
  const weekKey = getWeekKey(year, week);
  const weekStart = getISOWeekStart(year, week);
  const habitMonthRef = { year: weekStart.getFullYear(), month: weekStart.getMonth() + 1 };
  const endDate = addDays(weekStart, 6);
  const endMonthRef = { year: endDate.getFullYear(), month: endDate.getMonth() + 1 };
  const isCrossMonth = endMonthRef.year !== habitMonthRef.year || endMonthRef.month !== habitMonthRef.month;
  const habitMonthKey = getMonthKey(habitMonthRef.year, habitMonthRef.month);
  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const ensureWeek = useAppStore((state) => state.ensureWeek);
  const setLastWeek = useNavStore((state) => state.setLastWeek);
  const weekData = useAppStore((state) => state.weeks[weekKey]);

  useEffect(() => {
    ensureWeek(year, week);
    ensureMonth(habitMonthRef.year, habitMonthRef.month);
    if (isCrossMonth) {
      ensureMonth(endMonthRef.year, endMonthRef.month);
    }
  }, [ensureMonth, ensureWeek, endMonthRef.month, endMonthRef.year, habitMonthRef.month, habitMonthRef.year, isCrossMonth, week, year]);

  useEffect(() => {
    setLastWeek({ year, week });
  }, [setLastWeek, week, year]);

  if (!weekData) {
    return <div className="paper-panel h-[640px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  const prevWeek = getAdjacentWeek(year, week, -1);
  const nextWeek = getAdjacentWeek(year, week, 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted">Недельный разворот</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{formatWeekDateRange(year, week)}</h1>
          <div className="mt-1 text-sm font-medium text-muted">
            Неделя {getWeekNumberInMonth(year, week)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            aria-label="Предыдущая неделя"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            href={`/week/${prevWeek.year}/${prevWeek.week}`}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <Link
            className="rounded-[22px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            href="/dashboard"
          >
            К дашборду
          </Link>
          <Link
            aria-label="Следующая неделя"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            href={`/week/${nextWeek.year}/${nextWeek.week}`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <WeekSummary week={weekData} weekKey={weekKey} />
      <WeekPlannerBoard
        monthKey={habitMonthKey}
        monthNumber={habitMonthRef.month}
        monthYear={habitMonthRef.year}
        week={weekData}
        weekKey={weekKey}
      />
      {SHOW_WEEK_STATE_PANEL ? <WeekStatePanel week={weekData} /> : null}
      <WeekReflection week={weekData} weekKey={weekKey} />
    </div>
  );
}
