"use client";

import Link from "next/link";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { startTransition, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { TaskStatus, WeekData, WeekTask } from "@/lib/planner-types";
import { getLastTaskStatus, getTaskCellState, getWeekDayKeys } from "@/lib/week-tasks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

// BLOCK-START: WEEK_PLANNER_BOARD_MODULE
// Description: Interactive week planner board with habit tracking, task editing, optimistic UI actions, and delete confirmation flow.
type WeekPlannerBoardProps = {
  monthKey: string;
  monthNumber: number;
  monthYear: number;
  week: WeekData;
  weekKey: string;
};

type PendingDeleteState = {
  countdown: number;
  taskId: string;
  taskTitle: string;
};

type TaskDraft = {
  fa: string;
  ti: string;
  title: string;
};

// BLOCK-START: WEEK_PLANNER_LAYOUT_CONSTANTS
// Description: Shared layout dimensions for the week grid and status controls.
const DAY_COLUMN_WIDTH = 40;
const PRIORITY_COLUMN_WIDTH = 40;
const STATUS_BUTTON_SIZE = 32;
const DAY_SECTION_WIDTH = DAY_COLUMN_WIDTH * 7;
const ALTERNATING_DAY_INDICES = [0, 2, 4, 6] as const;
const boardColumns = `repeat(7, ${DAY_COLUMN_WIDTH}px) ${PRIORITY_COLUMN_WIDTH}px 56px 56px minmax(200px, 1fr)`;
// BLOCK-END: WEEK_PLANNER_LAYOUT_CONSTANTS

// BLOCK-START: WEEK_PLANNER_UI_HELPERS
// Description: Presentation helpers for textarea sizing, day labels, status symbols, and grid cell classes.
function syncTextareaHeight(element: HTMLTextAreaElement | null, minHeight = 28) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
}

function formatHeaderDay(dayKey: string): { day: string; label: string } {
  return {
    day: format(parseISO(dayKey), "EE", { locale: ru }).replace(".", ""),
    label: format(parseISO(dayKey), "d"),
  };
}

function statusSymbol(status: TaskStatus | "planned"): string {
  if (status === "done") {
    return "■";
  }

  if (status === "moved") {
    return "→";
  }

  if (status === "failed") {
    return "✕";
  }

  return "·";
}

function formatDraftNumber(value: number): string {
  return value > 0 ? String(value) : "";
}

function getDayCellClass(isLastDay: boolean, extra?: string) {
  return cn(
    "min-h-10 border-r border-line",
    isLastDay && "border-r-2 border-r-line",
    extra,
  );
}

function getRightColumnClass(extra?: string) {
  return cn("min-h-10 border-r border-line", extra);
}
// BLOCK-END: WEEK_PLANNER_UI_HELPERS

// BLOCK-START: WEEK_PLANNER_AUX_COMPONENTS
// Description: Supporting UI components for legends, dialogs, status cells, habit cells, placeholders, and simple skeletons.
function StatusLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-success bg-success text-[10px] text-white" />
        <span>Выполнено</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-accent bg-accent/10 text-[10px] text-accent">
          →
        </span>
        <span>Перенесена</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-danger bg-danger/10 text-[10px] text-danger">
          ✕
        </span>
        <span>Не выполнено</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-line bg-paper text-[10px] text-muted">
          ·
        </span>
        <span>Запланирована</span>
      </div>
    </div>
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
  return createPortal(
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
    </div>,
    document.body,
  );
}

function TaskStatusCell({
  isLastDay,
  onClick,
  onMoveStart,
  state,
}: {
  isLastDay: boolean;
  onClick: () => void;
  onMoveStart: (() => void) | null;
  state: ReturnType<typeof getTaskCellState>;
}) {
  const wrapperClassName = getDayCellClass(isLastDay, "flex items-start justify-center pt-1");

  if (state.variant === "hidden") {
    if (!onMoveStart) {
      return <div className={wrapperClassName} />;
    }

    return (
      <div className={wrapperClassName}>
        <button
          aria-label="Начать задачу с этого дня"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-muted/55 transition-colors hover:bg-canvas hover:text-muted"
          onClick={onMoveStart}
          type="button"
        >
          +
        </button>
      </div>
    );
  }

  if (state.variant === "muted") {
    return (
      <div className={wrapperClassName}>
        <div className="h-8 w-8 rounded-[10px] bg-canvas/90 opacity-35" />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <button
        className={cn(
          "flex items-center justify-center rounded-[10px] border text-sm transition-colors",
          state.status === "done" &&
            "border-success bg-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
          state.status === "moved" && "border-accent bg-accent/10 text-accent",
          state.status === "failed" && "border-danger bg-danger/10 text-danger",
          state.status === "planned" &&
            (state.isAwaitingTransfer ? "border-accent bg-paper text-accent" : "border-line bg-paper text-muted"),
          state.isInteractive &&
            state.status !== "done" &&
            "hover:border-accent hover:bg-canvas",
        )}
        onClick={onClick}
        style={{ height: STATUS_BUTTON_SIZE, width: STATUS_BUTTON_SIZE }}
        type="button"
      >
        {state.status && state.status !== "done" ? statusSymbol(state.status) : ""}
      </button>
    </div>
  );
}

function HabitCell({
  dayKey,
  habitId,
  isCompleted,
  isFuture,
  isLastDay,
  monthKey,
}: {
  dayKey: string;
  habitId: string;
  isCompleted: boolean;
  isFuture: boolean;
  isLastDay: boolean;
  monthKey: string;
}) {
  const toggleHabitDay = useAppStore((state) => state.toggleHabitDay);

  return (
    <div className={getDayCellClass(isLastDay, "flex items-start justify-center pt-1")}>
      <button
        className={cn(
          "rounded-[10px] border transition-colors",
          isCompleted
            ? "border-success bg-success shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "border-line bg-paper hover:border-accent hover:bg-canvas",
          isFuture && "pointer-events-none opacity-35",
        )}
        disabled={isFuture}
        onClick={() => toggleHabitDay(monthKey, habitId, dayKey)}
        style={{ height: STATUS_BUTTON_SIZE, width: STATUS_BUTTON_SIZE }}
        type="button"
      />
    </div>
  );
}

function PlaceholderCell() {
  return <div aria-hidden="true" className={getRightColumnClass("pointer-events-none select-none")} />;
}

function HabitRow({
  habitId,
  habitName,
  habitLogs,
  monthKey,
  weekDayKeys,
}: {
  habitId: string;
  habitLogs: string[];
  habitName: string;
  monthKey: string;
  weekDayKeys: string[];
}) {
  return (
    <div
      className="relative z-10 grid items-stretch border-t border-line/40"
      style={{ gridTemplateColumns: boardColumns }}
    >
      {weekDayKeys.map((dayKey, dayIndex) => (
        <HabitCell
          key={`${habitId}-${dayKey}`}
          dayKey={dayKey}
          habitId={habitId}
          isCompleted={habitLogs.includes(dayKey)}
          isFuture={isAfter(startOfDay(parseISO(dayKey)), startOfDay(new Date()))}
          isLastDay={dayIndex === weekDayKeys.length - 1}
          monthKey={monthKey}
        />
      ))}
      <PlaceholderCell />
      <PlaceholderCell />
      <PlaceholderCell />
      <div className="flex min-h-10 items-center px-3 py-1.5 text-sm text-ink" title={habitName || "Без названия"}>
        <span className="truncate">{habitName || "Без названия"}</span>
      </div>
    </div>
  );
}
// BLOCK-END: WEEK_PLANNER_AUX_COMPONENTS

// BLOCK-START: WEEK_PLANNER_TASK_ROW
// Description: Editable week task row with status cells, priority, timings, title editing, and delayed persistence.
/**
 * function_contracts:
 *   TaskRow:
 *     description: "Renders one editable task row and coordinates debounced field persistence with store actions."
 *     preconditions:
 *       - "task belongs to weekKey and contains valid startDayKey/statusTrail data"
 *       - "dayKeys contains seven ISO dates for the visible week"
 *     postconditions:
 *       - "User edits are mirrored into local draft state immediately"
 *       - "Blur events schedule store updates for title, Ti, and Fa fields"
 *       - "Delete action forwards the current task to the parent callback"
 */
function TaskRow({
  dayKeys,
  onDelete,
  registerInput,
  task,
  weekKey,
}: {
  dayKeys: string[];
  onDelete: (task: WeekTask) => void;
  registerInput: (taskId: string, element: HTMLTextAreaElement | null) => void;
  task: WeekTask;
  weekKey: string;
}) {
  const cycleTaskStatus = useAppStore((state) => state.cycleTaskStatus);
  const setTaskStartDay = useAppStore((state) => state.setTaskStartDay);
  const updateTask = useAppStore((state) => state.updateTask);
  const lastStatus = getLastTaskStatus(task);
  const isTaskFinal = lastStatus === "done" || lastStatus === "failed" || lastStatus === "moved";
  const [draft, setDraft] = useState<TaskDraft>({
    fa: formatDraftNumber(task.fa),
    ti: formatDraftNumber(task.ti),
    title: task.title,
  });
  const saveTimersRef = useRef<Record<keyof TaskDraft, number | undefined>>({
    fa: undefined,
    ti: undefined,
    title: undefined,
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft({
      fa: formatDraftNumber(task.fa),
      ti: formatDraftNumber(task.ti),
      title: task.title,
    });
  }, [task.fa, task.ti, task.title]);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current, 32);
  }, [draft.title]);

  useEffect(
    () => () => {
      Object.values(saveTimersRef.current).forEach((timer) => {
        if (timer) {
          window.clearTimeout(timer);
        }
      });
    },
    [],
  );

  function scheduleSave(field: keyof TaskDraft, value: string) {
    if (saveTimersRef.current[field]) {
      window.clearTimeout(saveTimersRef.current[field]);
    }

    saveTimersRef.current[field] = window.setTimeout(() => {
      if (field === "title") {
        updateTask(weekKey, task.id, "title", value);
        return;
      }

      updateTask(weekKey, task.id, field, Math.min(999, Math.max(0, Number(value || 0))));
    }, 800);
  }

  return (
    <div
      className="group relative z-10 grid items-stretch border-t border-line/60"
      style={{ gridTemplateColumns: boardColumns }}
    >
      {dayKeys.map((dayKey, dayIndex) => (
        <TaskStatusCell
          key={`${task.id}-${dayKey}`}
          isLastDay={dayIndex === dayKeys.length - 1}
          onClick={() => cycleTaskStatus(weekKey, task.id, dayKey)}
          onMoveStart={isTaskFinal ? null : () => setTaskStartDay(weekKey, task.id, dayKey)}
          state={getTaskCellState(task, dayIndex, dayKeys)}
        />
      ))}

      <div className={getRightColumnClass("flex items-start justify-center pt-1.5")}>
        <button
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors",
            task.isPriority
              ? "border-priority bg-priority/15 text-priority"
              : "border-line bg-paper text-muted/55 hover:border-priority hover:text-priority",
          )}
          onClick={() => updateTask(weekKey, task.id, "isPriority", !task.isPriority)}
          type="button"
        >
          •
        </button>
      </div>

      <div className={getRightColumnClass("flex items-start justify-center px-1 pt-1")}>
        <input
          className="ti-input h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-center text-sm text-ink outline-none transition-colors placeholder:text-muted/55 focus:border-line focus:bg-paper"
          inputMode="numeric"
          max={999}
          min={0}
          onBlur={() => scheduleSave("ti", draft.ti)}
          onChange={(event) => setDraft((current) => ({ ...current, ti: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder="—"
          type="number"
          value={draft.ti}
        />
      </div>

      <div className={getRightColumnClass("flex items-start justify-center px-1 pt-1")}>
        <input
          className="fa-input h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-center text-sm text-ink outline-none transition-colors placeholder:text-muted/55 focus:border-line focus:bg-paper"
          inputMode="numeric"
          max={999}
          min={0}
          onBlur={() => scheduleSave("fa", draft.fa)}
          onChange={(event) => setDraft((current) => ({ ...current, fa: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder="—"
          type="number"
          value={draft.fa}
        />
      </div>

      <div className="flex min-h-10 items-start gap-2 px-2 py-1">
        <textarea
          ref={(element) => {
            textareaRef.current = element;
            registerInput(task.id, element);
            syncTextareaHeight(element, 32);
          }}
          className="min-h-8 w-full resize-none overflow-hidden border-0 border-b border-transparent bg-transparent px-0 py-0 text-sm leading-7 text-ink outline-none placeholder:text-muted/60 focus:border-accent"
          onBlur={() => scheduleSave("title", draft.title)}
          onChange={(event) => {
            setDraft((current) => ({ ...current, title: event.target.value }));
            syncTextareaHeight(event.currentTarget, 32);
          }}
          placeholder="Новая задача..."
          rows={1}
          value={draft.title}
        />
        <button
          aria-label={`Удалить задачу ${draft.title || "без названия"}`}
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm text-muted opacity-100 transition-colors hover:bg-danger/10 hover:text-danger md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          onClick={() => onDelete(task)}
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
// BLOCK-END: WEEK_PLANNER_TASK_ROW

// BLOCK-START: WEEK_PLANNER_HABIT_SKELETONS
// Description: Placeholder rows shown while month habit data is loading.
function HabitSkeletonRows({ count }: { count: number }) {
  return (
    <div className="relative z-10 space-y-2 px-4 py-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`habit-skeleton-${index}`} className="h-9 animate-pulse rounded-[8px] bg-line/50" />
      ))}
    </div>
  );
}
// BLOCK-END: WEEK_PLANNER_HABIT_SKELETONS

// BLOCK-START: WEEK_PLANNER_BOARD_COMPONENT
// Description: Main week planner board that orchestrates habit loading, task rendering, and destructive action confirmation.
/**
 * function_contracts:
 *   WeekPlannerBoard:
 *     description: "Renders the full week planner board and wires store-backed interactions for habits and tasks."
 *     preconditions:
 *       - "week contains week startDate, tasks, and reflection data for weekKey"
 *       - "monthKey/monthYear/monthNumber identify the month that owns visible habits"
 *     postconditions:
 *       - "Triggers habit fetch when month habits are missing"
 *       - "Focuses newly created task title when addTask is requested"
 *       - "Shows delete confirmation dialog before removing a task"
 */
export function WeekPlannerBoard({
  monthKey,
  monthNumber,
  monthYear,
  week,
  weekKey,
}: WeekPlannerBoardProps) {
  const addTask = useAppStore((state) => state.addTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const fetchMonthHabits = useAppStore((state) => state.fetchMonthHabits);
  const habitLoadState = useAppStore((state) => state.habitLoadStates[monthKey]);
  const month = useAppStore((state) => state.months[monthKey]);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const shouldFocusNewTaskRef = useRef(false);
  const previousTaskCountRef = useRef(week.tasks.length);
  const titleInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const dayKeys = getWeekDayKeys(week.startDate);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const habits = month?.habits;
  const habitLogs = month?.habitLogs;
  const habitLoadStatus = typeof habits !== "undefined" ? "ready" : habitLoadState?.status ?? "idle";
  const skeletonRowCount = habitLoadState?.lastKnownCount ?? 3;
  const todayColumnIndex = dayKeys.indexOf(todayKey);

  useEffect(() => {
    if (typeof habits !== "undefined" || habitLoadStatus === "loading" || habitLoadStatus === "error") {
      return;
    }

    void fetchMonthHabits(monthYear, monthNumber);
  }, [fetchMonthHabits, habitLoadStatus, habits, monthNumber, monthYear]);

  useEffect(() => {
    if (week.tasks.length <= previousTaskCountRef.current) {
      previousTaskCountRef.current = week.tasks.length;
      return;
    }

    if (!shouldFocusNewTaskRef.current) {
      previousTaskCountRef.current = week.tasks.length;
      return;
    }

    const lastTask = week.tasks[week.tasks.length - 1];
    const frame = window.requestAnimationFrame(() => {
      titleInputRefs.current[lastTask.id]?.focus();
      titleInputRefs.current[lastTask.id]?.select();
      shouldFocusNewTaskRef.current = false;
    });

    previousTaskCountRef.current = week.tasks.length;
    return () => window.cancelAnimationFrame(frame);
  }, [week.tasks]);

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
      {/* BLOCK-START: WEEK_PLANNER_BOARD_ROOT */}
      {/* Description: Root composition of the week planner board, combining header, grids, and add-task affordance. */}
      <div>
        <article className="paper-panel w-full max-w-full rounded-[32px] p-4 sm:p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">Привычки и задачи недели</div>

          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <div className="relative w-full min-w-[680px] rounded-[24px] border border-line bg-paper/80">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-0" style={{ width: `${DAY_SECTION_WIDTH}px` }}>
                {ALTERNATING_DAY_INDICES.map((dayIndex) => (
                  <div
                    key={`alt-day-${dayIndex}`}
                    className="absolute inset-y-0"
                    style={{
                      left: `${dayIndex * DAY_COLUMN_WIDTH}px`,
                      width: `${DAY_COLUMN_WIDTH}px`,
                      backgroundColor: "rgb(var(--success) / 0.09)",
                    }}
                  />
                ))}
                {todayColumnIndex >= 0 ? (
                  <div
                    className="absolute inset-y-0"
                    style={{
                      left: `${todayColumnIndex * DAY_COLUMN_WIDTH}px`,
                      width: `${DAY_COLUMN_WIDTH}px`,
                      backgroundColor: "rgb(var(--accent) / 0.1)",
                    }}
                  />
                ) : null}
              </div>

              {/* BLOCK-START: WEEK_BOARD_HEADER */}
              {/* Description: Week header grid with weekday labels and links to day pages. */}
              <div
                className="relative z-10 grid items-stretch border-b border-line/70 text-[11px] text-muted"
                style={{ gridTemplateColumns: boardColumns }}
              >
                {dayKeys.map((dayKey, dayIndex) => {
                  const header = formatHeaderDay(dayKey);
                  const headerDate = parseISO(dayKey);
                  const dayHref = `/day/${headerDate.getFullYear()}/${headerDate.getMonth() + 1}/${headerDate.getDate()}`;

                  return (
                    <div
                      key={dayKey}
                      className={getDayCellClass(dayIndex === dayKeys.length - 1, "flex h-12 flex-col items-center justify-center")}
                    >
                      <Link className="flex h-full w-full flex-col items-center justify-center transition-colors hover:text-accent" href={dayHref}>
                        <div>{header.day}</div>
                        <div className="font-mono normal-case tracking-normal">{header.label}</div>
                      </Link>
                    </div>
                  );
                })}
                <div className={getRightColumnClass("flex h-12 items-center justify-center")}>?</div>
                <div className={getRightColumnClass("flex h-12 items-center justify-center")}>Ti</div>
                <div className={getRightColumnClass("flex h-12 items-center justify-center")}>Fa</div>
                <div className="h-12" />
              </div>
              {/* BLOCK-END: WEEK_BOARD_HEADER */}

              <div className="relative z-10 border-b border-line/70 bg-canvas/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Привычки
              </div>

              {habitLoadStatus === "error" && typeof habits === "undefined" ? (
                <div className="relative z-10 px-4 py-3 text-sm text-muted">
                  Не удалось загрузить привычки.
                  <button
                    className="ml-1 text-accent transition-colors hover:text-ink"
                    onClick={() => void fetchMonthHabits(monthYear, monthNumber)}
                    type="button"
                  >
                    Повторить →
                  </button>
                </div>
              ) : null}

              {(habitLoadStatus === "idle" || habitLoadStatus === "loading") && typeof habits === "undefined" ? (
                <HabitSkeletonRows count={skeletonRowCount} />
              ) : null}

              {Array.isArray(habits) && habits.length === 0 ? (
                <div className="relative z-10 px-4 py-4 text-sm text-muted">
                  Привычки не заданы.
                  <Link className="ml-1 text-accent" href={`/month/${monthYear}/${monthNumber}`}>
                    Перейти к месяцу
                  </Link>
                </div>
              ) : null}

              {Array.isArray(habits)
                ? habits.map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habitId={habit.id}
                      habitLogs={habitLogs?.[habit.id] ?? []}
                      habitName={habit.name}
                      monthKey={monthKey}
                      weekDayKeys={dayKeys}
                    />
                  ))
                : null}

              <div className="relative z-10 h-px bg-line" />
              {/* BLOCK-START: WEEK_BOARD_TASK_GRID */}
              {/* Description: Habit rows and task rows rendered in the weekly grid with optimistic interactions. */}
              <div className="relative z-10 border-y border-line/70 bg-canvas/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Задачи
              </div>

              {week.tasks.length === 0 ? (
                <div className="relative z-10 px-4 py-4 text-sm text-muted">Задач на эту неделю пока нет.</div>
              ) : (
                week.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    dayKeys={dayKeys}
                    onDelete={(currentTask) =>
                      setPendingDelete({
                        countdown: 5,
                        taskId: currentTask.id,
                        taskTitle: currentTask.title,
                      })
                    }
                    registerInput={(taskId, element) => {
                      titleInputRefs.current[taskId] = element;
                    }}
                    task={task}
                    weekKey={weekKey}
                  />
                ))
              )}
              {/* BLOCK-END: WEEK_BOARD_TASK_GRID */}
            </div>
          </div>

          {/* BLOCK-START: WEEK_BOARD_ADD_TASK */}
          {/* Description: Inline affordance for appending a new task row and focusing its title field. */}
          <div className="mt-2 flex justify-end">
            <button
              className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-canvas hover:text-accent"
              onClick={() => {
                shouldFocusNewTaskRef.current = true;
                startTransition(() => addTask(weekKey));
              }}
              type="button"
            >
              + Добавить строку
            </button>
          </div>
          {/* BLOCK-END: WEEK_BOARD_ADD_TASK */}
        </article>

        <StatusLegend />
      </div>
      {/* BLOCK-END: WEEK_PLANNER_BOARD_ROOT */}

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
// BLOCK-END: WEEK_PLANNER_BOARD_COMPONENT
// BLOCK-END: WEEK_PLANNER_BOARD_MODULE
