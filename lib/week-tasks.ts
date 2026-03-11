import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

import type { TaskStatus, WeekTask } from "@/lib/planner-types";

export type TaskCellState = {
  status: TaskStatus | "planned" | null;
  isInteractive: boolean;
  isAwaitingTransfer: boolean;
  variant: "hidden" | "normal" | "muted";
};

const taskStatusOrder: Array<TaskStatus | "planned"> = ["planned", "done", "moved", "failed"];

export function getWeekDayKeys(startDate: string): string[] {
  const weekStart = parseISO(startDate);
  return Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), "yyyy-MM-dd"));
}

export function getTaskStartIndex(task: WeekTask, dayKeys: readonly string[]): number {
  return dayKeys.indexOf(task.startDayKey);
}

export function getLastTaskStatus(task: WeekTask): TaskStatus | null {
  return task.statusTrail.at(-1) ?? null;
}

export function isTaskClosed(task: WeekTask): boolean {
  const lastStatus = getLastTaskStatus(task);
  return lastStatus === "done" || lastStatus === "failed";
}

export function getEditableDayIndex(task: WeekTask, dayKeys: readonly string[]): number | null {
  const startIndex = getTaskStartIndex(task, dayKeys);

  if (startIndex === -1) {
    return null;
  }

  if (task.statusTrail.length === 0) {
    return startIndex;
  }

  const lastIndex = startIndex + task.statusTrail.length - 1;
  const lastStatus = getLastTaskStatus(task);

  if (lastStatus === "moved" && lastIndex < dayKeys.length - 1) {
    return lastIndex + 1;
  }

  return lastIndex;
}

export function getTaskCellState(
  task: WeekTask,
  dayIndex: number,
  dayKeys: readonly string[],
): TaskCellState {
  const startIndex = getTaskStartIndex(task, dayKeys);

  if (startIndex === -1 || dayIndex < startIndex) {
    return { status: null, isInteractive: false, isAwaitingTransfer: false, variant: "hidden" };
  }

  const relativeIndex = dayIndex - startIndex;
  const status = task.statusTrail[relativeIndex];

  if (typeof status !== "undefined") {
    return {
      status,
      isInteractive: true,
      isAwaitingTransfer: false,
      variant: "normal",
    };
  }

  const previousStatus = relativeIndex > 0 ? task.statusTrail[relativeIndex - 1] : null;
  const isStartDay = relativeIndex === 0;
  const isNextOpenDay = relativeIndex === task.statusTrail.length && (isStartDay || previousStatus === "moved");

  if (isNextOpenDay) {
    return {
      status: "planned",
      isInteractive: true,
      isAwaitingTransfer: previousStatus === "moved",
      variant: "normal",
    };
  }

  if (isTaskClosed(task) && dayIndex > startIndex + task.statusTrail.length - 1) {
    return { status: null, isInteractive: false, isAwaitingTransfer: false, variant: "muted" };
  }

  return { status: null, isInteractive: false, isAwaitingTransfer: false, variant: "hidden" };
}

export function cycleTaskAtDay(
  task: WeekTask,
  dayKey: string,
  dayKeys: readonly string[],
): WeekTask {
  const dayIndex = dayKeys.indexOf(dayKey);

  if (dayIndex === -1) {
    return task;
  }

  const startIndex = getTaskStartIndex(task, dayKeys);
  const relativeIndex = dayIndex - startIndex;

  if (startIndex === -1 || relativeIndex < 0) {
    return task;
  }

  const cellState = getTaskCellState(task, dayIndex, dayKeys);

  if (!cellState.isInteractive) {
    return task;
  }

  const currentStatus =
    typeof task.statusTrail[relativeIndex] !== "undefined" ? task.statusTrail[relativeIndex] : "planned";
  const nextStatus = taskStatusOrder[(taskStatusOrder.indexOf(currentStatus) + 1) % taskStatusOrder.length];
  const leftStatuses = task.statusTrail.slice(0, relativeIndex);

  if (nextStatus === "planned") {
    return {
      ...task,
      statusTrail: leftStatuses,
    };
  }

  return {
    ...task,
    statusTrail: [...leftStatuses, nextStatus],
  };
}

export function getTaskCreationDayKey(startDate: string): string {
  const weekStart = startOfDay(parseISO(startDate));
  const weekEnd = addDays(weekStart, 6);
  const today = startOfDay(new Date());

  if (isBefore(today, weekStart)) {
    return format(weekStart, "yyyy-MM-dd");
  }

  if (isAfter(today, weekEnd)) {
    return format(weekEnd, "yyyy-MM-dd");
  }

  return format(today, "yyyy-MM-dd");
}

export function shouldCarryTaskToNextWeek(task: WeekTask): boolean {
  return !isTaskClosed(task);
}
