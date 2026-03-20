import { getISOWeekReference, getWeekKey } from "@/lib/dates";
import type { DayChartStats, MonthData, WeekData } from "@/lib/planner-types";
import { getWeekDayKeys } from "@/lib/week-tasks";

function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function computeDayStats(
  month: MonthData,
  weeks: Record<string, WeekData>,
): Record<number, DayChartStats> {
  const result: Record<number, DayChartStats> = {};
  const daysInMonth = new Date(month.year, month.month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = toDayKey(month.year, month.month, day);
    const weekRef = getISOWeekReference(new Date(month.year, month.month - 1, day));
    const weekData = weeks[getWeekKey(weekRef.year, weekRef.week)];
    const totalHabits = month.habits.length;
    const completedHabits = month.habits.filter((habit) => (month.habitLogs[habit.id] ?? []).includes(dayKey)).length;
    const habitsPct = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : null;

    let taskDonePct: number | null = null;
    let taskMovedPct: number | null = null;

    if (weekData) {
      const dayKeys = getWeekDayKeys(weekData.startDate);
      const dayIndex = dayKeys.indexOf(dayKey);

      if (dayIndex !== -1) {
        const activeTasks = weekData.tasks.filter((task) => {
          const startIndex = dayKeys.indexOf(task.startDayKey);
          if (startIndex === -1 || dayIndex < startIndex) return false;
          // задача имеет явный статус на этот день
          if (dayIndex <= startIndex + task.statusTrail.length - 1) return true;
          // задача в состоянии "ожидает переноса" (следующий день после "moved")
          const lastStatus = task.statusTrail.at(-1);
          return dayIndex === startIndex + task.statusTrail.length && lastStatus === "moved";
        });

        if (activeTasks.length > 0) {
          const statuses = activeTasks.map((task) => {
            const startIndex = dayKeys.indexOf(task.startDayKey);
            const relativeIndex = dayIndex - startIndex;
            // явный статус или "planned" для задачи в ожидании переноса
            return task.statusTrail[relativeIndex] ?? "planned";
          });

          taskDonePct = Math.round((statuses.filter((status) => status === "done").length / activeTasks.length) * 100);
          taskMovedPct = Math.round(
            (statuses.filter((status) => status === "moved").length / activeTasks.length) * 100,
          );
        }
      }
    }

    result[day] = {
      habitsPct,
      taskDonePct,
      taskMovedPct,
    };
  }

  return result;
}
