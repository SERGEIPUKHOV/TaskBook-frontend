// BLOCK-START: PLANNER_API_MODULE
// Description: API types и маппинг-функции между backend API responses и frontend доменными типами

import { addDays, format, parseISO } from "date-fns";

import type { DailyState, Habit, MonthData, TaskStatus, WeekData, WeekTask } from "@/lib/planner-types";
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
  const habits: Habit[] = bundle.grid.habits.map((habit) => ({ id: habit.id, name: habit.name }));
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

export type {
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
