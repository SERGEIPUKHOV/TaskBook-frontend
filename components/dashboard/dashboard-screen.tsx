"use client";

import Link from "next/link";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { useEffect } from "react";

import { FocusBlock } from "@/components/dashboard/focus-block";
import { MonthStatesPanel } from "@/components/dashboard/month-states-panel";
import { getMonthKey, getWeekKey, getWeeksForMonth } from "@/lib/dates";
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
  const monthRef = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const weekRef = { year: getISOWeekYear(today), week: getISOWeek(today) };
  const monthKey = getMonthKey(monthRef.year, monthRef.month);
  const weekKey = getWeekKey(weekRef.year, weekRef.week);

  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const ensureWeek = useAppStore((state) => state.ensureWeek);
  const monthData = useAppStore((state) => state.months[monthKey]);
  const weekData = useAppStore((state) => state.weeks[weekKey]);
  const weeks = useAppStore((state) => state.weeks);

  useEffect(() => {
    ensureMonth(monthRef.year, monthRef.month);
    ensureWeek(weekRef.year, weekRef.week);
    getWeeksForMonth(monthRef.year, monthRef.month).forEach(({ year, week }) => {
      ensureWeek(year, week);
    });
  }, [ensureMonth, ensureWeek, monthRef.month, monthRef.year, weekRef.week, weekRef.year]);

  if (!monthData || !weekData) {
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

  const completedTasks = weekData.tasks.filter((task) => getLastTaskStatus(task) === "done").length;
  const carryOverTasks = weekData.tasks.filter((task) => !isTaskClosed(task)).length;
  const habitTotal = monthData.habits.length * today.getDate();
  const todayKey = format(today, "yyyy-MM-dd");
  const habitDone = monthData.habits.reduce(
    (total, habit) => total + (monthData.habitLogs[habit.id] ?? []).filter((dayKey) => dayKey <= todayKey).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FocusBlock
          emptyText="Главная задача месяца не задана"
          text={monthData.mainGoal}
          title="Текущий фокус месяца"
        />
        <FocusBlock
          detail={`Награда недели: ${weekData.reflection.reward}`}
          emptyText="Фокус недели не задан"
          text={weekData.reflection.focus}
          title="Текущий фокус недели"
        />
      </div>

      {SHOW_MONTH_STATES_PANEL ? (
        <MonthStatesPanel month={monthData} monthKey={monthKey} weeks={weeks} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,0.78fr)]">
        <article className="paper-panel rounded-[32px] p-4 sm:p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Прогресс недели</div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {progressRatio(completedTasks, weekData.tasks.length || 1)}%
          </div>
          <div className="mt-3 h-2 rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-ink transition-[width] duration-300"
              style={{ width: `${progressRatio(completedTasks, weekData.tasks.length || 1)}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-muted">
            {completedTasks} задач завершено, {carryOverTasks} осталось открытыми.
          </div>
        </article>

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
            {habitDone} выполнений из {habitTotal || 0} возможных отметок к текущему дню.
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
