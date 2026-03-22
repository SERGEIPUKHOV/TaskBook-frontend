"use client";

import { getLastTaskStatus, getTaskCellState, getWeekDayKeys } from "@/lib/week-tasks";
import type { TaskStatus, WeekData } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type DayTaskListProps = {
  dayKey: string;
  week: WeekData;
  weekKey: string;
};

function statusLabel(status: TaskStatus | "planned"): string {
  if (status === "done") {
    return "✓";
  }
  if (status === "moved") {
    return "→";
  }
  if (status === "failed") {
    return "✕";
  }
  return "○";
}

function statusClassName(status: TaskStatus | "planned"): string {
  if (status === "done") {
    return "border-success bg-success text-white";
  }
  if (status === "moved") {
    return "border-accent bg-accent/10 text-accent";
  }
  if (status === "failed") {
    return "border-danger bg-danger/10 text-danger";
  }
  return "border-line bg-paper text-muted";
}

function statusToRu(status: TaskStatus | "planned"): string {
  if (status === "done") {
    return "Выполнено";
  }
  if (status === "moved") {
    return "Перенесено";
  }
  if (status === "failed") {
    return "Не выполнено";
  }
  return "Назначено";
}

export function DayTaskList({ dayKey, week, weekKey }: DayTaskListProps) {
  const cycleTaskStatus = useAppStore((state) => state.cycleTaskStatus);
  const dayKeys = getWeekDayKeys(week.startDate);
  const dayIndex = dayKeys.indexOf(dayKey);
  const tasks = week.tasks.filter((task) => {
    if (dayIndex === -1) {
      return false;
    }
    return getTaskCellState(task, dayIndex, dayKeys).variant === "normal";
  });

  return (
    <section className="paper-panel rounded-[32px] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">Задачи</div>
      <div className="mt-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-[24px] border border-line bg-paper/90 px-4 py-5 text-sm text-muted">
            На этот день задачи не попали.
          </div>
        ) : null}
        {tasks.map((task) => {
          const cellState = dayIndex === -1 ? null : getTaskCellState(task, dayIndex, dayKeys);
          const displayStatus = cellState?.status ?? getLastTaskStatus(task) ?? "planned";

          return (
            <div key={task.id} className="rounded-[24px] border border-line bg-paper/90 px-4 py-4">
              <div className="flex items-start gap-4">
                <button
                  className={cn(
                    "mt-0.5 flex h-10 w-10 items-center justify-center rounded-[14px] border text-sm transition-colors",
                    statusClassName(displayStatus),
                    cellState?.isInteractive && "hover:border-ink hover:text-ink",
                    !cellState?.isInteractive && "cursor-default opacity-80",
                  )}
                  disabled={!cellState?.isInteractive}
                  onClick={() => cycleTaskStatus(weekKey, task.id, dayKey)}
                  type="button"
                >
                  {statusLabel(displayStatus)}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-medium text-ink">{task.title || "Без названия"}</h2>
                    {task.isPriority ? (
                      <span className="rounded-full border border-priority/40 bg-priority/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-priority">
                        Приоритет
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                    <span>Ti: {task.ti || "—"}</span>
                    <span>Fa: {task.fa || "—"}</span>
                    <span>Статус: {statusToRu(displayStatus)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
