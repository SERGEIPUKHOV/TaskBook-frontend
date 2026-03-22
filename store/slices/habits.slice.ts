import { api } from "@/lib/api";

import { loadMonthBundle } from "./months.slice";
import type { AddHabitResult, AppSliceCreator, HabitsSlice } from "./shared";
import { createHabitLoadState, parseMonthKey, touchSave } from "./shared";

// BLOCK-START: HABITS_SLICE_MODULE
// Description: Habit loading state and month-scoped habit CRUD/logging actions.
export const createHabitsSlice: AppSliceCreator<HabitsSlice> = (set, get) => ({
  habitLoadStates: {},

  fetchMonthHabits: async (year, month) => {
    await loadMonthBundle(set, get, year, month, true);
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
        ...touchSave(),
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
      };
    }),

  updateHabitName: (key, habitId, value) =>
    set((state) => {
      if (!state.months[key]) {
        return state;
      }

      void api.patch(`/habits/${habitId}`, { name: value });

      return {
        ...touchSave(),
        months: Object.fromEntries(
          Object.entries(state.months).map(([monthKey, month]) => [
            monthKey,
            {
              ...month,
              habits: month.habits.map((habit) => (habit.id === habitId ? { ...habit, name: value } : habit)),
            },
          ]),
        ),
      };
    }),

  addHabit: async (key, name) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { ok: false, reason: "empty_name" } as const satisfies AddHabitResult;
    }

    const current = get().months[key];
    const parsed = parseMonthKey(key);

    if (!current || !parsed) {
      return { ok: false, reason: "missing_month" } as const satisfies AddHabitResult;
    }

    const normalizedName = trimmedName.toLocaleLowerCase();
    const hasDuplicate = current.habits.some(
      (habit) => habit.name.trim().toLocaleLowerCase() === normalizedName,
    );

    if (hasDuplicate) {
      return { ok: false, reason: "duplicate_name" } as const satisfies AddHabitResult;
    }

    try {
      const habit = await api.post<{ id: string; name: string; order: number }>(
        `/months/${parsed.year}/${parsed.month}/habits`,
        { name: trimmedName },
      );

      set((state) => ({
        ...touchSave(),
        habitLoadStates: Object.fromEntries(
          Object.entries(state.habitLoadStates).map(([monthKey, loadState]) => {
            if (monthKey < key) {
              return [monthKey, loadState];
            }

            return [
              monthKey,
              createHabitLoadState(
                loadState.status === "error" ? "ready" : loadState.status,
                loadState.lastKnownCount + 1,
              ),
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
      }));

      return { ok: true } as const satisfies AddHabitResult;
    } catch (error) {
      if ((error as Error & { status?: number }).status === 409) {
        return { ok: false, reason: "duplicate_name" } as const satisfies AddHabitResult;
      }

      return { ok: false, reason: "missing_month" } as const satisfies AddHabitResult;
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
        ...touchSave(),
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
      };
    }),
});
// BLOCK-END: HABITS_SLICE_MODULE
