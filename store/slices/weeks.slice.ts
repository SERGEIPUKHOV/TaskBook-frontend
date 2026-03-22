import { api } from "@/lib/api";
import { getWeekKey } from "@/lib/dates";
import {
  createEmptyWeekEntryMeta,
  mapWeekBundleToWeekData,
  type ApiWeekBundle,
} from "@/lib/planner-api";

import type { AppSliceCreator, WeeksSlice } from "./shared";
import { isPersistedId, parseWeekKey, touchSave, type WeekEntryResponse } from "./shared";

const weekPatchSaveTimers: Record<string, number | undefined> = {};

async function persistWeekPatch(get: Parameters<AppSliceCreator<WeeksSlice>>[1], key: string) {
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
}

async function loadWeekBundle(
  set: Parameters<AppSliceCreator<WeeksSlice>>[0],
  get: Parameters<AppSliceCreator<WeeksSlice>>[1],
  year: number,
  week: number,
  force = false,
) {
  const key = getWeekKey(year, week);
  const currentStatus = get().weekLoadStates[key];

  if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
    return;
  }

  set((state) => ({
    weekLoadStates: {
      ...state.weekLoadStates,
      [key]: "loading",
    },
  }));

  try {
    const bundle = await api.get<ApiWeekBundle>(`/weeks/${year}/${week}/bundle`);
    const { entryMeta, week: weekData } = mapWeekBundleToWeekData(bundle);

    set((state) => ({
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
      weekLoadStates: {
        ...state.weekLoadStates,
        [key]: "error",
      },
    }));
  }
}

// BLOCK-START: WEEKS_SLICE_MODULE
// Description: Week cache and reflection editing slice for the planner store.
export const createWeeksSlice: AppSliceCreator<WeeksSlice> = (set, get) => ({
  weekEntryMeta: {},
  weekLoadStates: {},
  weeks: {},

  ensureWeek: (year, week) => {
    void loadWeekBundle(set, get, year, week);
  },

  updateWeekText: (key, field, value) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current) {
        return state;
      }

      window.clearTimeout(weekPatchSaveTimers[key]);
      weekPatchSaveTimers[key] = window.setTimeout(() => {
        void persistWeekPatch(get, key);
      }, 250);

      return {
        ...touchSave(),
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
      };
    }),

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
          ...touchSave(),
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
        };
      }

      return {
        ...touchSave(),
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
      };
    }),
});
// BLOCK-END: WEEKS_SLICE_MODULE
