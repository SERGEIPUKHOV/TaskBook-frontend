"use client";

import { create } from "zustand";

import { api } from "@/lib/api";
import { getAdjacentWeek, getMonthKey, getWeekKey } from "@/lib/dates";
import {
  buildMonthPlanPayload,
  createEmptyWeekEntryMeta,
  mapApiTaskToWeekTask,
  mapMonthBundleToMonthData,
  mapWeekBundleToWeekData,
  type ApiMonthBundle,
  type ApiTask,
  type ApiWeekBundle,
  type WeekEntryMeta,
} from "@/lib/planner-api";
import type { DailyState, MetricName, MonthData, WeekData } from "@/lib/planner-types";
import { cycleTaskAtDay, getWeekDayKeys } from "@/lib/week-tasks";
import { arrayMove, clamp, createId } from "@/lib/utils";

// BLOCK-START: APP_STORE_MODULE
// Description: Zustand planner store for month/week loading, optimistic UI mutations, and debounced API persistence.
type ReflectionSection = "keyEvents" | "gratitudes";
type HabitLoadStatus = "idle" | "loading" | "ready" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type AddHabitResult =
  | { ok: true }
  | { ok: false; reason: "duplicate_name" | "empty_name" | "missing_month" };

type HabitLoadState = {
  lastKnownCount: number;
  status: HabitLoadStatus;
};

type TaskField = "title" | "ti" | "fa" | "isPriority";

type TaskEntry = {
  carried_from_task_id: string | null;
  id: string;
  is_priority: boolean;
  order: number;
  start_day: number | null;
  statuses: Record<string, string>;
  time_actual: number | null;
  time_planned: number | null;
  title: string;
};

type DailyStateEntry = {
  anxiety: number;
  date: string;
  health: number;
  id: string;
  productivity: number;
};

type WeekEntryResponse = {
  content: string;
  created_at: string;
  date: string;
  id: string;
};

type AppState = {
  habitLoadStates: Record<string, HabitLoadState>;
  lastSavedAt: number | null;
  monthLoadStates: Record<string, LoadStatus>;
  months: Record<string, MonthData>;
  weekEntryMeta: Record<string, WeekEntryMeta>;
  weekLoadStates: Record<string, LoadStatus>;
  weeks: Record<string, WeekData>;
  addHabit: (key: string, name: string) => Promise<AddHabitResult>;
  addMonthListItem: (key: string, field: "focusAreas" | "newHabits" | "letGo") => void;
  addTask: (key: string) => void;
  cycleTaskStatus: (key: string, taskId: string, dayKey: string) => void;
  deleteHabit: (key: string, habitId: string) => void;
  deleteMonthListItem: (
    key: string,
    field: "focusAreas" | "newHabits" | "letGo",
    index: number,
  ) => void;
  deleteTask: (key: string, taskId: string) => void;
  ensureMonth: (year: number, month: number) => void;
  ensureWeek: (year: number, week: number) => void;
  fetchMonthHabits: (year: number, month: number) => Promise<void>;
  moveTask: (key: string, activeId: string, targetId: string) => void;
  setDailyMetric: (key: string, day: number, metric: MetricName, value: number) => void;
  setDailyMetrics: (key: string, day: number, values: Partial<Record<MetricName, number>>) => void;
  setTaskStartDay: (key: string, taskId: string, dayKey: string) => void;
  toggleHabitDay: (key: string, habitId: string, dayKey: string) => void;
  updateHabitName: (key: string, habitId: string, value: string) => void;
  updateMonthListItem: (
    key: string,
    field: "focusAreas" | "newHabits" | "letGo",
    index: number,
    value: string,
  ) => void;
  updateMonthText: (key: string, field: "mainGoal" | "notes", value: string) => void;
  updateTask: (key: string, taskId: string, field: TaskField, value: string | number | boolean) => void;
  updateWeekDayNote: (key: string, section: ReflectionSection, dayKey: string, value: string) => void;
  updateWeekText: (key: string, field: "focus" | "reward", value: string) => void;
};

// BLOCK-START: APP_STORE_TIMER_REGISTRY
// Description: Debounce timer registries used to batch optimistic writes before sending API requests.
const monthPlanSaveTimers: Record<string, number | undefined> = {};
const taskSaveTimers: Record<string, number | undefined> = {};
const weekPatchSaveTimers: Record<string, number | undefined> = {};
// BLOCK-END: APP_STORE_TIMER_REGISTRY

// BLOCK-START: APP_STORE_META_HELPERS
// Description: Small helpers for save metadata and habit loading status snapshots.
function touchSave() {
  return { lastSavedAt: Date.now() };
}

function createHabitLoadState(status: HabitLoadStatus, lastKnownCount: number): HabitLoadState {
  return { status, lastKnownCount };
}
// BLOCK-END: APP_STORE_META_HELPERS

// BLOCK-START: APP_STORE_KEY_PARSERS
// Description: Parses serialized month and ISO week keys used across the store caches.
function parseMonthKey(key: string): { month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function parseWeekKey(key: string): { week: number; year: number } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    week: Number(match[2]),
  };
}
// BLOCK-END: APP_STORE_KEY_PARSERS

// BLOCK-START: APP_STORE_DATA_MAPPERS
// Description: Normalizes API payload fragments into store-native task and daily-state shapes.
function isPersistedId(value: string | null | undefined): value is string {
  return Boolean(value && !value.startsWith("pending:"));
}

function toTaskEntry(task: ApiTask) {
  return {
    id: task.id,
    title: task.title,
    time_planned: task.time_planned,
    time_actual: task.time_actual,
    is_priority: task.is_priority,
    order: task.order,
    start_day: task.start_day,
    carried_from_task_id: task.carried_from_task_id,
    statuses: task.statuses,
  } satisfies TaskEntry;
}

function toDailyState(entry: DailyStateEntry): DailyState {
  return {
    day: Number(entry.date.slice(-2)),
    health: entry.health,
    productivity: entry.productivity,
    anxiety: entry.anxiety,
  };
}
// BLOCK-END: APP_STORE_DATA_MAPPERS

export const useAppStore = create<AppState>((set, get) => {
  // BLOCK-START: APP_STORE_LOADERS
  // Description: Loads month and week bundles into local cache while tracking load-state transitions.
  // BLOCK-START: APP_STORE_LOAD_MONTH
  /**
   * function_contracts:
   *   loadMonth:
   *     description: "Loads one month bundle into store cache unless it is already ready or loading."
   *     preconditions:
   *       - "year/month identify a calendar month"
   *       - "Month bundle API endpoint is reachable"
   *     postconditions:
   *       - "monthLoadStates[key] becomes ready or error"
   *       - "months[key] is replaced with mapped API data on success"
   *       - "habitLoadStates[key] reflects status and known habit count"
   */
  const loadMonth = async (year: number, month: number, force = false) => {
    const key = getMonthKey(year, month);
    const currentStatus = get().monthLoadStates[key];

    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    const previousCount = get().months[key]?.habits.length ?? get().habitLoadStates[key]?.lastKnownCount ?? 3;

    set((state) => ({
      ...state,
      monthLoadStates: {
        ...state.monthLoadStates,
        [key]: "loading",
      },
      habitLoadStates: {
        ...state.habitLoadStates,
        [key]: createHabitLoadState("loading", previousCount),
      },
    }));

    try {
      const bundle = await api.get<ApiMonthBundle>(`/months/${year}/${month}/bundle`);
      const monthData = mapMonthBundleToMonthData(year, month, bundle);

      set((state) => ({
        ...state,
        monthLoadStates: {
          ...state.monthLoadStates,
          [key]: "ready",
        },
        habitLoadStates: {
          ...state.habitLoadStates,
          [key]: createHabitLoadState("ready", monthData.habits.length),
        },
        months: {
          ...state.months,
          [key]: monthData,
        },
      }));
    } catch {
      set((state) => ({
        ...state,
        monthLoadStates: {
          ...state.monthLoadStates,
          [key]: "error",
        },
        habitLoadStates: {
          ...state.habitLoadStates,
          [key]: createHabitLoadState("error", previousCount),
        },
      }));
    }
  };
  // BLOCK-END: APP_STORE_LOAD_MONTH

  // BLOCK-START: APP_STORE_LOAD_WEEK
  /**
   * function_contracts:
   *   loadWeek:
   *     description: "Loads one ISO week bundle and entry metadata into store cache unless already loaded."
   *     preconditions:
   *       - "year/week identify an ISO week"
   *       - "Week bundle API endpoint is reachable"
   *     postconditions:
   *       - "weekLoadStates[key] becomes ready or error"
   *       - "weeks[key] and weekEntryMeta[key] are populated on success"
   */
  const loadWeek = async (year: number, week: number, force = false) => {
    const key = getWeekKey(year, week);
    const currentStatus = get().weekLoadStates[key];

    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set((state) => ({
      ...state,
      weekLoadStates: {
        ...state.weekLoadStates,
        [key]: "loading",
      },
    }));

    try {
      const bundle = await api.get<ApiWeekBundle>(`/weeks/${year}/${week}/bundle`);
      const { entryMeta, week: weekData } = mapWeekBundleToWeekData(bundle);

      set((state) => ({
        ...state,
        weekEntryMeta: {
          ...state.weekEntryMeta,
          [key]: entryMeta,
        },
        weekLoadStates: {
          ...state.weekLoadStates,
          [key]: "ready",
        },
        weeks: {
          ...state.weeks,
          [key]: weekData,
        },
      }));
    } catch {
      set((state) => ({
        ...state,
        weekLoadStates: {
          ...state.weekLoadStates,
          [key]: "error",
        },
      }));
    }
  };
  // BLOCK-END: APP_STORE_LOAD_WEEK
  // BLOCK-END: APP_STORE_LOADERS

  // BLOCK-START: APP_STORE_PERSISTENCE
  // Description: Debounced persistence helpers for month plans, week reflections, tasks, and task ordering.
  // BLOCK-START: APP_STORE_PERSIST_MONTH_PLAN
  /**
   * function_contracts:
   *   persistMonthPlan:
   *     description: "Persists optimistic month planning fields for one month key."
   *     preconditions:
   *       - "key matches an existing month in store"
   *       - "parseMonthKey(key) succeeds"
   *     postconditions:
   *       - "Sends current month planning payload to the backend when month exists"
   *       - "Leaves optimistic local state intact if the request fails"
   */
  const persistMonthPlan = async (key: string) => {
    const month = get().months[key];
    const parsed = parseMonthKey(key);

    if (!month || !parsed) {
      return;
    }

    try {
      await api.post(`/months/${parsed.year}/${parsed.month}/plan`, buildMonthPlanPayload(month));
    } catch {
      // Keep optimistic state locally; the next successful fetch will reconcile from the API.
    }
  };
  // BLOCK-END: APP_STORE_PERSIST_MONTH_PLAN

  // BLOCK-START: APP_STORE_PERSIST_WEEK_PATCH
  /**
   * function_contracts:
   *   persistWeekPatch:
   *     description: "Persists editable focus and reward fields for one week key."
   *     preconditions:
   *       - "key matches an existing week in store"
   *       - "parseWeekKey(key) succeeds"
   *     postconditions:
   *       - "Sends current reflection focus/reward patch to the backend when week exists"
   *       - "Leaves optimistic local state intact if the request fails"
   */
  const persistWeekPatch = async (key: string) => {
    const week = get().weeks[key];
    const parsed = parseWeekKey(key);

    if (!week || !parsed) {
      return;
    }

    try {
      await api.patch(`/weeks/${parsed.year}/${parsed.week}`, {
        focus: week.reflection.focus,
        reward: week.reflection.reward,
      });
    } catch {
      // Keep optimistic state locally; the next successful fetch will reconcile from the API.
    }
  };
  // BLOCK-END: APP_STORE_PERSIST_WEEK_PATCH

  // BLOCK-START: APP_STORE_PERSIST_TASK
  /**
   * function_contracts:
   *   persistTask:
   *     description: "Persists one edited week task to the backend after optimistic local updates."
   *     preconditions:
   *       - "key matches an existing week in store"
   *       - "taskId belongs to a persisted task, not a temp task"
   *     postconditions:
   *       - "Sends current task title, timing, priority, and start_day to the backend"
   *       - "Leaves optimistic local state intact if the request fails"
   */
  const persistTask = async (key: string, taskId: string) => {
    const week = get().weeks[key];

    if (!week || taskId.startsWith("temp-")) {
      return;
    }

    const task = week.tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    const dayKeys = getWeekDayKeys(week.startDate);
    const startDayIndex = Math.max(0, dayKeys.indexOf(task.startDayKey));

    try {
      await api.patch(`/tasks/${task.id}`, {
        is_priority: task.isPriority,
        start_day: startDayIndex + 1,
        time_actual: task.fa,
        time_planned: task.ti,
        title: task.title,
      });
    } catch {
      // Keep optimistic state locally; the next successful fetch will reconcile from the API.
    }
  };
  // BLOCK-END: APP_STORE_PERSIST_TASK

  // BLOCK-START: APP_STORE_SYNC_TASK_ORDER
  /**
   * function_contracts:
   *   syncTaskOrder:
   *     description: "Persists current task ordering for one week when all tasks have stable server ids."
   *     preconditions:
   *       - "key matches an existing week in store"
   *       - "No task in the week has a temp id"
   *     postconditions:
   *       - "Posts task_ids in their current UI order to the backend"
   *       - "Skips persistence when the key is invalid or temp tasks are still present"
   */
  const syncTaskOrder = async (key: string) => {
    const parsed = parseWeekKey(key);
    const week = get().weeks[key];

    if (!parsed || !week || week.tasks.some((task) => task.id.startsWith("temp-"))) {
      return;
    }

    try {
      await api.post(`/weeks/${parsed.year}/${parsed.week}/tasks/reorder`, {
        task_ids: week.tasks.map((task) => task.id),
      });
    } catch {
      // Keep optimistic state locally; the next successful fetch will reconcile from the API.
    }
  };
  // BLOCK-END: APP_STORE_SYNC_TASK_ORDER
  // BLOCK-END: APP_STORE_PERSISTENCE

  // BLOCK-START: APP_STORE_ACTIONS
  // Description: Public store API consumed by planner screens for loading, editing, and persisting month/week state.
  return {
    habitLoadStates: {},
    monthLoadStates: {},
    months: {},
    weekEntryMeta: {},
    weekLoadStates: {},
    weeks: {},
    lastSavedAt: null,
    // BLOCK-START: APP_STORE_BOOTSTRAP_ACTIONS
    // Description: Entry-point actions that trigger month/week loading for screens.
    ensureMonth: (year, month) => {
      void loadMonth(year, month);
    },
    ensureWeek: (year, week) => {
      void loadWeek(year, week);
    },
    fetchMonthHabits: async (year, month) => {
      await loadMonth(year, month, true);
    },
    // BLOCK-END: APP_STORE_BOOTSTRAP_ACTIONS

    // BLOCK-START: APP_STORE_MONTH_EDIT_ACTIONS
    // Description: Month plan, daily metrics, and habit actions with optimistic local updates.
    updateMonthText: (key, field, value) =>
      set((state) => {
        const current = state.months[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(monthPlanSaveTimers[key]);
        monthPlanSaveTimers[key] = window.setTimeout(() => {
          void persistMonthPlan(key);
        }, 350);

        return {
          ...state,
          months: {
            ...state.months,
            [key]: { ...current, [field]: value },
          },
          ...touchSave(),
        };
      }),
    updateMonthListItem: (key, field, index, value) =>
      set((state) => {
        const current = state.months[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(monthPlanSaveTimers[key]);
        monthPlanSaveTimers[key] = window.setTimeout(() => {
          void persistMonthPlan(key);
        }, 350);

        return {
          ...state,
          months: {
            ...state.months,
            [key]: {
              ...current,
              [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
            },
          },
          ...touchSave(),
        };
      }),
    addMonthListItem: (key, field) =>
      set((state) => {
        const current = state.months[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(monthPlanSaveTimers[key]);
        monthPlanSaveTimers[key] = window.setTimeout(() => {
          void persistMonthPlan(key);
        }, 350);

        return {
          ...state,
          months: {
            ...state.months,
            [key]: {
              ...current,
              [field]: [...current[field], ""],
            },
          },
          ...touchSave(),
        };
      }),
    deleteMonthListItem: (key, field, index) =>
      set((state) => {
        const current = state.months[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(monthPlanSaveTimers[key]);
        monthPlanSaveTimers[key] = window.setTimeout(() => {
          void persistMonthPlan(key);
        }, 350);

        return {
          ...state,
          months: {
            ...state.months,
            [key]: {
              ...current,
              [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
            },
          },
          ...touchSave(),
        };
      }),
    setDailyMetric: (key, day, metric, value) => {
      const current = get().months[key];
      const parsed = parseMonthKey(key);

      if (!current || !parsed) {
        return;
      }

      const clamped = clamp(value, 1, 10);
      const hasEntry = current.dailyStates.some((entry) => entry.day === day);

      if (hasEntry) {
        set((state) => {
          const month = state.months[key];
          if (!month) {
            return state;
          }

          return {
            ...state,
            months: {
              ...state.months,
              [key]: {
                ...month,
                dailyStates: month.dailyStates.map((entry) =>
                  entry.day === day ? { ...entry, [metric]: clamped } : entry,
                ),
              },
            },
            ...touchSave(),
          };
        });
      }

      void api
        .put<DailyStateEntry>(`/months/${parsed.year}/${parsed.month}/states/${day}`, {
          [metric]: clamped,
        })
        .then((entry) => {
          const mappedEntry = toDailyState(entry);

          set((state) => {
            const month = state.months[key];
            if (!month) {
              return state;
            }

            const alreadyHas = month.dailyStates.some((item) => item.day === mappedEntry.day);
            return {
              ...state,
              months: {
                ...state.months,
                [key]: {
                  ...month,
                  dailyStates: alreadyHas
                    ? month.dailyStates.map((item) => (item.day === mappedEntry.day ? mappedEntry : item))
                    : [...month.dailyStates, mappedEntry].sort((left, right) => left.day - right.day),
                },
              },
              ...touchSave(),
            };
          });
        });
    },
    setDailyMetrics: (key, day, values) => {
      const current = get().months[key];
      const parsed = parseMonthKey(key);

      if (!current || !parsed) {
        return;
      }

      const clamped = Object.fromEntries(
        Object.entries(values).map(([metric, value]) => [metric, clamp(value as number, 1, 10)]),
      ) as Partial<Record<MetricName, number>>;

      const hasEntry = current.dailyStates.some((entry) => entry.day === day);

      if (hasEntry) {
        set((state) => {
          const month = state.months[key];
          if (!month) {
            return state;
          }

          return {
            ...state,
            months: {
              ...state.months,
              [key]: {
                ...month,
                dailyStates: month.dailyStates.map((entry) =>
                  entry.day === day ? { ...entry, ...clamped } : entry,
                ),
              },
            },
            ...touchSave(),
          };
        });
      }

      void api
        .put<DailyStateEntry>(`/months/${parsed.year}/${parsed.month}/states/${day}`, clamped)
        .then((entry) => {
          const mappedEntry = toDailyState(entry);

          set((state) => {
            const month = state.months[key];
            if (!month) {
              return state;
            }

            const alreadyHas = month.dailyStates.some((item) => item.day === mappedEntry.day);
            return {
              ...state,
              months: {
                ...state.months,
                [key]: {
                  ...month,
                  dailyStates: alreadyHas
                    ? month.dailyStates.map((item) => (item.day === mappedEntry.day ? mappedEntry : item))
                    : [...month.dailyStates, mappedEntry].sort((left, right) => left.day - right.day),
                },
              },
              ...touchSave(),
            };
          });
        });
    },
    toggleHabitDay: (key, habitId, dayKey) =>
      set((state) => {
        const current = state.months[key];

        if (!current) {
          return state;
        }

        const currentLogs = current.habitLogs[habitId] ?? [];
        const isCompleted = currentLogs.includes(dayKey);

        if (isCompleted) {
          void api.delete(`/habits/${habitId}/logs/${dayKey}`);
        } else {
          void api.post(`/habits/${habitId}/logs/${dayKey}`, {});
        }

        return {
          ...state,
          months: {
            ...state.months,
            [key]: {
              ...current,
              habitLogs: {
                ...current.habitLogs,
                [habitId]: isCompleted
                  ? currentLogs.filter((item) => item !== dayKey)
                  : [...currentLogs, dayKey].sort(),
              },
            },
          },
          ...touchSave(),
        };
      }),
    updateHabitName: (key, habitId, value) =>
      set((state) => {
        if (!state.months[key]) {
          return state;
        }

        void api.patch(`/habits/${habitId}`, { name: value });

        return {
          ...state,
          months: Object.fromEntries(
            Object.entries(state.months).map(([monthKey, month]) => [
              monthKey,
              {
                ...month,
                habits: month.habits.map((habit) => (habit.id === habitId ? { ...habit, name: value } : habit)),
              },
            ]),
          ),
          ...touchSave(),
        };
      }),
    /**
     * function_contracts:
     *   addHabit:
     *     description: "Creates a new habit for the selected month and propagates it through cached months."
     *     preconditions:
     *       - "key matches a loaded month"
     *       - "name is non-empty after trimming and not duplicated in the current month"
     *     postconditions:
     *       - "Returns { ok: true } when the habit is created"
     *       - "Returns a typed failure reason for empty, duplicate, or missing month cases"
     *       - "Updates optimistic habit lists and load counters after success"
     */
    addHabit: async (key, name) => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return { ok: false, reason: "empty_name" } as const;
      }

      const current = get().months[key];
      const parsed = parseMonthKey(key);

      if (!current || !parsed) {
        return { ok: false, reason: "missing_month" } as const;
      }

      const normalizedName = trimmedName.toLocaleLowerCase();
      const hasDuplicate = current.habits.some(
        (habit) => habit.name.trim().toLocaleLowerCase() === normalizedName,
      );

      if (hasDuplicate) {
        return { ok: false, reason: "duplicate_name" } as const;
      }

      try {
        const habit = await api.post<{ id: string; name: string; order: number }>(
          `/months/${parsed.year}/${parsed.month}/habits`,
          { name: trimmedName },
        );

        set((state) => ({
          ...state,
          habitLoadStates: Object.fromEntries(
            Object.entries(state.habitLoadStates).map(([monthKey, loadState]) => {
              if (monthKey < key) {
                return [monthKey, loadState];
              }

              return [
                monthKey,
                createHabitLoadState(loadState.status === "error" ? "ready" : loadState.status, loadState.lastKnownCount + 1),
              ];
            }),
          ),
          months: Object.fromEntries(
            Object.entries(state.months).map(([monthKey, month]) => {
              if (monthKey < key || month.habits.some((item) => item.id === habit.id)) {
                return [monthKey, month];
              }

              return [
                monthKey,
                {
                  ...month,
                  habits: [...month.habits, { id: habit.id, name: habit.name }],
                  habitLogs: {
                    ...month.habitLogs,
                    [habit.id]: month.habitLogs[habit.id] ?? [],
                  },
                },
              ];
            }),
          ),
          ...touchSave(),
        }));

        return { ok: true } as const;
      } catch (error) {
        if ((error as Error & { status?: number }).status === 409) {
          return { ok: false, reason: "duplicate_name" } as const;
        }

        return { ok: false, reason: "missing_month" } as const;
      }
    },
    deleteHabit: (key, habitId) =>
      set((state) => {
        const parsed = parseMonthKey(key);

        if (!state.months[key] || !parsed) {
          return state;
        }

        void api.delete(`/habits/${habitId}?year=${parsed.year}&month=${parsed.month}`);

        return {
          ...state,
          months: Object.fromEntries(
            Object.entries(state.months).map(([monthKey, month]) => {
              if (monthKey < key) {
                return [monthKey, month];
              }

              const nextLogs = { ...month.habitLogs };
              delete nextLogs[habitId];

              return [
                monthKey,
                {
                  ...month,
                  habitLogs: nextLogs,
                  habits: month.habits.filter((habit) => habit.id !== habitId),
                },
              ];
            }),
          ),
          ...touchSave(),
        };
      }),
    // BLOCK-END: APP_STORE_MONTH_EDIT_ACTIONS

    // BLOCK-START: APP_STORE_WEEK_REFLECTION_ACTIONS
    // Description: Week reflection text and day-note actions with optimistic metadata tracking.
    updateWeekText: (key, field, value) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(weekPatchSaveTimers[key]);
        weekPatchSaveTimers[key] = window.setTimeout(() => {
          void persistWeekPatch(key);
        }, 250);

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              reflection: {
                ...current.reflection,
                [field]: value,
              },
            },
          },
          ...touchSave(),
        };
      }),
    /**
     * function_contracts:
     *   updateWeekDayNote:
     *     description: "Creates, updates, or deletes one day reflection note and keeps entry ids synchronized."
     *     preconditions:
     *       - "key matches a loaded week"
     *       - "section is one of keyEvents or gratitudes"
     *       - "dayKey is an ISO date within the visible week"
     *     postconditions:
     *       - "Optimistically updates week reflection text"
     *       - "Creates pending ids for new notes until the backend returns a persisted id"
     *       - "Deletes or patches existing entries when note content changes"
     */
    updateWeekDayNote: (key, section, dayKey, value) =>
      set((state) => {
        const current = state.weeks[key];
        const entryMeta = state.weekEntryMeta[key] ?? createEmptyWeekEntryMeta(current?.startDate ?? dayKey);

        if (!current) {
          return state;
        }

        const nextValue = value;
        const entryId = entryMeta[section][dayKey];
        const trimmedValue = nextValue.trim();
        const entryKind = section === "keyEvents" ? "events" : "gratitudes";

        if (!trimmedValue && isPersistedId(entryId)) {
          void api.delete(`/${entryKind}/${entryId}`);
        } else if (trimmedValue && isPersistedId(entryId)) {
          void api.patch(`/${entryKind}/${entryId}`, { content: trimmedValue });
        } else {
          const pendingId = `pending:${section}:${dayKey}:${Date.now()}`;
          void api.post<WeekEntryResponse>(`/days/${dayKey}/${entryKind}`, { content: trimmedValue }).then((entry) => {
            set((innerState) => {
              const currentMeta = innerState.weekEntryMeta[key];
              if (!currentMeta || currentMeta[section][dayKey] !== pendingId) {
                return innerState;
              }

              return {
                ...innerState,
                weekEntryMeta: {
                  ...innerState.weekEntryMeta,
                  [key]: {
                    ...currentMeta,
                    [section]: {
                      ...currentMeta[section],
                      [dayKey]: entry.id,
                    },
                  },
                },
              };
            });
          });

          return {
            ...state,
            weekEntryMeta: {
              ...state.weekEntryMeta,
              [key]: {
                ...entryMeta,
                [section]: {
                  ...entryMeta[section],
                  [dayKey]: pendingId,
                },
              },
            },
            weeks: {
              ...state.weeks,
              [key]: {
                ...current,
                reflection: {
                  ...current.reflection,
                  [section]: {
                    ...current.reflection[section],
                    [dayKey]: nextValue,
                  },
                },
              },
            },
            ...touchSave(),
          };
        }

        return {
          ...state,
          weekEntryMeta: {
            ...state.weekEntryMeta,
            [key]: {
              ...entryMeta,
              [section]: {
                ...entryMeta[section],
                [dayKey]: trimmedValue ? entryId ?? null : null,
              },
            },
          },
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              reflection: {
                ...current.reflection,
                [section]: {
                  ...current.reflection[section],
                  [dayKey]: nextValue,
                },
              },
            },
          },
          ...touchSave(),
        };
      }),
    // BLOCK-END: APP_STORE_WEEK_REFLECTION_ACTIONS

    // BLOCK-START: APP_STORE_TASK_ACTIONS
    // Description: Task creation, deletion, editing, status updates, start-day changes, and drag-reorder flows.
    /**
     * function_contracts:
     *   addTask:
     *     description: "Creates an optimistic temp task for the selected week and reconciles it with backend response."
     *     preconditions:
     *       - "key matches a loaded week"
     *       - "parseWeekKey(key) succeeds"
     *     postconditions:
     *       - "Appends a temp task to local state immediately"
     *       - "Replaces temp task with persisted task on success"
     *       - "Removes temp task if backend creation fails"
     */
    addTask: (key) =>
      set((state) => {
        const current = state.weeks[key];
        const parsed = parseWeekKey(key);

        if (!current || !parsed) {
          return state;
        }

        const tempId = createId(`temp-task-${key}`);
        const tempTask = {
          id: tempId,
          title: "",
          ti: 0,
          fa: 0,
          isPriority: false,
          startDayKey: current.startDate,
          statusTrail: [],
          carriedFromTaskId: null,
        };

        void api
          .post<ApiTask>(`/weeks/${parsed.year}/${parsed.week}/tasks`, {
            is_priority: false,
            start_day: 1,
            time_actual: 0,
            time_planned: 0,
            title: "",
          })
          .then((task) => {
            set((innerState) => {
              const week = innerState.weeks[key];
              if (!week) {
                return innerState;
              }

              return {
                ...innerState,
                weeks: {
                  ...innerState.weeks,
                  [key]: {
                    ...week,
                    tasks: week.tasks.map((item) =>
                      item.id === tempId ? mapApiTaskToWeekTask(task, week.startDate) : item,
                    ),
                  },
                },
              };
            });
          })
          .catch(() => {
            set((innerState) => {
              const week = innerState.weeks[key];
              if (!week) {
                return innerState;
              }

              return {
                ...innerState,
                weeks: {
                  ...innerState.weeks,
                  [key]: {
                    ...week,
                    tasks: week.tasks.filter((item) => item.id !== tempId),
                  },
                },
              };
            });
          });

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: [...current.tasks, tempTask],
            },
          },
          ...touchSave(),
        };
      }),
    deleteTask: (key, taskId) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current) {
          return state;
        }

        if (!taskId.startsWith("temp-")) {
          void api.delete(`/tasks/${taskId}`);
        }

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: current.tasks.filter((task) => task.id !== taskId),
            },
          },
          ...touchSave(),
        };
      }),
    updateTask: (key, taskId, field, value) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current) {
          return state;
        }

        window.clearTimeout(taskSaveTimers[taskId]);
        taskSaveTimers[taskId] = window.setTimeout(() => {
          void persistTask(key, taskId);
        }, 300);

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: current.tasks.map((task) => {
                if (task.id !== taskId) {
                  return task;
                }

                if (field === "title" && typeof value === "string") {
                  return { ...task, title: value };
                }

                if ((field === "ti" || field === "fa") && typeof value === "number") {
                  return { ...task, [field]: Math.max(0, value) };
                }

                if (field === "isPriority" && typeof value === "boolean") {
                  return { ...task, isPriority: value };
                }

                return task;
              }),
            },
          },
          ...touchSave(),
        };
      }),
    /**
     * function_contracts:
     *   cycleTaskStatus:
     *     description: "Cycles one task cell status for a day and mirrors the change to backend task status endpoints."
     *     preconditions:
     *       - "key matches a loaded week"
     *       - "taskId identifies a task in that week"
     *       - "dayKey belongs to the visible week"
     *     postconditions:
     *       - "Updates one task status trail optimistically"
     *       - "Creates or deletes backend task status entries for persisted tasks"
     *       - "Marks next week cache idle when Sunday carry-over may change"
     */
    cycleTaskStatus: (key, taskId, dayKey) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current) {
          return state;
        }

        const dayKeys = getWeekDayKeys(current.startDate);
        const currentTask = current.tasks.find((task) => task.id === taskId);
        if (!currentTask) {
          return state;
        }

        const nextTask = cycleTaskAtDay(currentTask, dayKey, dayKeys);
        const relativeIndex = dayKeys.indexOf(dayKey) - dayKeys.indexOf(currentTask.startDayKey);
        const prevStatus = relativeIndex >= 0 ? currentTask.statusTrail[relativeIndex] ?? "planned" : "planned";
        const nextStatus = relativeIndex >= 0 ? nextTask.statusTrail[relativeIndex] ?? "planned" : "planned";

        if (!taskId.startsWith("temp-")) {
          if (nextStatus === "planned") {
            void api.delete(`/tasks/${taskId}/status/${dayKey}`);
          } else {
            void api.put(`/tasks/${taskId}/status/${dayKey}`, { status: nextStatus });
          }
        }

        const isSunday = dayKey === dayKeys[6];
        const affectsCarryOver = isSunday && (nextStatus === "moved" || prevStatus === "moved");
        let nextWeekLoadStates = state.weekLoadStates;

        if (affectsCarryOver) {
          const parsed = parseWeekKey(key);
          if (parsed) {
            const nextRef = getAdjacentWeek(parsed.year, parsed.week, 1);
            const nextKey = getWeekKey(nextRef.year, nextRef.week);
            nextWeekLoadStates = {
              ...state.weekLoadStates,
              [nextKey]: "idle",
            };
          }
        }

        return {
          ...state,
          weekLoadStates: nextWeekLoadStates,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: current.tasks.map((task) => (task.id === taskId ? nextTask : task)),
            },
          },
          ...touchSave(),
        };
      }),
    setTaskStartDay: (key, taskId, dayKey) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current) {
          return state;
        }

        if (!taskId.startsWith("temp-")) {
          const nextStartDay = Math.max(1, getWeekDayKeys(current.startDate).indexOf(dayKey) + 1);
          void api.patch(`/tasks/${taskId}`, { start_day: nextStartDay });
        }

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: current.tasks.map((task) =>
                task.id === taskId ? { ...task, startDayKey: dayKey, statusTrail: [] } : task,
              ),
            },
          },
          ...touchSave(),
        };
      }),
    moveTask: (key, activeId, targetId) =>
      set((state) => {
        const current = state.weeks[key];

        if (!current || activeId === targetId) {
          return state;
        }

        const fromIndex = current.tasks.findIndex((task) => task.id === activeId);
        const toIndex = current.tasks.findIndex((task) => task.id === targetId);

        if (fromIndex === -1 || toIndex === -1) {
          return state;
        }

        queueMicrotask(() => {
          void syncTaskOrder(key);
        });

        return {
          ...state,
          weeks: {
            ...state.weeks,
            [key]: {
              ...current,
              tasks: arrayMove(current.tasks, fromIndex, toIndex),
            },
          },
          ...touchSave(),
        };
      }),
    // BLOCK-END: APP_STORE_TASK_ACTIONS
  };
  // BLOCK-END: APP_STORE_ACTIONS
});
// BLOCK-END: APP_STORE_MODULE
