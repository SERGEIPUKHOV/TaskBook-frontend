"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createCalendarSlice } from "@/store/slices/calendar.slice";
import { createDaysSlice } from "@/store/slices/days.slice";
import { createHabitsSlice } from "@/store/slices/habits.slice";
import { createMonthsSlice } from "@/store/slices/months.slice";
import { createSupervisionSlice } from "@/store/slices/supervision.slice";
import { createTrackerSlice } from "@/store/slices/tracker.slice";
import type { AppStore } from "@/store/slices/shared";
import { createTasksSlice } from "@/store/slices/tasks.slice";
import { createWeeksSlice } from "@/store/slices/weeks.slice";

// BLOCK-START: APP_STORE_MODULE
// Description: Root planner store that composes slice sinks and persists selected calendar triage preferences without caching server data.
export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      lastSavedAt: null,
      // BLOCK-START: APP_STORE_DAY_SLICE
      // Description: Day-state actions remain reachable through the root barrel export.
      ...createDaysSlice(...args),
      // BLOCK-END: APP_STORE_DAY_SLICE
      // BLOCK-START: APP_STORE_HABITS_SLICE
      // Description: Habit actions remain reachable through the root barrel export.
      ...createHabitsSlice(...args),
      // BLOCK-END: APP_STORE_HABITS_SLICE
      // BLOCK-START: APP_STORE_WEEK_SLICE
      // Description: Week cache and reflection actions remain reachable through the root barrel export.
      ...createWeeksSlice(...args),
      // BLOCK-END: APP_STORE_WEEK_SLICE
      // BLOCK-START: APP_STORE_TASKS_SLICE
      // Description: Task actions remain reachable through the root barrel export.
      ...createTasksSlice(...args),
      // BLOCK-END: APP_STORE_TASKS_SLICE
      ...createCalendarSlice(...args),
      ...createMonthsSlice(...args),
      ...createSupervisionSlice(...args),
      ...createTrackerSlice(...args),
    }),
    {
      name: "taskbook-app-store",
      partialize: (state) => ({
        dismissedImportIds: state.dismissedImportIds,
      }),
    },
  ),
);
// BLOCK-END: APP_STORE_MODULE
