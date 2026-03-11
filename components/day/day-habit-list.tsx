"use client";

import { isAfter, parseISO, startOfDay } from "date-fns";

import type { MonthData } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type DayHabitListProps = {
  dayKey: string;
  month: MonthData;
  monthKey: string;
};

export function DayHabitList({ dayKey, month, monthKey }: DayHabitListProps) {
  const toggleHabitDay = useAppStore((state) => state.toggleHabitDay);
  const isFuture = isAfter(startOfDay(parseISO(dayKey)), startOfDay(new Date()));

  return (
    <section className="paper-panel rounded-[32px] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">Привычки</div>
      <div className="mt-4 space-y-3">
        {month.habits.length === 0 ? (
          <div className="rounded-[24px] border border-line bg-paper/90 px-4 py-5 text-sm text-muted">
            Для этого месяца привычки не заданы.
          </div>
        ) : null}
        {month.habits.map((habit) => {
          const isCompleted = (month.habitLogs[habit.id] ?? []).includes(dayKey);

          return (
            <label
              key={habit.id}
              className={cn(
                "flex items-center gap-3 rounded-[24px] border border-line bg-paper/90 px-4 py-4",
                isFuture && "pointer-events-none opacity-35",
              )}
            >
              <button
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-[14px] border transition-colors",
                  isCompleted ? "border-success bg-success text-white" : "border-line bg-paper text-transparent",
                )}
                disabled={isFuture}
                onClick={() => toggleHabitDay(monthKey, habit.id, dayKey)}
                type="button"
              >
                ✓
              </button>
              <span className="text-sm font-medium text-ink">{habit.name}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
