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
// Description: Per-task Google Calendar sync dialog — full-screen modal mirroring HabitScheduleDialog.
const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function TaskScheduleDialog({
  task,
  weekKey,
  onClose,
}: {
  task: WeekTask;
  weekKey: string;
  onClose: () => void;
}) {
  const connections = useAppStore((state) => state.calendarConnections);
  const exportTaskToGoogle = useAppStore((state) => state.exportTaskToGoogle);
  const unlinkTaskFromGoogle = useAppStore((state) => state.unlinkTaskFromGoogle);
  const updateTaskEventTime = useAppStore((state) => state.updateTaskEventTime);
  const googleConnections = connections.filter((c) => c.provider === "google" && c.status === "active");
  const isLinked = Boolean(task.calendarConnectionId);

  const [startsHhmm, setStartsHhmm] = useState(() =>
    task.linkedEventTime ? task.linkedEventTime.startsAt.slice(11, 16) : "",
  );
  const [endsHhmm, setEndsHhmm] = useState(() =>
    task.linkedEventTime ? task.linkedEventTime.endsAt.slice(11, 16) : "",
  );
  const [selectedConnectionId, setSelectedConnectionId] = useState(googleConnections[0]?.id ?? "");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="paper-panel w-full max-w-md rounded-[32px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Синхронизация с Google</div>
        <h3 className="mt-3 break-words text-xl font-semibold text-ink">
          {task.title || "Без названия"}
        </h3>

        {isLinked && task.linkedEventTime && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-accent tabular-nums focus:border-accent focus:outline-none"
                type="time"
                value={startsHhmm}
                onChange={(e) => setStartsHhmm(e.target.value)}
              />
              <span className="text-sm text-muted">–</span>
              <input
                className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-accent tabular-nums focus:border-accent focus:outline-none"
                type="time"
                value={endsHhmm}
                onChange={(e) => setEndsHhmm(e.target.value)}
              />
            </div>
            <button
              className="w-full rounded-[20px] border border-accent bg-accent/10 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
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

        {isLinked && (
          <button
            className="mt-3 w-full rounded-[20px] border border-danger/40 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
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
        )}

        {!isLinked && googleConnections.length === 0 && (
          <p className="mt-4 text-sm text-muted">Нет подключённых Google аккаунтов</p>
        )}

        {!isLinked && googleConnections.length > 0 && (
          <div className="mt-4 space-y-3">
            {googleConnections.length > 1 && (
              <select
                className="field-base w-full px-2 py-1 text-sm"
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
              >
                {googleConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.accountLabel ?? c.providerAccountLabel ?? c.id}
                  </option>
                ))}
              </select>
            )}
            <div className="space-y-1">
              <div className="text-xs text-muted">Время события (необязательно)</div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-accent tabular-nums focus:border-accent focus:outline-none"
                  type="time"
                  value={startsHhmm}
                  onChange={(e) => setStartsHhmm(e.target.value)}
                />
                <span className="text-sm text-muted">–</span>
                <input
                  className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-accent tabular-nums focus:border-accent focus:outline-none"
                  type="time"
                  value={endsHhmm}
                  onChange={(e) => setEndsHhmm(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted">Оставьте пустым — событие займёт весь день</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted">Повторение (необязательно)</div>
              <div className="flex flex-wrap gap-1">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const day = idx + 1;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-line bg-paper text-muted hover:border-accent hover:text-accent",
                      )}
                      disabled={busy}
                      onClick={() =>
                        setSelectedDays((current) =>
                          isSelected ? current.filter((d) => d !== day) : [...current, day],
                        )
                      }
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted">Не выбрано — разовое событие</div>
            </div>
            <button
              className="w-full rounded-[20px] border border-accent bg-accent/10 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
              disabled={busy || !selectedConnectionId}
              onClick={async () => {
                setBusy(true);
                await exportTaskToGoogle(weekKey, task.id, selectedConnectionId, {
                  scheduleDays: selectedDays.length > 0 ? selectedDays : undefined,
                  startsHhmm: startsHhmm || undefined,
                  endsHhmm: endsHhmm || undefined,
                });
                setBusy(false);
                onClose();
              }}
              type="button"
            >
              Добавить в Google Calendar
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
// BLOCK-END: WEEK_PLANNER_TASK_SCHEDULE_DIALOG

// BLOCK-START: WEEK_PLANNER_TASK_CALENDAR_EXPORT_MODAL
// Description: Bulk export modal — list of tasks with checkboxes, mirrors CalendarBulkImportModal.
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

  const [rows, setRows] = useState(() => exportableTasks.map((t) => ({ task: t, checked: true, startsHhmm: "", endsHhmm: "" })));
  const [selectedConnectionId, setSelectedConnectionId] = useState(googleConnections[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkedCount = rows.filter((r) => r.checked).length;

  async function handleExport() {
    const selected = rows.filter((r) => r.checked);
    if (selected.length === 0 || !selectedConnectionId) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.allSettled(
        selected.map((r) =>
          exportTaskToGoogle(weekKey, r.task.id, selectedConnectionId, {
            startsHhmm: r.startsHhmm || undefined,
            endsHhmm: r.endsHhmm || undefined,
          }),
        ),
      );
      onClose();
    } catch {
      setError("Не удалось добавить некоторые задачи.");
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <div
        aria-modal="true"
        className="paper-panel flex w-full max-w-2xl flex-col rounded-[32px]"
        style={{ maxHeight: "85vh" }}
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div>
            <div className="text-base font-semibold leading-snug text-ink">Добавить задачи в Google Calendar</div>
            {googleConnections.length > 1 && (
              <select
                className="field-base mt-2 px-2 py-1 text-sm"
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                disabled={busy}
              >
                {googleConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.accountLabel ?? c.providerAccountLabel ?? c.id}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink disabled:opacity-50"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Task list */}
        {googleConnections.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted">Нет подключённых Google аккаунтов</p>
        ) : exportableTasks.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted">Все задачи уже добавлены в Google Calendar</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-2 pb-2">
                {rows.map((row) => (
                  <div
                    key={row.task.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border border-line bg-canvas/50 px-4 py-3"
                  >
                    <label className="flex items-center justify-center">
                      <input
                        checked={row.checked}
                        className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                        disabled={busy}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((entry) =>
                              entry.task.id === row.task.id
                                ? { ...entry, checked: e.target.checked }
                                : entry,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {row.task.title || "Без названия"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {format(parseISO(row.task.startDayKey), "EEE, d MMM", { locale: ru })}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-accent tabular-nums focus:border-accent focus:outline-none"
                          disabled={busy}
                          onChange={(e) =>
                            setRows((current) =>
                              current.map((r) =>
                                r.task.id === row.task.id ? { ...r, startsHhmm: e.target.value } : r,
                              ),
                            )
                          }
                          type="time"
                          value={row.startsHhmm}
                        />
                        <span className="text-xs text-muted">–</span>
                        <input
                          className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-accent tabular-nums focus:border-accent focus:outline-none"
                          disabled={busy}
                          onChange={(e) =>
                            setRows((current) =>
                              current.map((r) =>
                                r.task.id === row.task.id ? { ...r, endsHhmm: e.target.value } : r,
                              ),
                            )
                          }
                          type="time"
                          value={row.endsHhmm}
                        />
                        <span className="text-xs text-muted/60">необязательно</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 pb-6 pt-4">
              {error && <div className="mb-3 text-sm text-danger">{error}</div>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted">
                  {checkedCount > 0 ? `Будет добавлено: ${checkedCount}` : "Выберите хотя бы одну задачу."}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                    disabled={busy}
                    onClick={onClose}
                    type="button"
                  >
                    Отмена
                  </button>
                  <button
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={checkedCount === 0 || busy || !selectedConnectionId}
                    onClick={() => void handleExport()}
                    type="button"
                  >
                    {busy ? "Добавляем..." : `В Google Calendar (${checkedCount})`}
                  </button>
                </div>
              </div>
            </div>
          </>
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
          aria-label="Синхронизация с Google Calendar"
          className={cn(
            "mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-colors md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
            task.calendarConnectionId
              ? "border-accent text-accent opacity-100"
              : "border-line text-muted opacity-100 hover:border-accent hover:text-accent",
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
                  {hasGoogleConnection && (
                    <button
                      className={cn(
                        "flex-shrink-0 rounded-[18px] border px-3 py-2 text-sm font-medium transition-colors",
                        exportableCount > 0
                          ? "border-accent/50 bg-paper text-accent hover:bg-accent/10"
                          : "cursor-default border-line bg-paper text-muted",
                      )}
                      disabled={exportableCount === 0}
                      onClick={() => exportableCount > 0 && setShowExportModal(true)}
                      type="button"
                    >
                      {exportableCount > 0
                        ? `В Google Calendar (${exportableCount})`
                        : "Все задачи в Google Calendar"}
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
            {hasGoogleConnection && (
              <button
                className={cn(
                  "rounded-[18px] border px-4 py-2.5 text-sm font-medium transition-colors",
                  exportableCount > 0
                    ? "border-accent/50 text-accent hover:bg-accent/10"
                    : "cursor-default border-line text-muted",
                )}
                disabled={exportableCount === 0}
                onClick={() => exportableCount > 0 && setShowExportModal(true)}
                type="button"
              >
                {exportableCount > 0
                  ? `В Google Calendar (${exportableCount})`
                  : "Все задачи в Google Calendar"}
              </button>
            )}
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
