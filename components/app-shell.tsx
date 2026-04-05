"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/navigation/mobile-nav";
import { Sidebar } from "@/components/navigation/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignalIcon } from "@/components/ui/icons";
import type { ApiError } from "@/lib/auth-types";
import { isPublicAuthPath } from "@/lib/auth-constants";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

function sectionTitle(pathname: string): string {
  if (pathname === "/profile") {
    return "Профиль";
  }

  if (pathname.startsWith("/month")) {
    return "Месячный разворот";
  }

  if (pathname.startsWith("/day")) {
    return "День";
  }

  if (pathname.startsWith("/week")) {
    return "Недельный разворот";
  }

  return "Дашборд";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastSavedAt = useAppStore((state) => state.lastSavedAt);
  const clearSession = useAuthStore((state) => state.clearSession);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const syncUser = useAuthStore((state) => state.syncUser);
  const user = useAuthStore((state) => state.user);
  const [isOnline, setIsOnline] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const isAuthRoute = isPublicAuthPath(pathname);

  useEffect(() => {
    const syncStatus = () => setIsOnline(window.navigator.onLine);

    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  useEffect(() => {
    if (!lastSavedAt) {
      return;
    }

    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [lastSavedAt]);

  useEffect(() => {
    if (isAuthRoute || !hasHydrated || user) {
      return;
    }

    let isCancelled = false;

    syncUser().catch((error) => {
      if (isCancelled) {
        return;
      }

      if ((error as ApiError).status === 401) {
        clearSession();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [clearSession, hasHydrated, isAuthRoute, syncUser, user]);

  if (isAuthRoute) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-paper-fade opacity-80" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted">TaskBook</div>
                <div className="text-lg font-semibold text-ink">{sectionTitle(pathname)}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ThemeToggle className="shrink-0" savedLabel={showSaved ? "Сохранено" : undefined} />
                {!isOnline && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3 py-1.5 text-danger">
                    <SignalIcon className="h-4 w-4" />
                    Оффлайн
                  </span>
                )}
              </div>
            </div>
          </header>
          <main className="page-content flex-1 pb-24 md:pb-8">
            <div className="mx-auto min-w-0 max-w-[1200px] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
