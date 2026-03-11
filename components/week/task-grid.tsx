"use client";

import { useEffect, useState, startTransition } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

import type { TaskStatus, WeekData, WeekTask } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";
import { getTaskCellState, getWeekDayKeys } from "@/lib/week-tasks";
import { cn } from "@/lib/utils";

type TaskGridProps = {
  weekKey: string;
  week: WeekData;
};

type PendingDeleteState = {
  countdown: number;
  taskId: string;
  taskTitle: string;
};

function formatGroupLabel(dayKey: string): string {
  const label = format(parseISO(dayKey), "EE d MMM", { locale: ru }).replace(".", "");
  return label;
}

function statusLabel(status: TaskStatus | "planned"): string {
  if (status === "done") {
    return "Выполнено";
  }

  if (status === "moved") {
    return "Перенесено";
  }

  if (status === "failed") {
    return "Не выполнено";
  }

  return "Запланировано";
}

function StatusCell({
  isInteractive,
  onClick,
  status,
}: {
  isInteractive: boolean;
  onClick: () => void;
  status: TaskStatus | "planned" | null;
}) {
  if (!status) {
    return <div className="h-8 w-8" />;
  }

  const isPlanned = status === "planned";
  const elementClassName = cn(
    "flex h-8 w-8 items-center justify-center rounded-[10px] border text-sm font-semibold transition-colors",
    status === "done" && "border-ink bg-ink text-white",
    status === "moved" && "border-accent bg-accent/10 text-accent",
    status === "failed" && "border-danger bg-danger/10 text-danger",
    isPlanned && "border-line bg-paper text-transparent",
    isInteractive && "hover:border-accent hover:bg-canvas",
    !isInteractive && !isPlanned && "cursor-default",
  );

  if (!isInteractive) {
    return (
      <div aria-label={statusLabel(status)} className={elementClassName} role="img">
        {status === "done" ? "■" : status === "moved" ? "→" : status === "failed" ? "✕" : "·"}
      </div>
    );
  }

  return (
    <button aria-label={statusLabel(status)} className={elementClassName} onClick={onClick} type="button">
      {status === "done" ? "■" : status === "moved" ? "→" : status === "failed" ? "✕" : "·"}
    </button>
  );
}

function DeleteDialog({
  onCancel,
  onConfirm,
  state,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: PendingDeleteState;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-md rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-danger">Удаление задачи</div>
        <h3 className="mt-3 text-2xl font-semibold text-ink">{state.taskTitle || "Пустая задача"}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">
          Это действие нельзя отменить. Кнопка подтверждения станет активной после обратного отсчёта.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button
            className={cn(
              "rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
              state.countdown > 0
                ? "cursor-not-allowed border border-line bg-canvas text-muted"
                : "border border-danger bg-danger text-white",
            )}
            disabled={state.countdown > 0}
            onClick={onConfirm}
            type="button"
          >
            {state.countdown > 0 ? `Удалить (${state.countdown})` : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskGrid({ weekKey, week }: TaskGridProps) {
  const addTask = useAppStore((state) => state.addTask);
  const cycleTaskStatus = useAppStore((state) => state.cycleTaskStatus);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  const dayKeys = getWeekDayKeys(week.startDate);
  const tasksByDay = Object.fromEntries(dayKeys.map((dayKey) => [dayKey, [] as WeekTask[]]));

  week.tasks.forEach((task) => {
    if (tasksByDay[task.startDayKey]) {
      tasksByDay[task.startDayKey].push(task);
    }
  });

  const visibleGroups = dayKeys;

  useEffect(() => {
    if (!pendingDelete || pendingDelete.countdown === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingDelete((current) =>
        current ? { ...current, countdown: Math.max(0, current.countdown - 1) } : current,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pendingDelete]);

  return (
    <>
      <div className="paper-panel rounded-[32px] p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Задачи недели</div>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Левая страница недели</h2>
          </div>
          <div className="rounded-full border border-line bg-canvas/80 px-3 py-1.5 text-sm text-muted">
            Последовательность: назначена → выполнена → перенесена → провалена
          </div>
        </div>

        <div className="hide-scrollbar overflow-x-auto">
          <div className="min-w-[1080px] space-y-6">
            <div className="grid grid-cols-[44px_minmax(260px,1fr)_42px_64px_64px_repeat(7,32px)_32px] items-center gap-2 px-2 text-[11px] uppercase tracking-[0.16em] text-muted">
              <div>#</div>
              <div>Задача</div>
              <div className="text-center">?</div>
              <div className="text-center font-mono">Ti</div>
              <div className="text-center font-mono">Fa</div>
              {dayKeys.map((dayKey) => (
                <div key={dayKey} className="text-center">
                  <div>{format(parseISO(dayKey), "EE", { locale: ru }).replace(".", "")}</div>
                  <div className="font-mono normal-case tracking-normal">{format(parseISO(dayKey), "d")}</div>
                </div>
              ))}
              <div />
            </div>

            {visibleGroups.map((groupDayKey) => (
              <section key={groupDayKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink">
                    {formatGroupLabel(groupDayKey)}
                  </div>
                  <div className="h-px flex-1 bg-line" />
                </div>

                {tasksByDay[groupDayKey].length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-line bg-canvas/60 px-4 py-5 text-sm text-muted">
                    На этот день задач пока нет.
                  </div>
                ) : (
                  tasksByDay[groupDayKey].map((task) => (
                    <div
                      key={task.id}
                      className="grid grid-cols-[44px_minmax(260px,1fr)_42px_64px_64px_repeat(7,32px)_32px] items-center gap-2 rounded-[24px] border border-line bg-canvas/70 px-2 py-3"
                    >
                      <div className="text-center font-mono text-sm text-muted">
                        {week.tasks.findIndex((item) => item.id === task.id) + 1}
                      </div>
                      <input
                        className="field-base px-4 py-2 text-sm"
                        onChange={(event) => updateTask(weekKey, task.id, "title", event.target.value)}
                        placeholder="Новая задача..."
                        value={task.title}
                      />
                      <button
                        aria-label={task.isPriority ? "Снять приоритет" : "Сделать приоритетной"}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border text-base transition-colors",
                          task.isPriority
                            ? "border-priority bg-priority/15 text-priority"
                            : "border-line bg-paper text-muted hover:border-priority hover:text-priority",
                        )}
                        onClick={() => updateTask(weekKey, task.id, "isPriority", !task.isPriority)}
                        type="button"
                      >
                        •
                      </button>
                      <input
                        className="field-base px-2 py-2 text-center font-mono text-sm"
                        min={0}
                        onChange={(event) => updateTask(weekKey, task.id, "ti", Number(event.target.value))}
                        type="number"
                        value={task.ti}
                      />
                      <input
                        className="field-base px-2 py-2 text-center font-mono text-sm"
                        min={0}
                        onChange={(event) => updateTask(weekKey, task.id, "fa", Number(event.target.value))}
                        type="number"
                        value={task.fa}
                      />
                      {dayKeys.map((dayKey, dayIndex) => {
                        const cellState = getTaskCellState(task, dayIndex, dayKeys);

                        return (
                          <StatusCell
                            key={`${task.id}-${dayKey}`}
                            isInteractive={cellState.isInteractive}
                            onClick={() => cycleTaskStatus(weekKey, task.id, dayKey)}
                            status={cellState.status}
                          />
                        );
                      })}
                      <button
                        aria-label={`Удалить ${task.title || "задачу"}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-danger hover:text-danger"
                        onClick={() =>
                          setPendingDelete({
                            countdown: 5,
                            taskId: task.id,
                            taskTitle: task.title,
                          })
                        }
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </section>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-[20px] border border-ink bg-ink px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent"
            onClick={() => startTransition(() => addTask(weekKey))}
            type="button"
          >
            + Добавить строку
          </button>
        </div>
      </div>

      {pendingDelete ? (
        <DeleteDialog
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteTask(weekKey, pendingDelete.taskId);
            setPendingDelete(null);
          }}
          state={pendingDelete}
        />
      ) : null}
    </>
  );
}
