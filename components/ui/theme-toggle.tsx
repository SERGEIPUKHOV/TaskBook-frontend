"use client";

import { useEffect, useRef, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

type ThemeToggleProps = {
  className?: string;
};

const LABELS: Record<
  ThemePreference,
  {
    description: string;
    label: string;
  }
> = {
  dark: {
    description: "Всегда тёмная",
    label: "Тёмная",
  },
  light: {
    description: "Всегда светлая",
    label: "Светлая",
  },
  system: {
    description: "Следует системе",
    label: "Системная",
  },
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const hideTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const [activeLabel, setActiveLabel] = useState<ThemePreference | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(false);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const theme = useThemeStore((state) => state.theme);
  const labelInfo = activeLabel ? LABELS[activeLabel] : null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  function handleClick() {
    cycleTheme();
    const nextTheme = useThemeStore.getState().theme;

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    if (fadeTimerRef.current) {
      window.clearTimeout(fadeTimerRef.current);
    }

    setActiveLabel(nextTheme);
    setIsLabelVisible(true);

    hideTimerRef.current = window.setTimeout(() => {
      setIsLabelVisible(false);
      fadeTimerRef.current = window.setTimeout(() => {
        setActiveLabel(null);
      }, 200);
    }, 1500);
  }

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-[calc(100%+0.625rem)] flex flex-col items-end whitespace-nowrap transition-all duration-200",
          isLabelVisible ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0",
        )}
      >
        {labelInfo ? (
          <>
            <span className="text-sm font-medium text-ink">{labelInfo.label}</span>
            <span className="text-xs text-muted">{labelInfo.description}</span>
          </>
        ) : null}
      </div>

      <button
        aria-label={`Тема: ${LABELS[theme].label}. Переключить тему`}
        className="group relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line bg-paper/92 text-ink shadow-paper backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        onClick={handleClick}
        title={`Тема: ${LABELS[theme].label}`}
        type="button"
      >
        <span className="sr-only">Переключить тему</span>
        <span className="relative h-5 w-5">
          <SunIcon
            className={cn(
              "absolute inset-0 transition-all duration-200",
              isMounted && resolvedTheme === "light"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-75 opacity-0",
            )}
          />
          <MoonIcon
            className={cn(
              "absolute inset-0 transition-all duration-200",
              isMounted && resolvedTheme === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-75 opacity-0",
            )}
          />
          {!isMounted ? <span className="absolute inset-0 rounded-full bg-line/60" /> : null}
        </span>
        {theme === "system" ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-paper bg-accent shadow-sm" />
        ) : null}
      </button>
    </div>
  );
}
