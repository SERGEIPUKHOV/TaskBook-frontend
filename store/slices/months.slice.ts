import { api } from "@/lib/api";
import { getMonthKey } from "@/lib/dates";
import { buildMonthPlanPayload, mapMonthBundleToMonthData, type ApiMonthBundle } from "@/lib/planner-api";

import type { AppSliceCreator, AppStore, MonthsSlice } from "./shared";
import { createHabitLoadState, parseMonthKey, touchSave } from "./shared";

const monthPlanSaveTimers: Record<string, number | undefined> = {};

async function persistMonthPlan(get: () => AppStore, key: string) {
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
}

export async function loadMonthBundle(
  set: Parameters<AppSliceCreator<MonthsSlice>>[0],
  get: Parameters<AppSliceCreator<MonthsSlice>>[1],
  year: number,
  month: number,
  force = false,
) {
  const key = getMonthKey(year, month);
  const currentStatus = get().monthLoadStates[key];

  if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
    return;
  }

  const previousCount = get().months[key]?.habits.length ?? get().habitLoadStates[key]?.lastKnownCount ?? 3;

  set((state) => ({
    habitLoadStates: {
      ...state.habitLoadStates,
      [key]: createHabitLoadState("loading", previousCount),
    },
    monthLoadStates: {
      ...state.monthLoadStates,
      [key]: "loading",
    },
  }));

  try {
    const bundle = await api.get<ApiMonthBundle>(`/months/${year}/${month}/bundle`);
    const monthData = mapMonthBundleToMonthData(year, month, bundle);

    set((state) => ({
      habitLoadStates: {
        ...state.habitLoadStates,
        [key]: createHabitLoadState("ready", monthData.habits.length),
      },
      monthLoadStates: {
        ...state.monthLoadStates,
        [key]: "ready",
      },
      months: {
        ...state.months,
        [key]: monthData,
      },
    }));
  } catch {
    set((state) => ({
      habitLoadStates: {
        ...state.habitLoadStates,
        [key]: createHabitLoadState("error", previousCount),
      },
      monthLoadStates: {
        ...state.monthLoadStates,
        [key]: "error",
      },
    }));
  }
}

// BLOCK-START: MONTHS_SLICE_MODULE
// Description: Month cache and month-plan editing slice for the planner store.
export const createMonthsSlice: AppSliceCreator<MonthsSlice> = (set, get) => ({
  monthLoadStates: {},
  months: {},

  ensureMonth: (year, month) => {
    void loadMonthBundle(set, get, year, month);
  },

  updateMonthText: (key, field, value) =>
    set((state) => {
      const current = state.months[key];

      if (!current) {
        return state;
      }

      window.clearTimeout(monthPlanSaveTimers[key]);
      monthPlanSaveTimers[key] = window.setTimeout(() => {
        void persistMonthPlan(get, key);
      }, 350);

      return {
        ...touchSave(),
        months: {
          ...state.months,
          [key]: { ...current, [field]: value },
        },
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
        void persistMonthPlan(get, key);
      }, 350);

      return {
        ...touchSave(),
        months: {
          ...state.months,
          [key]: {
            ...current,
            [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
          },
        },
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
        void persistMonthPlan(get, key);
      }, 350);

      return {
        ...touchSave(),
        months: {
          ...state.months,
          [key]: {
            ...current,
            [field]: [...current[field], ""],
          },
        },
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
        void persistMonthPlan(get, key);
      }, 350);

      return {
        ...touchSave(),
        months: {
          ...state.months,
          [key]: {
            ...current,
            [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
          },
        },
      };
    }),
});
// BLOCK-END: MONTHS_SLICE_MODULE
