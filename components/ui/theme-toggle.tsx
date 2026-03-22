"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

type ThemeToggleProps = {
  className?: string;
  side?: "bottom" | "top";
};

const options: Array<{
  description: string;
  label: string;
  value: ThemePreference;
}> = [
  {
    description: "Всегда светлая",
    label: "Светлая",
    value: "light",
  },
  {
    description: "Всегда тёмная",
    label: "Тёмная",
    value: "dark",
  },
  {
    description: "Следует системе",
    label: "Системная",
    value: "system",
  },
];

function optionIcon(value: ThemePreference, isActive: boolean) {
  if (value === "light") {
    return <SunIcon className={cn("h-4 w-4", isActive && "text-accent")} />;
  }

  if (value === "dark") {
    return <MoonIcon className={cn("h-4 w-4", isActive && "text-accent")} />;
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-full border border-line bg-canvas px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted",
        isActive && "border-accent/40 bg-accent/10 text-accent",
      )}
    >
      OS
    </span>
  );
}

export function ThemeToggle({ className, side = "bottom" }: ThemeToggleProps) {
  const controlId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        aria-controls={controlId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Переключить тему"
        className={cn(
          "group relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line bg-paper/92 text-ink shadow-paper backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          isOpen && "border-accent/55 text-accent",
        )}
        onClick={() => setIsOpen((current) => !current)}
        title="Переключить тему"
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

      {isOpen ? (
        <div
          id={controlId}
          role="menu"
          aria-label="Выбор темы"
          className={cn(
            "absolute right-0 z-50 w-[220px] rounded-[26px] border border-line bg-paper/96 p-2 shadow-[0_18px_40px_rgb(0_0_0_/0.16)] backdrop-blur-xl",
            side === "top" ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
          )}
        >
          <div className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Цветовая тема
          </div>
          <div className="space-y-1">
            {options.map((option) => {
              const isActive = option.value === theme;

              return (
                <button
                  key={option.value}
                  aria-checked={isActive}
                  className={cn(
                    "flex min-h-[44px] w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                    isActive ? "bg-canvas text-ink" : "text-muted hover:bg-canvas/80 hover:text-ink",
                  )}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper">
                    {optionIcon(option.value, isActive)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
