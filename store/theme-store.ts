"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  resolveTheme,
  themeColorFor,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeState = {
  hasHydrated: boolean;
  resolvedTheme: ResolvedTheme;
  theme: ThemePreference;
  cycleTheme: () => void;
  markHydrated: () => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches;
}

function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.content = themeColorFor(resolvedTheme);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      resolvedTheme: "light",
      theme: "system",
      markHydrated: () => {
        set({ hasHydrated: true });
      },
      setResolvedTheme: (resolvedTheme) => {
        applyResolvedTheme(resolvedTheme);
        set({ resolvedTheme });
      },
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme, getSystemPrefersDark());
        applyResolvedTheme(resolvedTheme);
        set({ resolvedTheme, theme });
      },
      toggleTheme: () => {
        const nextTheme = get().resolvedTheme === "dark" ? "light" : "dark";
        get().setTheme(nextTheme);
      },
      cycleTheme: () => {
        const cycle: ThemePreference[] = ["light", "dark", "system"];
        const currentTheme = get().theme;
        const nextIndex = (cycle.indexOf(currentTheme) + 1) % cycle.length;
        get().setTheme(cycle[nextIndex]);
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        const resolvedTheme = resolveTheme(state?.theme ?? "system", getSystemPrefersDark());
        state?.markHydrated();
        state?.setResolvedTheme(resolvedTheme);
      },
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
