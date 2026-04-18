"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

import { TrackerSidebar } from "./tracker-sidebar";
import { TrackerSprintSelector } from "./tracker-sprint-selector";

export function TrackerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const fetchTrackerSprints = useAppStore((state) => state.fetchTrackerSprints);

  useEffect(() => {
    if (!user?.tasktrackerEnabled || viewingAs) return;
    void fetchTrackerSprints();
  }, [fetchTrackerSprints, user?.tasktrackerEnabled, viewingAs]);

  const pageTitle = pathname === "/tracker/overview" ? "Обзор дедлайнов" : "Стратегическое планирование";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-paper-fade opacity-80" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[280px] shrink-0 border-r border-line/70 bg-paper/55 backdrop-blur-xl md:block">
          <Suspense fallback={<div className="h-full p-5" />}>
            <TrackerSidebar />
          </Suspense>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/88 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1220px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted">TaskTracker</div>
                <div className="mt-1 text-lg font-semibold text-ink">{pageTitle}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                  href="/dashboard"
                >
                  ← TaskBook
                </Link>
                <ThemeToggle className="shrink-0" labelInFlow />
              </div>
            </div>
            {/* Mobile: sprint selector */}
            <div className="border-t border-line/60 px-4 py-3 md:hidden">
              <Suspense fallback={<div className="h-10" />}>
                <TrackerSprintSelector />
              </Suspense>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6 lg:px-8">
              {!hasHydrated && !user ? (
                <div className="paper-panel h-[520px] animate-pulse rounded-[32px] border border-line bg-paper/60" />
              ) : viewingAs ? (
                <div className="paper-panel rounded-[32px] p-6 text-sm leading-7 text-muted">
                  В режиме наблюдения TaskTracker отключён. Сначала вернись к своему аккаунту.
                </div>
              ) : user?.tasktrackerEnabled ? (
                children
              ) : (
                <div className="paper-panel rounded-[32px] p-6 text-sm leading-7 text-muted">
                  Для этого аккаунта TaskTracker пока не включён.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
