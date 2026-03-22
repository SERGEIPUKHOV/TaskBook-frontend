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
          <svg
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.69.07-1.08 0-.39-.03-.74-.07-1.08l2.3-1.8c.21-.16.27-.46.13-.71l-2.18-3.78a.54.54 0 0 0-.65-.24l-2.71 1.09c-.57-.44-1.17-.81-1.84-1.09L14.5 2.42A.53.53 0 0 0 14 2h-4c-.26 0-.47.18-.52.42L9.13 5.17C8.46 5.45 7.86 5.82 7.3 6.26L4.59 5.17a.54.54 0 0 0-.65.24L1.76 9.19c-.14.25-.08.55.13.71l2.3 1.8C4.15 12.04 4.12 12.37 4.12 12s.03.74.07 1.08l-2.3 1.8c-.21.16-.27.46-.13.71l2.18 3.78c.13.25.4.34.65.24l2.71-1.09c.57.44 1.17.81 1.84 1.09l.36 2.75c.05.24.26.42.52.42h4c.26 0 .47-.18.52-.42l.36-2.75c.67-.28 1.27-.65 1.84-1.09l2.71 1.09c.25.1.52.01.65-.24l2.18-3.78c.14-.25.08-.55-.13-.71l-2.3-1.8z" />
          </svg>
        ) : null}
      </button>
    </div>
  );
}
