"use client";

import Link from "next/link";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { useEffect, useState } from "react";

import { FocusBlock } from "@/components/dashboard/focus-block";
import { MonthStatesPanel } from "@/components/dashboard/month-states-panel";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMonthLabel, getAdjacentMonth, getMonthKey, getWeekKey, getWeeksForMonth } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { getLastTaskStatus, isTaskClosed } from "@/lib/week-tasks";

const SHOW_MONTH_STATES_PANEL = true;
const SHOW_DASHBOARD_TRANSITIONS = false;

function progressRatio(done: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((done / total) * 100);
}

export function DashboardScreen() {
  const today = new Date();
  const [viewOffset, setViewOffset] = useState(0);
  const monthRef = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const weekRef = { year: getISOWeekYear(today), week: getISOWeek(today) };
  const monthKey = getMonthKey(monthRef.year, monthRef.month);
  const weekKey = getWeekKey(weekRef.year, weekRef.week);
  const viewMonthRef = getAdjacentMonth(monthRef.year, monthRef.month, viewOffset);
  const viewMonthKey = getMonthKey(viewMonthRef.year, viewMonthRef.month);
  const viewMonthWeeks = getWeeksForMonth(viewMonthRef.year, viewMonthRef.month);
  const lastViewMonthWeek = viewMonthWeeks[viewMonthWeeks.length - 1];
  const viewWeekRef =
    viewOffset === 0 || !lastViewMonthWeek
      ? weekRef
      : { year: lastViewMonthWeek.year, week: lastViewMonthWeek.week };
  const viewWeekKey = getWeekKey(viewWeekRef.year, viewWeekRef.week);

  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const ensureWeek = useAppStore((state) => state.ensureWeek);
  const monthData = useAppStore((state) => state.months[monthKey]);
  const viewMonthData = useAppStore((state) => state.months[viewMonthKey]);
  const weekData = useAppStore((state) => state.weeks[weekKey]);
  const viewWeekData = useAppStore((state) => state.weeks[viewWeekKey]);
  const weeks = useAppStore((state) => state.weeks);
  const viewMonthLabel = formatMonthLabel(viewMonthRef.year, viewMonthRef.month);

  useEffect(() => {
    ensureMonth(monthRef.year, monthRef.month);
    ensureWeek(weekRef.year, weekRef.week);
    getWeeksForMonth(monthRef.year, monthRef.month).forEach(({ year, week }) => {
      ensureWeek(year, week);
    });
    if (viewOffset !== 0) {
      ensureMonth(viewMonthRef.year, viewMonthRef.month);
      getWeeksForMonth(viewMonthRef.year, viewMonthRef.month).forEach(({ year, week }) => {
        ensureWeek(year, week);
      });
    }
  }, [
    ensureMonth,
    ensureWeek,
    monthRef.month,
    monthRef.year,
    viewMonthRef.month,
    viewMonthRef.year,
    viewOffset,
    weekRef.week,
    weekRef.year,
  ]);

  if (!monthData || !viewMonthData || !weekData || !viewWeekData) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="paper-panel h-28 animate-pulse rounded-[32px] border border-line bg-paper/60" />
          <div className="paper-panel h-28 animate-pulse rounded-[32px] border border-line bg-paper/60" />
        </div>
        <div className="paper-panel h-[220px] animate-pulse rounded-[32px] border border-line bg-paper/60" />
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="paper-panel h-36 animate-pulse rounded-[32px] border border-line bg-paper/60" />
          <div className="paper-panel h-36 animate-pulse rounded-[32px] border border-line bg-paper/60" />
        </section>
        <div className="paper-panel h-36 animate-pulse rounded-[32px] border border-line bg-paper/60" />
      </div>
    );
  }

  const completedTasks = viewWeekData.tasks.filter((task) => getLastTaskStatus(task) === "done").length;
  const carryOverTasks = viewWeekData.tasks.filter((task) => !isTaskClosed(task)).length;
  const isCurrentMonth = viewOffset === 0;
  const daysInViewMonth = new Date(viewMonthRef.year, viewMonthRef.month, 0).getDate();
  const habitCutoffKey = isCurrentMonth
    ? format(today, "yyyy-MM-dd")
    : `${viewMonthKey}-${String(daysInViewMonth).padStart(2, "0")}`;
  const habitTotal = viewMonthData.habits.length * (isCurrentMonth ? today.getDate() : daysInViewMonth);
  const habitDone = viewMonthData.habits.reduce(
    (total, habit) =>
      total + (viewMonthData.habitLogs[habit.id] ?? []).filter((dayKey) => dayKey <= habitCutoffKey).length,
    0,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted">Месячный разворот</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{viewMonthLabel}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Предыдущий месяц"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            onClick={() => setViewOffset((offset) => offset - 1)}
            type="button"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            aria-label="Следующий месяц"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            onClick={() => setViewOffset((offset) => offset + 1)}
            type="button"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <FocusBlock
          emptyText="Главная задача месяца не задана"
          text={viewMonthData.mainGoal}
          title="Текущий фокус месяца"
        />
        <FocusBlock
          detail={`Награда недели: ${viewWeekData.reflection.reward}`}
          emptyText="Фокус недели не задан"
          text={viewWeekData.reflection.focus}
          title="Текущий фокус недели"
        />
      </div>

      {SHOW_MONTH_STATES_PANEL ? (
        <MonthStatesPanel
          month={viewMonthData}
          monthKey={viewMonthKey}
          weeks={weeks}
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,0.78fr)]">
        {isCurrentMonth ? (
          <article className="paper-panel rounded-[32px] p-4 sm:p-6">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">Прогресс недели</div>
            <div className="mt-2 text-2xl font-semibold text-ink">
              {progressRatio(completedTasks, viewWeekData.tasks.length || 1)}%
            </div>
            <div className="mt-3 h-2 rounded-full bg-line">
              <div
                className="h-2 rounded-full bg-ink transition-[width] duration-300"
                style={{ width: `${progressRatio(completedTasks, viewWeekData.tasks.length || 1)}%` }}
              />
            </div>
            <div className="mt-3 text-sm text-muted">
              {completedTasks} задач завершено, {carryOverTasks} осталось открытыми.
            </div>
          </article>
        ) : null}

        <article className="paper-panel rounded-[32px] p-4 sm:p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Привычки месяца</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{progressRatio(habitDone, habitTotal || 1)}%</div>
          <div className="mt-3 h-2 rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-success transition-[width] duration-300"
              style={{ width: `${progressRatio(habitDone, habitTotal || 1)}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-muted">
            {habitDone} выполнений из {habitTotal || 0} возможных отметок
            {isCurrentMonth ? " к текущему дню." : " за весь месяц."}
          </div>
        </article>
      </section>

      {SHOW_DASHBOARD_TRANSITIONS ? (
        <article className="paper-panel rounded-[32px] p-4 sm:p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted">Переходы</div>
          <div className="mt-1 text-lg font-semibold text-ink">Открыть рабочие развороты</div>
          <div className="mt-5 grid gap-3">
            <Link
              className="rounded-[24px] border border-line bg-canvas/80 px-4 py-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              href={`/week/${weekRef.year}/${weekRef.week}`}
            >
              Открыть текущую неделю
            </Link>
            <Link
              className="rounded-[24px] border border-line bg-canvas/80 px-4 py-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              href={`/month/${monthRef.year}/${monthRef.month}`}
            >
              Открыть текущий месяц
            </Link>
          </div>
        </article>
      ) : null}
    </div>
  );
}
