// BLOCK-START: PLANNER_API_MODULE
// Description: API types и маппинг-функции между backend API responses и frontend доменными типами

import { addDays, format, parseISO } from "date-fns";

import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventImportResult,
  CalendarPlannerLink,
  CalendarRangeData,
  CalendarTaskExportFeed,
  GoogleCalendarOptionsState,
  DailyState,
  Habit,
  MonthData,
  PlannerLinkTargetKind,
  TaskCalendarExportBucket,
  TaskStatus,
  WeekData,
  WeekTask,
} from "@/lib/planner-types";
import { getWeekDayKeys } from "@/lib/week-tasks";

// BLOCK-START: PLANNER_API_TYPES
// Description: Raw API response types — месяц, неделя, задачи, привычки, состояния
type ApiMonthPlan = {
  id: string;
  year: number;
  month: number;
  main_goal: string | null;
  focuses: string[];
  innovations: string[];
  rejections: string[];
  other: string | null;
  updated_at: string;
};

type ApiDailyState = {
  id: string;
  date: string;
  health: number;
  productivity: number;
  anxiety: number;
};

type ApiHabit = {
  id: string;
  name: string;
  order: number;
  schedule_days?: number[] | null;
  linked_event_time?: {
    starts_at: string;
    ends_at: string;
  } | null;
};

type ApiHabitGrid = {
  habits: ApiHabit[];
  logs: Record<string, number[]>;
  days_in_month: number;
};

type ApiMonthBundle = {
  plan: ApiMonthPlan | null;
  states: ApiDailyState[];
  habits: ApiHabit[];
  grid: ApiHabitGrid;
};

type ApiWeek = {
  id: string;
  year: number;
  week_number: number;
  focus: string | null;
  reward: string | null;
  date_from: string;
  date_to: string;
};

type ApiTask = {
  id: string;
  title: string;
  time_planned: number | null;
  time_actual: number | null;
  is_priority: boolean;
  order: number;
  start_day: number | null;
  calendar_export_enabled: boolean;
  calendar_export_bucket: TaskCalendarExportBucket | null;
  carried_from_task_id: string | null;
  statuses: Record<string, string>;
};

type ApiWeekEntry = {
  id: string;
  content: string;
};

type ApiWeekBundle = {
  week: ApiWeek;
  tasks: ApiTask[];
  key_events: Record<string, ApiWeekEntry | null>;
  gratitudes: Record<string, ApiWeekEntry | null>;
};

type ApiCalendarConnection = {
  id: string;
  provider: CalendarConnection["provider"];
  status: CalendarConnection["status"];
  external_account_id: string;
  account_label: string | null;
  provider_account_label: string | null;
  color: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ApiGoogleCalendarOption = {
  id: string;
  summary: string;
  access_role: string | null;
  primary: boolean;
  selected: boolean;
};

type ApiGoogleCalendarOptions = {
  connected: boolean;
  provider_account_label: string | null;
  options: ApiGoogleCalendarOption[];
};

type ApiCalendarEvent = {
  id: string;
  connection_id: string;
  provider: CalendarEvent["provider"];
  account_label: string | null;
  external_event_id: string;
  external_calendar_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  source_timezone: string | null;
  is_all_day: boolean;
  status: CalendarEvent["status"];
  planner_link: ApiCalendarPlannerLink | null;
  series_linked?: boolean | null;
  suggested_target_type: PlannerLinkTargetKind;
  recurrence?: string[] | null;
  recurring_event_id?: string | null;
};

type ApiCalendarEventsRange = {
  date_from: string;
  date_to: string;
  events: ApiCalendarEvent[];
};

type ApiCalendarPlannerLink = {
  id: string;
  link_mode: CalendarPlannerLink["linkMode"];
  open_path: string;
  target_id: string;
  target_kind: CalendarPlannerLink["targetKind"];
};

type ApiCalendarEventImportResult = {
  planner_link: ApiCalendarPlannerLink;
  status: CalendarEventImportResult["status"];
};

type ApiGoogleAuthSession = {
  authorize_url: string;
  state_expires_in: number;
};

type ApiCalendarTaskExportFeed = {
  bucket: TaskCalendarExportBucket;
  feed_path: string;
  task_count: number;
};

export type WeekEntryMeta = {
  gratitudes: Record<string, string | null>;
  keyEvents: Record<string, string | null>;
};
// BLOCK-END: PLANNER_API_TYPES

// BLOCK-START: PLANNER_API_MAPPERS
// Description: Функции маппинга API → доменные типы (month bundle, week bundle, task)
function dayKeyForMonth(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function mapDailyState(entry: ApiDailyState): DailyState {
  const parsedDate = parseISO(entry.date);
  return {
    day: parsedDate.getDate(),
    health: entry.health,
    productivity: entry.productivity,
    anxiety: entry.anxiety,
  };
}

function normalizeTaskStatus(value: string): TaskStatus | null {
  if (value === "done" || value === "moved" || value === "failed") {
    return value;
  }

  return null;
}

export function mapApiTaskToWeekTask(task: ApiTask, weekStartDate: string): WeekTask {
  const dayKeys = getWeekDayKeys(weekStartDate);
  const startIndex = Math.min(Math.max((task.start_day ?? 1) - 1, 0), 6);
  const statusTrail: TaskStatus[] = [];

  for (let index = startIndex; index < dayKeys.length; index += 1) {
    const status = normalizeTaskStatus(task.statuses[dayKeys[index]] ?? "");

    if (!status) {
      if (statusTrail.length > 0) {
        break;
      }

      continue;
    }

    statusTrail.push(status);
  }

  return {
    id: task.id,
    title: task.title,
    ti: task.time_planned ?? 0,
    fa: task.time_actual ?? 0,
    isPriority: task.is_priority,
    calendarExportEnabled: task.calendar_export_enabled,
    calendarExportBucket: task.calendar_export_bucket,
    startDayKey: dayKeys[startIndex] ?? weekStartDate,
    statusTrail,
    carriedFromTaskId: task.carried_from_task_id,
  };
}

export function buildMonthPlanPayload(month: MonthData) {
  return {
    focuses: month.focusAreas,
    innovations: month.newHabits,
    main_goal: month.mainGoal,
    other: month.notes,
    rejections: month.letGo,
  };
}

export function mapMonthBundleToMonthData(year: number, month: number, bundle: ApiMonthBundle): MonthData {
  const habits: Habit[] = bundle.habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    scheduleDays: habit.schedule_days ?? [],
    linkedEventTime: habit.linked_event_time
      ? { startsAt: habit.linked_event_time.starts_at, endsAt: habit.linked_event_time.ends_at }
      : null,
  }));
  const habitLogs = Object.fromEntries(
    habits.map((habit) => [
      habit.id,
      (bundle.grid.logs[habit.id] ?? []).map((day) => dayKeyForMonth(year, month, day)),
    ]),
  );

  return {
    year,
    month,
    mainGoal: bundle.plan?.main_goal ?? "",
    focusAreas: bundle.plan?.focuses ?? [],
    newHabits: bundle.plan?.innovations ?? [],
    letGo: bundle.plan?.rejections ?? [],
    notes: bundle.plan?.other ?? "",
    dailyStates: bundle.states.map(mapDailyState),
    habits,
    habitLogs,
  };
}

export function mapWeekBundleToWeekData(bundle: ApiWeekBundle): { entryMeta: WeekEntryMeta; week: WeekData } {
  const weekStartDate = bundle.week.date_from;
  const keyEvents = Object.fromEntries(
    Object.entries(bundle.key_events).map(([dayKey, entry]) => [dayKey, entry?.content ?? ""]),
  );
  const gratitudes = Object.fromEntries(
    Object.entries(bundle.gratitudes).map(([dayKey, entry]) => [dayKey, entry?.content ?? ""]),
  );

  return {
    entryMeta: {
      keyEvents: Object.fromEntries(
        Object.entries(bundle.key_events).map(([dayKey, entry]) => [dayKey, entry?.id ?? null]),
      ),
      gratitudes: Object.fromEntries(
        Object.entries(bundle.gratitudes).map(([dayKey, entry]) => [dayKey, entry?.id ?? null]),
      ),
    },
    week: {
      year: bundle.week.year,
      week: bundle.week.week_number,
      startDate: weekStartDate,
      tasks: bundle.tasks
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((task) => mapApiTaskToWeekTask(task, weekStartDate)),
      reflection: {
        focus: bundle.week.focus ?? "",
        reward: bundle.week.reward ?? "",
        keyEvents,
        gratitudes,
      },
    },
  };
}

export function createEmptyWeekEntryMeta(weekStartDate: string): WeekEntryMeta {
  const dayKeys = Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStartDate), index), "yyyy-MM-dd"));
  return {
    keyEvents: Object.fromEntries(dayKeys.map((dayKey) => [dayKey, null])),
    gratitudes: Object.fromEntries(dayKeys.map((dayKey) => [dayKey, null])),
  };
}

export function mapApiCalendarConnection(entry: ApiCalendarConnection): CalendarConnection {
  return {
    id: entry.id,
    provider: entry.provider,
    status: entry.status,
    externalAccountId: entry.external_account_id,
    accountLabel: entry.account_label,
    providerAccountLabel: entry.provider_account_label,
    color: entry.color,
    lastSyncedAt: entry.last_synced_at,
    lastError: entry.last_error,
    tokenExpiresAt: entry.token_expires_at,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

export function mapApiGoogleCalendarOptions(entry: ApiGoogleCalendarOptions): GoogleCalendarOptionsState {
  return {
    connected: entry.connected,
    providerAccountLabel: entry.provider_account_label,
    options: entry.options.map((option) => ({
      id: option.id,
      summary: option.summary,
      accessRole: option.access_role,
      primary: option.primary,
      selected: option.selected,
    })),
  };
}

export function mapApiCalendarEvent(entry: ApiCalendarEvent): CalendarEvent {
  return {
    id: entry.id,
    connectionId: entry.connection_id,
    provider: entry.provider,
    accountLabel: entry.account_label,
    externalEventId: entry.external_event_id,
    externalCalendarId: entry.external_calendar_id,
    title: entry.title,
    description: entry.description,
    location: entry.location,
    startsAt: entry.starts_at,
    endsAt: entry.ends_at,
    sourceTimezone: entry.source_timezone,
    isAllDay: entry.is_all_day,
    status: entry.status,
    plannerLink: entry.planner_link ? mapApiCalendarPlannerLink(entry.planner_link) : null,
    seriesLinked: entry.series_linked ?? false,
    suggestedTargetType: entry.suggested_target_type,
    recurrence: entry.recurrence ?? undefined,
    recurringEventId: entry.recurring_event_id ?? undefined,
  };
}

export function mapApiCalendarPlannerLink(entry: ApiCalendarPlannerLink): CalendarPlannerLink {
  return {
    id: entry.id,
    linkMode: entry.link_mode,
    openPath: entry.open_path,
    targetId: entry.target_id,
    targetKind: entry.target_kind,
  };
}

export function mapApiCalendarEventImportResult(entry: ApiCalendarEventImportResult): CalendarEventImportResult {
  return {
    plannerLink: mapApiCalendarPlannerLink(entry.planner_link),
    status: entry.status,
  };
}

export function mapApiCalendarEventsRange(entry: ApiCalendarEventsRange): CalendarRangeData {
  return {
    dateFrom: entry.date_from,
    dateTo: entry.date_to,
    events: entry.events.map(mapApiCalendarEvent),
  };
}

export function mapApiCalendarTaskExportFeed(entry: ApiCalendarTaskExportFeed): CalendarTaskExportFeed {
  return {
    bucket: entry.bucket,
    feedPath: entry.feed_path,
    taskCount: entry.task_count,
  };
}

export type {
  ApiCalendarConnection,
  ApiCalendarEvent,
  ApiCalendarEventImportResult,
  ApiCalendarEventsRange,
  ApiCalendarTaskExportFeed,
  ApiGoogleCalendarOptions,
  ApiGoogleAuthSession,
  ApiHabit,
  ApiHabitGrid,
  ApiMonthBundle,
  ApiMonthPlan,
  ApiTask,
  ApiWeek,
  ApiWeekBundle,
  ApiWeekEntry,
};
// BLOCK-END: PLANNER_API_MAPPERS
// BLOCK-END: PLANNER_API_MODULE
