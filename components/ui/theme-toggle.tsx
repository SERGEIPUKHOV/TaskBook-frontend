"use client";

import { useEffect, useRef, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

type ThemeToggleProps = {
  className?: string;
  savedLabel?: string;
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

export function ThemeToggle({ className, savedLabel }: ThemeToggleProps) {
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
          isLabelVisible || (!isLabelVisible && !labelInfo && savedLabel)
            ? "translate-x-0 opacity-100"
            : "translate-x-1 opacity-0",
        )}
      >
        {labelInfo ? (
          <>
            <span className="text-sm font-medium text-ink">{labelInfo.label}</span>
            <span className="text-xs text-muted">{labelInfo.description}</span>
          </>
        ) : savedLabel ? (
          <span className="text-sm text-muted">{savedLabel}</span>
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
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-paper text-muted shadow-sm">
            <svg aria-hidden="true" fill="currentColor" viewBox="0 0 16 16" className="h-2.5 w-2.5">
              <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7 8a1 1 0 1 1 2 0A1 1 0 0 1 7 8Z" />
              <path d="M9.5 1h-3l-.5 1.5-1.3.75L3 2.8 1.8 4l.45 1.7L1.5 7v2l.75 1.3L1.8 12 3 13.2l1.7-.45L6 13.5l1.5.5h3l.5-1.5 1.3-.75 1.7.45L15.2 11l-.45-1.7.75-1.3V6l-.75-1.3.45-1.7L14 1.8l-1.7.45L11 1.5 9.5 1Zm-1.5 1h1l.4 1.2.6.35 1.25-.33.7.7-.33 1.25.35.6L13 6.5v1l-1.2.4-.35.6.33 1.25-.7.7-1.25-.33-.6.35L8.5 11.5h-1l-.4-1.2-.6-.35-1.25.33-.7-.7.33-1.25-.35-.6L3 7.5v-1l1.2-.4.35-.6-.33-1.25.7-.7 1.25.33.6-.35L8 2Z" />
            </svg>
          </span>
        ) : null}
      </button>
    </div>
  );
}
