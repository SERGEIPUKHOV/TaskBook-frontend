"use client";

import { useEffect } from "react";

import { THEME_MEDIA_QUERY, resolveTheme } from "@/lib/theme";
import { useThemeStore } from "@/store/theme-store";

function attachMediaQueryListener(
  mediaQuery: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);

    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }

  mediaQuery.addListener(listener);

  return () => {
    mediaQuery.removeListener(listener);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);
  const setResolvedTheme = useThemeStore((state) => state.setResolvedTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const syncResolvedTheme = (matches: boolean) => {
      setResolvedTheme(resolveTheme(theme, matches));
    };

    syncResolvedTheme(mediaQuery.matches);

    if (theme !== "system") {
      return;
    }

    return attachMediaQueryListener(mediaQuery, (event) => {
      syncResolvedTheme(event.matches);
    });
  }, [setResolvedTheme, theme]);

  return <>{children}</>;
}
