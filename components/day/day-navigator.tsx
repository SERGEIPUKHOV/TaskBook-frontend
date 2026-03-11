"use client";

import Link from "next/link";
import { isSameDay, startOfDay } from "date-fns";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatLongDayLabel, getAdjacentDay, getDayReference, type WeekReference } from "@/lib/dates";

type DayNavigatorProps = {
  date: Date;
  weekRef: WeekReference;
};

export function DayNavigator({ date, weekRef }: DayNavigatorProps) {
  const previousDay = getAdjacentDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), -1);
  const nextDay = getAdjacentDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), 1);
  const today = startOfDay(new Date());
  const isCurrentDay = isSameDay(startOfDay(date), today);
  const todayRef = getDayReference(today);

  return (
    <header className="flex flex-col gap-3 rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Дневной разворот</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{formatLongDayLabel(date)}</h1>
        <Link
          className="mt-3 inline-flex text-sm font-medium text-accent transition-colors hover:text-ink"
          href={`/week/${weekRef.year}/${weekRef.week}`}
        >
          Неделя {weekRef.week}
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          aria-label="Предыдущий день"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
          href={`/day/${previousDay.year}/${previousDay.month}/${previousDay.day}`}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        {!isCurrentDay ? (
          <Link
            className="rounded-[22px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            href={`/day/${todayRef.year}/${todayRef.month}/${todayRef.day}`}
          >
            Сегодня
          </Link>
        ) : null}
        <Link
          aria-label="Следующий день"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
          href={`/day/${nextDay.year}/${nextDay.month}/${nextDay.day}`}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
