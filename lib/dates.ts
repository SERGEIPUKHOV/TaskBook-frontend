import {
  addDays,
  addMonths,
  addWeeks,
  endOfISOWeek,
  endOfMonth,
  format,
  getDaysInMonth,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  startOfMonth,
} from "date-fns";
import { ru } from "date-fns/locale";

export type MonthReference = {
  year: number;
  month: number;
};

export type WeekReference = {
  year: number;
  week: number;
};

export type DayReference = {
  year: number;
  month: number;
  day: number;
};

type MonthWeekItem = WeekReference & {
  start: Date;
  end: Date;
  label: string;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getWeekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getMonthDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = getMonthDate(year, month);
  return Array.from({ length: getDaysInMonth(start) }, (_, index) => addDays(start, index));
}

export function getISOWeekStart(year: number, week: number): Date {
  const isoWeekOneStart = startOfISOWeek(new Date(year, 0, 4));
  return addWeeks(isoWeekOneStart, week - 1);
}

export function getWeekDays(year: number, week: number): Date[] {
  const start = getISOWeekStart(year, week);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeeksForMonth(year: number, month: number): MonthWeekItem[] {
  const monthStart = startOfMonth(getMonthDate(year, month));
  const monthEnd = endOfMonth(monthStart);
  const weeks: MonthWeekItem[] = [];

  for (
    let cursor = startOfISOWeek(monthStart);
    cursor <= monthEnd;
    cursor = addWeeks(cursor, 1)
  ) {
    const end = endOfISOWeek(cursor);
    weeks.push({
      year: getISOWeekYear(cursor),
      week: getISOWeek(cursor),
      start: cursor,
      end,
      label: `${format(cursor, "d MMM", { locale: ru })} - ${format(end, "d MMM", {
        locale: ru,
      })}`,
    });
  }

  return weeks;
}

export function getAdjacentMonth(year: number, month: number, delta: number): MonthReference {
  const date = addMonths(getMonthDate(year, month), delta);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function getAdjacentWeek(year: number, week: number, delta: number): WeekReference {
  const date = addWeeks(getISOWeekStart(year, week), delta);
  return { year: getISOWeekYear(date), week: getISOWeek(date) };
}

export function getDayReference(date: Date): DayReference {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function getAdjacentDay(year: number, month: number, day: number, delta: number): DayReference {
  return getDayReference(addDays(new Date(year, month - 1, day), delta));
}

export function getISOWeekReference(date: Date): WeekReference {
  return {
    year: getISOWeekYear(date),
    week: getISOWeek(date),
  };
}

export function formatMonthLabel(year: number, month: number): string {
  return capitalize(format(getMonthDate(year, month), "LLLL yyyy", { locale: ru }));
}

export function formatWeekLabel(year: number, week: number): string {
  const start = getISOWeekStart(year, week);
  const end = addDays(start, 6);
  return `Неделя ${week} • ${format(start, "d MMM", { locale: ru })} - ${format(end, "d MMM", {
    locale: ru,
  })}`;
}

export function formatDayShort(date: Date): string {
  return format(date, "EE", { locale: ru }).replace(".", "");
}

export function formatDayStamp(date: Date): string {
  return `${formatDayShort(date)} ${format(date, "d")}`;
}

export function formatShortDate(date: Date): string {
  return format(date, "d MMM", { locale: ru });
}

export function formatLongDayLabel(date: Date): string {
  return capitalize(format(date, "EEEE, d MMMM yyyy", { locale: ru }));
}

export function formatIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}
