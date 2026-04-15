"use client";

import Link from "next/link";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { startTransition, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type MetricName,
  type MonthData,
  type TaskStatus,
  type WeekData,
  type WeekTask,
} from "@/lib/planner-types";
import { getMonthKey } from "@/lib/dates";
import { getLastTaskStatus, getTaskCellState, getWeekDayKeys } from "@/lib/week-tasks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { AnxietyMetricIcon, HeartMetricIcon, ProductivityMetricIcon } from "@/components/ui/icons";

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
  title: string;
};

// BLOCK-START: WEEK_PLANNER_LAYOUT_CONSTANTS
// Description: Shared layout dimensions for the week grid and status controls.
const DAY_COLUMN_WIDTH = 40;
const PRIORITY_COLUMN_WIDTH = 40;
const STATUS_BUTTON_SIZE = 32;
const DAY_SECTION_WIDTH = DAY_COLUMN_WIDTH * 7;
const ALTERNATING_DAY_INDICES = [0, 2, 4, 6] as const;
const boardColumns = `repeat(7, ${DAY_COLUMN_WIDTH}px) minmax(200px, 1fr) ${PRIORITY_COLUMN_WIDTH}px`;
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
    return "✓";
  }

  if (status === "moved") {
    return "→";
  }

  if (status === "failed") {
    return "✕";
  }

  return "·";
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
    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted sm:flex sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-success-dark bg-success/10 text-[10px] text-success-dark">
          ✓
        </span>
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
        <h3 className="mt-3 break-all text-2xl font-semibold text-ink">{state.taskTitle || "Пустая задача"}</h3>
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
  const wrapperClassName = getDayCellClass(isLastDay, "flex items-center justify-center");

  if (state.variant === "hidden") {
    if (!onMoveStart) {
      return <div className={wrapperClassName} />;
    }

    return (
      <div className={wrapperClassName}>
        <button
          aria-label="Начать задачу с этого дня"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-muted/25 transition-colors hover:bg-canvas hover:text-muted"
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
          state.status === "done" && "border-success-dark bg-success/10 text-success-dark",
          state.status === "moved" && "border-accent bg-accent/10 text-accent",
          state.status === "failed" && "border-danger bg-danger/10 text-danger",
          state.status === "planned" &&
            (state.isAwaitingTransfer
              ? "border-accent bg-paper text-accent"
              : "border-accent/50 bg-accent/5 text-accent"),
        )}
        onClick={onClick}
        style={{ height: STATUS_BUTTON_SIZE, width: STATUS_BUTTON_SIZE }}
        type="button"
      >
        {state.status ? statusSymbol(state.status) : ""}
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
  isScheduledDay,
}: {
  dayKey: string;
  habitId: string;
  isCompleted: boolean;
  isFuture: boolean;
  isLastDay: boolean;
  monthKey: string;
  isScheduledDay: boolean;
}) {
  const toggleHabitDay = useAppStore((state) => state.toggleHabitDay);
  const isDisabled = !isScheduledDay || isFuture;
  const showCompleted = isScheduledDay && isCompleted;

  return (
    <div className={getDayCellClass(isLastDay, "flex items-start justify-center pt-1")}>
      <button
        className={cn(
          "flex items-center justify-center rounded-[10px] border text-sm transition-colors",
          showCompleted
            ? "border-success bg-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "border-line bg-paper hover:border-accent hover:bg-canvas",
          isDisabled && "pointer-events-none opacity-35",
        )}
        disabled={isDisabled}
        onClick={() => toggleHabitDay(monthKey, habitId, dayKey)}
        style={{ height: STATUS_BUTTON_SIZE, width: STATUS_BUTTON_SIZE }}
        type="button"
      >
        {showCompleted ? <span className="text-sm leading-none text-white">■</span> : null}
      </button>
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
  scheduleDays,
  weekDayKeys,
}: {
  habitId: string;
  habitLogs: string[];
  habitName: string;
  monthKey: string;
  scheduleDays?: number[];
  weekDayKeys: string[];
}) {
  return (
    <div
      className="relative z-10 grid items-stretch border-t border-line/40"
      style={{ gridTemplateColumns: boardColumns }}
    >
      {weekDayKeys.map((dayKey, dayIndex) => (
        (() => {
          const dayOfWeek = parseISO(dayKey).getDay();
          const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
          const isScheduledDay = !scheduleDays?.length || scheduleDays.includes(isoDay);

          return (
            <HabitCell
              key={`${habitId}-${dayKey}`}
              dayKey={dayKey}
              habitId={habitId}
              isCompleted={isScheduledDay && habitLogs.includes(dayKey)}
              isFuture={isAfter(startOfDay(parseISO(dayKey)), startOfDay(new Date()))}
              isLastDay={dayIndex === weekDayKeys.length - 1}
              isScheduledDay={isScheduledDay}
              monthKey={monthKey}
            />
          );
        })()
      ))}
      <div className="flex min-h-10 items-center border-r border-line px-3 py-1.5 text-sm text-ink" title={habitName || "Без названия"}>
        <span className="truncate">{habitName || "Без названия"}</span>
      </div>
      <PlaceholderCell />
    </div>
  );
}
// BLOCK-END: WEEK_PLANNER_AUX_COMPONENTS

// BLOCK-START: WEEK_PLANNER_TASK_SCHEDULE_DIALOG
// Description: Per-task Google Calendar sync dialog — export, unlink, and event time edit.
function TaskScheduleDialog({
  task,
  weekKey,
  onClose,
  anchorRef,
}: {
  task: WeekTask;
  weekKey: string;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const connections = useAppStore((state) => state.calendarConnections);
  const exportTaskToGoogle = useAppStore((state) => state.exportTaskToGoogle);
  const unlinkTaskFromGoogle = useAppStore((state) => state.unlinkTaskFromGoogle);
  const updateTaskEventTime = useAppStore((state) => state.updateTaskEventTime);
  const googleConnections = connections.filter((c) => c.provider === "google" && c.status === "active");
  const isLinked = Boolean(task.calendarConnectionId);

  const [startsHhmm, setStartsHhmm] = useState(() => {
    if (!task.linkedEventTime) return "";
    return task.linkedEventTime.startsAt.slice(11, 16);
  });
  const [endsHhmm, setEndsHhmm] = useState(() => {
    if (!task.linkedEventTime) return "";
    return task.linkedEventTime.endsAt.slice(11, 16);
  });
  const [selectedConnectionId, setSelectedConnectionId] = useState(googleConnections[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  const anchor = anchorRef.current?.getBoundingClientRect();
  const top = anchor ? anchor.bottom + window.scrollY + 4 : 0;
  const left = anchor ? anchor.left + window.scrollX : 0;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 w-72 rounded-2xl border border-line bg-paper p-4 shadow-lg"
      style={{ top, left }}
    >
      <div className="mb-3 text-sm font-medium text-ink">Синхронизация с Google</div>

      {isLinked ? (
        <>
          {task.linkedEventTime && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-muted">Время события</div>
              <div className="flex items-center gap-2">
                <input
                  className="field-base w-full px-2 py-1 text-sm"
                  type="time"
                  value={startsHhmm}
                  onChange={(e) => setStartsHhmm(e.target.value)}
                />
                <span className="text-muted">–</span>
                <input
                  className="field-base w-full px-2 py-1 text-sm"
                  type="time"
                  value={endsHhmm}
                  onChange={(e) => setEndsHhmm(e.target.value)}
                />
              </div>
              <button
                className="w-full rounded-[14px] border border-accent bg-accent/10 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                disabled={busy || !startsHhmm || !endsHhmm}
                onClick={async () => {
                  setBusy(true);
                  await updateTaskEventTime(weekKey, task.id, startsHhmm, endsHhmm);
                  setBusy(false);
                  onClose();
                }}
                type="button"
              >
                Сохранить время
              </button>
            </div>
          )}
          <button
            className="w-full rounded-[14px] border border-danger/40 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await unlinkTaskFromGoogle(weekKey, task.id);
              setBusy(false);
              onClose();
            }}
            type="button"
          >
            Отвязать от Google
          </button>
        </>
      ) : (
        <>
          {googleConnections.length === 0 ? (
            <p className="text-xs text-muted">Нет подключённых Google аккаунтов</p>
          ) : (
            <div className="space-y-2">
              {googleConnections.length > 1 && (
                <select
                  className="field-base w-full px-2 py-1 text-sm"
                  value={selectedConnectionId}
                  onChange={(e) => setSelectedConnectionId(e.target.value)}
                >
                  {googleConnections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.providerAccountLabel ?? c.accountLabel ?? c.id}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="w-full rounded-[14px] border border-accent bg-accent/10 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                disabled={busy || !selectedConnectionId}
                onClick={async () => {
                  setBusy(true);
                  await exportTaskToGoogle(weekKey, task.id, selectedConnectionId);
                  setBusy(false);
                  onClose();
                }}
                type="button"
              >
                Добавить в Google Calendar
              </button>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
// BLOCK-END: WEEK_PLANNER_TASK_SCHEDULE_DIALOG

// BLOCK-START: WEEK_PLANNER_TASK_CALENDAR_EXPORT_MODAL
// Description: Bulk export modal — adds all non-linked week tasks to Google Calendar.
function TaskCalendarExportModal({
  tasks,
  weekKey,
  onClose,
}: {
  tasks: WeekTask[];
  weekKey: string;
  onClose: () => void;
}) {
  const connections = useAppStore((state) => state.calendarConnections);
  const exportTaskToGoogle = useAppStore((state) => state.exportTaskToGoogle);
  const googleConnections = connections.filter((c) => c.provider === "google" && c.status === "active");
  const exportableTasks = tasks.filter((t) => !t.calendarConnectionId && !t.id.startsWith("temp-"));
  const [selectedConnectionId, setSelectedConnectionId] = useState(googleConnections[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-xl">
        <div className="mb-4 text-sm font-medium text-ink">Экспорт задач в Google Calendar</div>

        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {exportableTasks.length - errors.length} задач добавлено.
              {errors.length > 0 && ` ${errors.length} ошибок.`}
            </p>
            <button
              className="w-full rounded-[14px] border border-line py-2 text-sm text-ink"
              onClick={onClose}
              type="button"
            >
              Закрыть
            </button>
          </div>
        ) : googleConnections.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Нет подключённых Google аккаунтов</p>
            <button className="w-full rounded-[14px] border border-line py-2 text-sm" onClick={onClose} type="button">
              Закрыть
            </button>
          </div>
        ) : exportableTasks.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Все задачи уже привязаны к Google Calendar</p>
            <button className="w-full rounded-[14px] border border-line py-2 text-sm" onClick={onClose} type="button">
              Закрыть
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {googleConnections.length > 1 && (
              <select
                className="field-base w-full px-2 py-1 text-sm"
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
              >
                {googleConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.providerAccountLabel ?? c.accountLabel ?? c.id}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted">{exportableTasks.length} задач будут добавлены в Google Calendar</p>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-[14px] border border-line py-2 text-sm text-ink"
                disabled={busy}
                onClick={onClose}
                type="button"
              >
                Отмена
              </button>
              <button
                className="flex-1 rounded-[14px] border border-accent bg-accent/10 py-2 text-sm text-accent disabled:opacity-50"
                disabled={busy || !selectedConnectionId}
                onClick={async () => {
                  setBusy(true);
                  const errs: string[] = [];
                  await Promise.allSettled(
                    exportableTasks.map((t) =>
                      exportTaskToGoogle(weekKey, t.id, selectedConnectionId).catch(() => {
                        errs.push(t.title || t.id);
                      }),
                    ),
                  );
                  setErrors(errs);
                  setBusy(false);
                  setDone(true);
                }}
                type="button"
              >
                {busy ? "Экспорт..." : "Добавить"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
// BLOCK-END: WEEK_PLANNER_TASK_CALENDAR_EXPORT_MODAL

// BLOCK-START: WEEK_PLANNER_TASK_ROW
// Description: Editable week task row with status cells, priority toggle, title editing, and delayed title persistence.
/**
 * function_contracts:
 *   TaskRow:
 *     description: "Renders one editable task row and coordinates debounced title persistence with store actions."
 *     preconditions:
 *       - "task belongs to weekKey and contains valid startDayKey/statusTrail data"
 *       - "dayKeys contains seven ISO dates for the visible week"
 *     postconditions:
 *       - "User edits are mirrored into local draft state immediately"
 *       - "Blur events schedule store updates for the title field"
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
    title: task.title,
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const gearButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft({
      title: task.title,
    });
  }, [task.title]);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current, 32);
  }, [draft.title]);

  useEffect(() => {
    function handleResize() {
      syncTextareaHeight(textareaRef.current, 32);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  function scheduleTitleSave(value: string) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      updateTask(weekKey, task.id, "title", value);
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

      <div className="flex min-h-10 items-start gap-2 border-r border-line px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <textarea
            ref={(element) => {
              textareaRef.current = element;
              registerInput(task.id, element);
              syncTextareaHeight(element, 36);
            }}
            className="field-base w-full resize-none overflow-hidden px-3 py-2 text-sm leading-5 text-ink outline-none placeholder:text-muted/60"
            onBlur={() => scheduleTitleSave(draft.title)}
            onChange={(event) => {
              setDraft((current) => ({ ...current, title: event.target.value }));
              syncTextareaHeight(event.currentTarget, 36);
            }}
            placeholder="Новая задача..."
            rows={1}
            value={draft.title}
          />
        </div>
        <button
          ref={gearButtonRef}
          aria-label="Синхронизация с Google Calendar"
          className={cn(
            "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs transition-colors md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
            task.calendarConnectionId
              ? "text-accent opacity-100"
              : "text-muted opacity-100 hover:bg-canvas hover:text-ink",
          )}
          onClick={() => setScheduleOpen((v) => !v)}
          type="button"
        >
          ⚙
        </button>
        <button
          aria-label={`Удалить задачу ${draft.title || "без названия"}`}
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm text-muted opacity-100 transition-colors hover:bg-danger/10 hover:text-danger md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          onClick={() => onDelete(task)}
          type="button"
        >
          ✕
        </button>
      </div>
      {scheduleOpen && (
        <TaskScheduleDialog
          anchorRef={gearButtonRef}
          task={task}
          weekKey={weekKey}
          onClose={() => setScheduleOpen(false)}
        />
      )}

      <div className={getRightColumnClass("flex items-center justify-center")}>
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

// BLOCK-START: WEEK_PLANNER_STATE_ROW
// Description: Single metric row (health/productivity/anxiety) with 7 day inputs and autosave via onBlur.
const stateMetrics: Array<{
  key: "health" | "productivity" | "anxiety";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "health", label: "Самочувствие", icon: HeartMetricIcon },
  { key: "productivity", label: "Продуктивность", icon: ProductivityMetricIcon },
  { key: "anxiety", label: "Тревожность", icon: AnxietyMetricIcon },
];

type MonthStateMap = Record<string, MonthData | undefined>;

function getDraftValue(months: MonthStateMap, dayKey: string, metricKey: MetricName): string {
  const date = parseISO(dayKey);
  const monthKey = getMonthKey(date.getFullYear(), date.getMonth() + 1);
  const entry = months[monthKey]?.dailyStates.find((state) => state.day === date.getDate());
  return entry && entry[metricKey] > 0 ? String(entry[metricKey]) : "";
}

function StateRow({
  dayKeys,
  icon: Icon,
  metricKey,
  label,
  months,
}: {
  dayKeys: string[];
  icon: React.ComponentType<{ className?: string }>;
  metricKey: "health" | "productivity" | "anxiety";
  label: string;
  months: MonthStateMap;
}) {
  const setDailyMetric = useAppStore((state) => state.setDailyMetric);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    dayKeys.forEach((dayKey) => {
      result[dayKey] = getDraftValue(months, dayKey, metricKey);
    });
    return result;
  });

  useEffect(() => {
    setDrafts(() => {
      const result: Record<string, string> = {};
      dayKeys.forEach((dayKey) => {
        result[dayKey] = getDraftValue(months, dayKey, metricKey);
      });
      return result;
    });
  }, [dayKeys, metricKey, months]);

  function commit(dayKey: string) {
    const raw = drafts[dayKey]?.trim() ?? "";
    const parsed = Number(raw);
    const date = parseISO(dayKey);
    const monthKey = getMonthKey(date.getFullYear(), date.getMonth() + 1);
    const dayNum = date.getDate();

    if (!raw || !Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      setDrafts((current) => ({
        ...current,
        [dayKey]: getDraftValue(months, dayKey, metricKey),
      }));
      return;
    }

    void setDailyMetric(monthKey, dayNum, metricKey, parsed);
  }

  return (
    <div
      className="relative z-10 grid items-center border-b border-line/40 last:border-b-0"
      style={{ gridTemplateColumns: boardColumns }}
    >
      {dayKeys.map((dayKey, dayIndex) => {
        const isFuture = isAfter(startOfDay(parseISO(dayKey)), startOfDay(new Date()));

        return (
          <div
            key={dayKey}
            className={getDayCellClass(dayIndex === dayKeys.length - 1, "flex items-center justify-center py-1.5")}
          >
            <input
              className={cn("field-base h-7 w-8 rounded-lg px-0 text-center text-xs", isFuture && "pointer-events-none opacity-35")}
              disabled={isFuture}
              inputMode="numeric"
              max={10}
              min={1}
              onBlur={() => commit(dayKey)}
              onChange={(event) => setDrafts((current) => ({ ...current, [dayKey]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              placeholder="—"
              type="number"
              value={drafts[dayKey] ?? ""}
            />
          </div>
        );
      })}
      <div className="flex min-h-10 items-center gap-2 border-r border-line px-3 py-1.5 text-sm text-ink">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate">{label}</span>
      </div>
      <div className={getRightColumnClass("flex items-center justify-center py-1.5")} />
    </div>
  );
}
// BLOCK-END: WEEK_PLANNER_STATE_ROW

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
  const months = useAppStore((state) => state.months);
  const month = months[monthKey];
  const connections = useAppStore((state) => state.calendarConnections);
  const hasGoogleConnection = connections.some((c) => c.provider === "google" && c.status === "active");
  const exportableCount = week.tasks.filter((t) => !t.calendarConnectionId && !t.id.startsWith("temp-")).length;
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const newTaskInputRef = useRef<HTMLInputElement | null>(null);
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
            <div className="relative w-full min-w-[680px] overflow-hidden rounded-[24px] border border-line bg-paper/80">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-0" style={{ width: `${DAY_SECTION_WIDTH}px` }}>
                {ALTERNATING_DAY_INDICES.filter((i) => i !== todayColumnIndex).map((dayIndex) => (
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
                <div className="h-12 border-r border-line" />
                <div className={getRightColumnClass("flex h-12 items-center justify-center")}>?</div>
              </div>
              {/* BLOCK-END: WEEK_BOARD_HEADER */}

              {/* HIDDEN: States section — temporarily hidden */}
              {/* HIDDEN: Habits section — temporarily hidden */}
              {/* BLOCK-START: WEEK_BOARD_TASK_GRID */}
              {/* Description: Habit rows and task rows rendered in the weekly grid with optimistic interactions. */}
              <div className="relative z-10 border-y border-line/70 bg-canvas/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Задачи
              </div>

              {week.tasks.map((task) => (
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
              ))}

              {/* BLOCK-START: WEEK_BOARD_ADD_TASK */}
              {/* Description: Grid-aligned add-task row (desktop only). Hidden on mobile — mobile form is outside the scroll container. */}
              <div
                className="relative z-10 hidden items-stretch border-t border-line/40 sm:grid"
                style={{ gridTemplateColumns: boardColumns }}
              >
                {dayKeys.map((dayKey, i) => (
                  <div key={`add-${dayKey}`} className={getDayCellClass(i === dayKeys.length - 1)} />
                ))}
                <div className="flex min-h-10 items-center gap-2 border-r border-line px-2 py-1.5">
                  <input
                    ref={newTaskInputRef}
                    className="field-base flex-1 px-3 py-2 text-sm leading-5"
                    maxLength={200}
                    onChange={(event) => setNewTaskText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        const title = newTaskText.trim();
                        if (!title) return;
                        setNewTaskText("");
                        startTransition(() => addTask(weekKey, title));
                        window.requestAnimationFrame(() => newTaskInputRef.current?.focus());
                      }
                    }}
                    placeholder="Новая задача..."
                    value={newTaskText}
                  />
                  <button
                    className="flex-shrink-0 rounded-[18px] border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                    onClick={() => {
                      const title = newTaskText.trim();
                      if (!title) return;
                      setNewTaskText("");
                      startTransition(() => addTask(weekKey, title));
                      window.requestAnimationFrame(() => newTaskInputRef.current?.focus());
                    }}
                    type="button"
                  >
                    + Добавить задачу
                  </button>
                  {hasGoogleConnection && exportableCount > 0 && (
                    <button
                      className="flex-shrink-0 rounded-[18px] border border-accent/50 bg-paper px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                      onClick={() => setShowExportModal(true)}
                      type="button"
                    >
                      В календарь ({exportableCount})
                    </button>
                  )}
                </div>
                <PlaceholderCell />
              </div>
              {/* BLOCK-END: WEEK_BOARD_ADD_TASK */}
              {/* BLOCK-END: WEEK_BOARD_TASK_GRID */}
            </div>
          </div>

          {/* Mobile add-task form — outside the horizontal scroll container */}
          <form
            className="mt-3 flex flex-col gap-2 sm:hidden"
            onSubmit={(event) => {
              event.preventDefault();
              const title = newTaskText.trim();
              if (!title) return;
              setNewTaskText("");
              startTransition(() => addTask(weekKey, title));
            }}
          >
            <input
              className="field-base flex-1 px-3 py-2 text-sm leading-5"
              maxLength={200}
              onChange={(event) => setNewTaskText(event.target.value)}
              placeholder="Новая задача..."
              value={newTaskText}
            />
            <button
              className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              type="submit"
            >
              + Добавить задачу
            </button>
          </form>
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
      {showExportModal && (
        <TaskCalendarExportModal
          tasks={week.tasks}
          weekKey={weekKey}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
// BLOCK-END: WEEK_PLANNER_BOARD_COMPONENT
// BLOCK-END: WEEK_PLANNER_BOARD_MODULE
