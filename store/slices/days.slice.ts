import { api } from "@/lib/api";
import type { MetricName } from "@/lib/planner-types";
import { clamp } from "@/lib/utils";

import type { AppSliceCreator, DaysSlice } from "./shared";
import { parseMonthKey, toDailyState, touchSave, type DailyStateEntry } from "./shared";

// BLOCK-START: DAYS_SLICE_MODULE
// Description: Day-state editing slice for month-scoped metrics.
export const createDaysSlice: AppSliceCreator<DaysSlice> = (set, get) => ({
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
          ...touchSave(),
          months: {
            ...state.months,
            [key]: {
              ...month,
              dailyStates: month.dailyStates.map((entry) =>
                entry.day === day ? { ...entry, [metric]: clamped } : entry,
              ),
            },
          },
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
            ...touchSave(),
            months: {
              ...state.months,
              [key]: {
                ...month,
                dailyStates: alreadyHas
                  ? month.dailyStates.map((item) => (item.day === mappedEntry.day ? mappedEntry : item))
                  : [...month.dailyStates, mappedEntry].sort((left, right) => left.day - right.day),
              },
            },
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
          ...touchSave(),
          months: {
            ...state.months,
            [key]: {
              ...month,
              dailyStates: month.dailyStates.map((entry) =>
                entry.day === day ? { ...entry, ...clamped } : entry,
              ),
            },
          },
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
            ...touchSave(),
            months: {
              ...state.months,
              [key]: {
                ...month,
                dailyStates: alreadyHas
                  ? month.dailyStates.map((item) => (item.day === mappedEntry.day ? mappedEntry : item))
                  : [...month.dailyStates, mappedEntry].sort((left, right) => left.day - right.day),
              },
            },
          };
        });
      });
  },
});
// BLOCK-END: DAYS_SLICE_MODULE
