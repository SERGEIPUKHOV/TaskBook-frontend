"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

import {
  formatDayShort,
  formatShortDate,
  getAdjacentMonth,
  getAdjacentWeek,
  getMonthDate,
  getWeekDays,
  getWeeksForMonth,
} from "@/lib/dates";
import { currentContext, getDayNavHref, getMonthNavHref, getWeekNavHref } from "@/lib/nav-hrefs";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DayIcon,
  DashboardIcon,
  LogOutIcon,
  UserIcon,
  WeekIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";

function navClassName(isActive: boolean): string {
  return cn(
    "flex items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors duration-150 md:px-3.5 md:py-3.5 xl:justify-start xl:px-3 xl:py-3",
    isActive
      ? "border-ink bg-ink text-canvas shadow-paper"
      : "border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink",
  );
}

function getSpreadHref(pathname: string, year: number, month: number): string {
  if (!pathname.startsWith("/week/")) {
    return `/month/${year}/${month}`;
  }

  const weeks = getWeeksForMonth(year, month);
  // weeks[0] often starts in the previous month (startOfISOWeek can land there).
  // Pick the first week whose Monday actually falls inside the target month —
  // that ensures currentContext will resolve to the correct month after navigation,
  // preventing the forward-arrow infinite-loop bug.
  const firstInMonth = weeks.find(
    (w) => w.start.getFullYear() === year && w.start.getMonth() + 1 === month,
  );
  const target = firstInMonth ?? weeks[0];

  return target ? `/week/${target.year}/${target.week}` : `/month/${year}/${month}`;
}

function getDayHref(date: Date): string {
  return `/day/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const lastDay = useNavStore((state) => state.lastDay);
  const lastMonth = useNavStore((state) => state.lastMonth);
  const lastWeek = useNavStore((state) => state.lastWeek);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const context = currentContext(pathname);
  const today = new Date();
  const monthDate = getMonthDate(context.year, context.month);
  const prevMonth = getAdjacentMonth(context.year, context.month, -1);
  const nextMonth = getAdjacentMonth(context.year, context.month, 1);
  const weeks = getWeeksForMonth(context.year, context.month);
  const isDayContext = pathname.startsWith("/day/") && context.weekRef !== null;
  const weekRef = isDayContext ? context.weekRef : null;
  const weekDays = weekRef ? getWeekDays(weekRef.year, weekRef.week) : [];
  const weekRangeLabel = weekDays.length === 7 ? `${formatShortDate(weekDays[0])} — ${formatShortDate(weekDays[6])}` : "";
  const prevWeekRef = weekRef ? getAdjacentWeek(weekRef.year, weekRef.week, -1) : null;
  const nextWeekRef = weekRef ? getAdjacentWeek(weekRef.year, weekRef.week, 1) : null;
  const prevMonthHref = getSpreadHref(pathname, prevMonth.year, prevMonth.month);
  const nextMonthHref = getSpreadHref(pathname, nextMonth.year, nextMonth.month);
  const prevWeekDayHref = prevWeekRef ? getDayHref(getWeekDays(prevWeekRef.year, prevWeekRef.week)[0]) : prevMonthHref;
  const nextWeekDayHref = nextWeekRef ? getDayHref(getWeekDays(nextWeekRef.year, nextWeekRef.week)[0]) : nextMonthHref;
  const primaryMonthHref = getMonthNavHref({ context, lastDay, lastMonth, lastWeek, pathname, today });
  const primaryDayHref = getDayNavHref({ context, lastDay, pathname, today });
  const primaryWeekHref = getWeekNavHref({ context, lastDay, lastWeek, pathname, today });

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      router.replace("/login");
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-24 shrink-0 border-r border-line/70 bg-paper/70 px-3 py-5 backdrop-blur-xl md:flex xl:w-64 xl:px-5">
      <div className="flex h-full w-full flex-col">
        <div className="mb-8 flex items-center justify-center gap-3 px-0 xl:justify-start xl:px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-paper shadow-paper md:h-12 md:w-12 xl:h-11 xl:w-11">
            <CalendarIcon className="h-5 w-5 text-accent md:h-6 md:w-6 xl:h-5 xl:w-5" />
          </div>
          <div className="hidden xl:block">
            <div className="text-xs uppercase tracking-[0.24em] text-muted">Planner</div>
            <div className="text-lg font-semibold text-ink">TaskBook</div>
          </div>
        </div>

        <nav className="space-y-2">
          <Link className={navClassName(pathname === "/dashboard")} href="/dashboard">
            <DashboardIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
            <span className="hidden xl:inline">Дашборд</span>
          </Link>
          <Link className={navClassName(pathname.startsWith("/month/"))} href={primaryMonthHref}>
            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
            <span className="hidden xl:inline">Месяц</span>
          </Link>
          {primaryWeekHref && (
            <Link className={navClassName(pathname.startsWith("/week/"))} href={primaryWeekHref}>
              <WeekIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
              <span className="hidden xl:inline">Неделя</span>
            </Link>
          )}
          <Link className={navClassName(pathname.startsWith("/day/"))} href={primaryDayHref}>
            <DayIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
            <span className="hidden xl:inline">День</span>
          </Link>
        </nav>

        <div className="mt-8 hidden rounded-[28px] border border-line bg-canvas/70 p-4 xl:block">
          <div className="flex items-center justify-between text-muted">
            <Link
              aria-label={isDayContext ? "Предыдущая неделя" : "Предыдущий месяц"}
              className="rounded-full border border-line p-1.5 transition-colors hover:border-accent hover:text-accent"
              href={isDayContext ? prevWeekDayHref : prevMonthHref}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Разворот</div>
              {weekRef ? (
                <>
                  <div className="text-sm font-medium text-ink">Неделя {weekRef.week}</div>
                  <div className="text-xs text-muted">{weekRangeLabel}</div>
                </>
              ) : (
                <div className="whitespace-nowrap text-sm font-medium text-ink">
                  {monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </div>
              )}
            </div>
            <Link
              aria-label={isDayContext ? "Следующая неделя" : "Следующий месяц"}
              className="rounded-full border border-line p-1.5 transition-colors hover:border-accent hover:text-accent"
              href={isDayContext ? nextWeekDayHref : nextMonthHref}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {isDayContext
              ? weekDays.map((dayDate) => {
                  const href = getDayHref(dayDate);
                  const isActive = pathname === href;

                  return (
                    <Link
                      key={href}
                      className={cn(
                        "block rounded-2xl border px-3 py-2.5 transition-colors",
                        isActive
                          ? "border-ink bg-ink text-canvas"
                          : "border-transparent bg-paper/70 text-muted hover:border-line hover:text-ink",
                      )}
                      href={href}
                    >
                      <div className="text-sm font-medium">{formatDayShort(dayDate)}</div>
                      <div className={cn("text-xs", isActive ? "text-canvas/80" : "text-muted")}>
                        {formatShortDate(dayDate)}
                      </div>
                    </Link>
                  );
                })
              : weeks.map((weekItem, index) => {
                  const isActive = pathname === `/week/${weekItem.year}/${weekItem.week}`;

                  return (
                    <Link
                      key={`${weekItem.year}-${weekItem.week}`}
                      className={cn(
                        "block rounded-2xl border px-3 py-2.5 transition-colors",
                        isActive
                          ? "border-ink bg-ink text-canvas"
                          : "border-transparent bg-paper/70 text-muted hover:border-line hover:text-ink",
                      )}
                      href={`/week/${weekItem.year}/${weekItem.week}`}
                    >
                      <div className="text-sm font-medium">Нед. {index + 1}</div>
                      <div className={cn("text-xs", isActive ? "text-canvas/80" : "text-muted")}>
                        {weekItem.label}
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>

        <div className="mt-auto">
          <div className="rounded-[28px] border border-line bg-paper/90 p-2.5 shadow-paper xl:p-4">
            <div className="hidden text-xs uppercase tracking-[0.2em] text-muted xl:block">Аккаунт</div>
            <div className="mt-2 hidden break-all text-sm font-medium text-ink xl:block">
              {user?.email ?? "Профиль пользователя"}
            </div>
            <div className="space-y-2 xl:mt-4">
              <Link className={navClassName(pathname === "/profile")} href="/profile">
                <UserIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
                <span className="hidden xl:inline">Профиль</span>
              </Link>
              <button
                className={cn(
                  "flex w-full items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors duration-150 md:px-3.5 md:py-3.5 xl:justify-start xl:px-3 xl:py-3",
                  isLoggingOut
                    ? "cursor-not-allowed border-line bg-canvas text-muted"
                    : "border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink",
                )}
                disabled={isLoggingOut}
                onClick={() => {
                  void handleLogout();
                }}
                type="button"
              >
                <LogOutIcon className="h-5 w-5 md:h-6 md:w-6 xl:h-5 xl:w-5" />
                <span className="hidden xl:inline">{isLoggingOut ? "Выходим..." : "Выйти"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
