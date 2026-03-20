import { isValid, parseISO } from "date-fns";

import {
  dayIsInMonth,
  dayIsInWeek,
  getDayReference,
  getISOWeekReference,
  getISOWeekStart,
  getLastDayOfMonthCapped,
  getLastDayOfWeekCapped,
  getLastWeekOfMonthCapped,
  type MonthReference,
  type WeekReference,
} from "@/lib/dates";

export type NavigationContext = {
  month: number;
  weekRef: WeekReference | null;
  year: number;
};

type DayNavContext = {
  context: NavigationContext;
  lastDay: string | null;
  pathname: string;
  today: Date;
};

type MonthNavContext = {
  context: NavigationContext;
  lastDay: string | null;
  lastMonth: MonthReference | null;
  lastWeek: WeekReference | null;
  pathname: string;
  today: Date;
};

type WeekNavContext = {
  context: NavigationContext;
  lastDay: string | null;
  lastWeek: WeekReference | null;
  pathname: string;
  today: Date;
};

function getMonthHref(ref: MonthReference): string {
  return `/month/${ref.year}/${ref.month}`;
}

function getWeekHref(ref: WeekReference): string {
  return `/week/${ref.year}/${ref.week}`;
}

function getDayHref(date: Date): string {
  const ref = getDayReference(date);
  return `/day/${ref.year}/${ref.month}/${ref.day}`;
}

function getIsoDayHref(day: string): string | null {
  const parsedDay = parseISO(day);

  if (Number.isNaN(parsedDay.getTime())) {
    return null;
  }

  return getDayHref(parsedDay);
}

function weekIsInMonth(ref: WeekReference, year: number, month: number): boolean {
  const weekStart = getISOWeekStart(ref.year, ref.week);
  return weekStart.getFullYear() === year && weekStart.getMonth() + 1 === month;
}

export function currentContext(pathname: string): NavigationContext {
  const today = new Date();
  const defaultMonth = { year: today.getFullYear(), month: today.getMonth() + 1, weekRef: null };

  if (pathname.startsWith("/month/")) {
    const parts = pathname.split("/");
    const year = Number(parts[2]);
    const month = Number(parts[3]);

    if (Number.isFinite(year) && Number.isFinite(month)) {
      return { year, month, weekRef: null };
    }
  }

  if (pathname.startsWith("/week/")) {
    const parts = pathname.split("/");
    const year = Number(parts[2]);
    const week = Number(parts[3]);

    if (Number.isFinite(year) && Number.isFinite(week)) {
      const weekStart = getISOWeekStart(year, week);
      return {
        year: weekStart.getFullYear(),
        month: weekStart.getMonth() + 1,
        weekRef: { year, week },
      };
    }
  }

  if (pathname.startsWith("/day/")) {
    const parts = pathname.split("/");
    const year = Number(parts[2]);
    const month = Number(parts[3]);
    const day = Number(parts[4]);

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const targetDate = new Date(year, month - 1, day);
      if (
        targetDate.getFullYear() === year &&
        targetDate.getMonth() + 1 === month &&
        targetDate.getDate() === day
      ) {
        return {
          year,
          month,
          weekRef: getISOWeekReference(targetDate),
        };
      }
    }
  }

  return defaultMonth;
}

export function getMonthNavHref({ context, lastDay, lastMonth, pathname, today }: MonthNavContext): string {
  if (pathname.startsWith("/week/") && context.weekRef) {
    if (lastDay && dayIsInWeek(lastDay, context.weekRef.year, context.weekRef.week)) {
      const parsedDay = parseISO(lastDay);

      if (isValid(parsedDay)) {
        return getMonthHref({ year: parsedDay.getFullYear(), month: parsedDay.getMonth() + 1 });
      }
    }

    return getMonthHref({ year: context.year, month: context.month });
  }

  if (pathname.startsWith("/day/") || pathname.startsWith("/month/")) {
    return getMonthHref({ year: context.year, month: context.month });
  }

  if (lastMonth) {
    return getMonthHref(lastMonth);
  }

  return getMonthHref({ year: today.getFullYear(), month: today.getMonth() + 1 });
}

export function getWeekNavHref({ context, lastDay, lastWeek, pathname, today }: WeekNavContext): string {
  if (pathname.startsWith("/day/") && context.weekRef) {
    return getWeekHref(context.weekRef);
  }

  if (pathname.startsWith("/month/")) {
    if (
      lastDay &&
      lastWeek &&
      dayIsInMonth(lastDay, context.year, context.month) &&
      dayIsInWeek(lastDay, lastWeek.year, lastWeek.week)
    ) {
      return getWeekHref(lastWeek);
    }

    const targetWeek =
      lastWeek && weekIsInMonth(lastWeek, context.year, context.month)
        ? lastWeek
        : getLastWeekOfMonthCapped(context.year, context.month, today);

    return getWeekHref(targetWeek);
  }

  return getWeekHref(lastWeek ?? getISOWeekReference(today));
}

export function getDayNavHref({ context, lastDay, pathname, today }: DayNavContext): string {
  if (pathname.startsWith("/week/") && context.weekRef) {
    const persistedDayHref =
      lastDay && dayIsInWeek(lastDay, context.weekRef.year, context.weekRef.week) ? getIsoDayHref(lastDay) : null;

    return persistedDayHref ?? getDayHref(getLastDayOfWeekCapped(context.weekRef.year, context.weekRef.week, today));
  }

  if (pathname.startsWith("/month/")) {
    const persistedDayHref = lastDay && dayIsInMonth(lastDay, context.year, context.month) ? getIsoDayHref(lastDay) : null;

    return persistedDayHref ?? getDayHref(getLastDayOfMonthCapped(context.year, context.month, today));
  }

  return getIsoDayHref(lastDay ?? "") ?? getDayHref(today);
}
