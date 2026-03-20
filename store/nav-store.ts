"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MonthReference, WeekReference } from "@/lib/dates";

type NavState = {
  lastDay: string | null;
  lastMonth: MonthReference | null;
  lastWeek: WeekReference | null;
  setLastDay: (day: string) => void;
  setLastMonth: (ref: MonthReference) => void;
  setLastWeek: (ref: WeekReference) => void;
};

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      lastDay: null,
      lastMonth: null,
      lastWeek: null,
      setLastDay: (day) => {
        set({ lastDay: day });
      },
      setLastMonth: (ref) => {
        set({ lastMonth: ref });
      },
      setLastWeek: (ref) => {
        set({ lastWeek: ref });
      },
    }),
    {
      name: "nav-context",
      partialize: (state) => ({
        lastDay: state.lastDay,
        lastMonth: state.lastMonth,
        lastWeek: state.lastWeek,
      }),
    },
  ),
);
