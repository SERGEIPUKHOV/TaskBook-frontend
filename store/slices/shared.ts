import type { StateCreator } from "zustand";

import type { WeekEntryMeta } from "@/lib/planner-api";
import type {
  CalendarBulkImportSummary,
  CalendarConnection,
  CalendarEventImportPayload,
  CalendarEventImportResult,
  CalendarRangeData,
  CalendarTaskExportFeed,
  DailyState,
  GoogleCalendarOptionsState,
  MetricName,
  MonthData,
  WeekData,
} from "@/lib/planner-types";

export type ReflectionSection = "keyEvents" | "gratitudes";
export type HabitLoadStatus = "idle" | "loading" | "ready" | "error";
export type LoadStatus = "idle" | "loading" | "ready" | "error";
export type AddHabitResult =
  | { ok: true }
  | { ok: false; reason: "duplicate_name" | "empty_name" | "missing_month" };

export type HabitLoadState = {
  lastKnownCount: number;
  status: HabitLoadStatus;
};

export type TaskField = "title" | "ti" | "fa" | "isPriority" | "calendarExportEnabled" | "calendarExportBucket";

export type DailyStateEntry = {
  anxiety: number;
  date: string;
  health: number;
  id: string;
  productivity: number;
};

export type WeekEntryResponse = {
  content: string;
  created_at: string;
  date: string;
  id: string;
};

export type StoreMeta = {
  lastSavedAt: number | null;
};

export type MonthsSlice = {
  monthLoadStates: Record<string, LoadStatus>;
  months: Record<string, MonthData>;
  addMonthListItem: (key: string, field: "focusAreas" | "newHabits" | "letGo") => void;
  deleteMonthListItem: (
    key: string,
    field: "focusAreas" | "newHabits" | "letGo",
    index: number,
  ) => void;
  ensureMonth: (year: number, month: number) => void;
  updateMonthListItem: (
    key: string,
    field: "focusAreas" | "newHabits" | "letGo",
    index: number,
    value: string,
  ) => void;
  updateMonthText: (key: string, field: "mainGoal" | "notes", value: string) => void;
};

export type DaysSlice = {
  setDailyMetric: (key: string, day: number, metric: MetricName, value: number) => void;
  setDailyMetrics: (key: string, day: number, values: Partial<Record<MetricName, number>>) => void;
};

export type CalendarSlice = {
  calendarConnections: CalendarConnection[];
  calendarConnectionsStatus: LoadStatus;
  dismissedImportIds: string[];
  googleCalendarOptions: GoogleCalendarOptionsState["options"];
  googleCalendarOptionsStatus: LoadStatus;
  googleCalendarConnected: boolean;
  googleCalendarAccountLabel: string | null;
  taskExportFeeds: CalendarTaskExportFeed[];
  taskExportFeedsStatus: LoadStatus;
  calendarRangeLoadStates: Record<string, LoadStatus>;
  calendarRanges: Record<string, CalendarRangeData>;
  connectAppleCalendar: (icsUrl: string, accountLabel?: string) => Promise<CalendarConnection>;
  dismissImportEvent: (eventId: string) => void;
  disconnectGoogleCalendarAccount: () => Promise<void>;
  deleteCalendarConnection: (connectionId: string) => Promise<void>;
  ensureCalendarRange: (dateFrom: string, dateTo: string) => Promise<void>;
  fetchCalendarConnections: (force?: boolean) => Promise<void>;
  fetchGoogleCalendarOptions: (force?: boolean) => Promise<void>;
  fetchTaskExportFeeds: (force?: boolean) => Promise<void>;
  importCalendarEventToPlanner: (eventId: string, payload: CalendarEventImportPayload) => Promise<CalendarEventImportResult>;
  bulkImportCalendarEventsToPlanner: (
    eventIds: Array<{ eventId: string; payload: CalendarEventImportPayload }>,
  ) => Promise<CalendarBulkImportSummary>;
  saveGoogleCalendarSelections: (calendarIds: string[]) => Promise<void>;
  startGoogleCalendarConnect: (returnTo: string) => Promise<string>;
  syncCalendarConnection: (connectionId: string) => Promise<void>;
  syncAllGoogleCalendars: () => Promise<void>;
  undismissImportEvent: (eventId: string) => void;
  updateConnectionColor: (connectionId: string, color: string) => Promise<void>;
};

export type HabitsSlice = {
  habitLoadStates: Record<string, HabitLoadState>;
  addHabit: (key: string, name: string) => Promise<AddHabitResult>;
  deleteHabit: (key: string, habitId: string) => void;
  fetchMonthHabits: (year: number, month: number) => Promise<void>;
  toggleHabitDay: (key: string, habitId: string, dayKey: string) => void;
  updateHabitName: (key: string, habitId: string, value: string) => void;
  updateHabitSchedule: (key: string, habitId: string, days: number[]) => Promise<void>;
  updateHabitEventTime: (key: string, habitId: string, startsAt: string, endsAt: string) => Promise<void>;
};

export type WeeksSlice = {
  weekEntryMeta: Record<string, WeekEntryMeta>;
  weekLoadStates: Record<string, LoadStatus>;
  weeks: Record<string, WeekData>;
  ensureWeek: (year: number, week: number) => void;
  updateWeekDayNote: (key: string, section: ReflectionSection, dayKey: string, value: string) => void;
  updateWeekText: (key: string, field: "focus" | "reward", value: string) => void;
};

export type TasksSlice = {
  addTask: (key: string, title?: string) => void;
  cycleTaskStatus: (key: string, taskId: string, dayKey: string) => void;
  deleteTask: (key: string, taskId: string) => void;
  moveTask: (key: string, activeId: string, targetId: string) => void;
  setTaskStartDay: (key: string, taskId: string, dayKey: string) => void;
  updateTask: (key: string, taskId: string, field: TaskField, value: string | number | boolean | null) => void;
  exportTaskToGoogle: (key: string, taskId: string, connectionId: string, opts?: {
    scheduleDays?: number[];
    startsHhmm?: string;
    endsHhmm?: string;
  }) => Promise<void>;
  unlinkTaskFromGoogle: (key: string, taskId: string) => Promise<void>;
  updateTaskEventTime: (key: string, taskId: string, startsHhmm: string, endsHhmm: string) => Promise<void>;
};

export type AppStore = StoreMeta & MonthsSlice & DaysSlice & HabitsSlice & WeeksSlice & TasksSlice & CalendarSlice;

export type AppSliceCreator<T> = StateCreator<AppStore, [], [], T>;

export function touchSave(): Pick<StoreMeta, "lastSavedAt"> {
  return { lastSavedAt: Date.now() };
}

export function createHabitLoadState(status: HabitLoadStatus, lastKnownCount: number): HabitLoadState {
  return { status, lastKnownCount };
}

export function parseMonthKey(key: string): { month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

export function parseWeekKey(key: string): { week: number; year: number } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    week: Number(match[2]),
  };
}

export function isPersistedId(value: string | null | undefined): value is string {
  return Boolean(value && !value.startsWith("pending:"));
}

export function getCalendarRangeKey(dateFrom: string, dateTo: string): string {
  return `${dateFrom}:${dateTo}`;
}

export function toDailyState(entry: DailyStateEntry): DailyState {
  return {
    day: Number(entry.date.slice(-2)),
    health: entry.health,
    productivity: entry.productivity,
    anxiety: entry.anxiety,
  };
}
