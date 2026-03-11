"use client";

import { isAfter, startOfDay } from "date-fns";
import { useEffect } from "react";

import { DayHabitList } from "@/components/day/day-habit-list";
import { DayNavigator } from "@/components/day/day-navigator";
import { DayReflection } from "@/components/day/day-reflection";
import { DayTaskList } from "@/components/day/day-task-list";
import { DayStateBlock } from "@/components/ui/day-state-block";
import { formatIsoDate, getISOWeekReference, getMonthKey, getWeekKey, isValidCalendarDate } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";

type DayScreenProps = {
  day: number;
  month: number;
  year: number;
};

export function DayScreen({ day, month, year }: DayScreenProps) {
  const targetDate = new Date(year, month - 1, day);
  const isValidDate = isValidCalendarDate(year, month, day);
  const weekRef = getISOWeekReference(targetDate);
  const monthKey = getMonthKey(year, month);
  const weekKey = getWeekKey(weekRef.year, weekRef.week);
  const dayKey = formatIsoDate(targetDate);
  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const ensureWeek = useAppStore((state) => state.ensureWeek);
  const monthData = useAppStore((state) => state.months[monthKey]);
  const weekData = useAppStore((state) => state.weeks[weekKey]);
  const setDailyMetric = useAppStore((state) => state.setDailyMetric);
  const isFuture = isAfter(startOfDay(targetDate), startOfDay(new Date()));

  useEffect(() => {
    if (!isValidDate) {
      return;
    }
    ensureWeek(weekRef.year, weekRef.week);
    ensureMonth(year, month);
  }, [ensureMonth, ensureWeek, isValidDate, month, weekRef.week, weekRef.year, year]);

  if (!isValidDate) {
    return (
      <div className="paper-panel rounded-[32px] p-6 text-sm text-danger">
        Некорректная дата.
      </div>
    );
  }

  if (!monthData || !weekData) {
    return <div className="paper-panel h-[640px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  const dailyState = monthData.dailyStates.find((entry) => entry.day === day) ?? null;

  return (
    <div className="space-y-6">
      <DayNavigator date={targetDate} weekRef={weekRef} />
      <DayTaskList dayKey={dayKey} week={weekData} weekKey={weekKey} />
      <DayHabitList dayKey={dayKey} month={monthData} monthKey={monthKey} />
      <section className="paper-panel rounded-[32px] p-5">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-muted">Состояние</div>
        <DayStateBlock
          disabled={isFuture}
          onSave={(metric, value) => {
            setDailyMetric(monthKey, day, metric, value);
          }}
          state={dailyState}
        />
      </section>
      <DayReflection dayKey={dayKey} week={weekData} weekKey={weekKey} />
    </div>
  );
}
