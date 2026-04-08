"use client";

import Link from "next/link";
import { isSameDay, startOfDay } from "date-fns";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatLongDayLabel, getAdjacentDay, getDayReference } from "@/lib/dates";

type DayNavigatorProps = {
  date: Date;
};

export function DayNavigator({ date }: DayNavigatorProps) {
  const previousDay = getAdjacentDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), -1);
  const nextDay = getAdjacentDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), 1);
  const today = startOfDay(new Date());
  const isCurrentDay = isSameDay(startOfDay(date), today);
  const todayRef = getDayReference(today);

  return (
    <header className="flex items-center gap-2 rounded-[32px] border border-line bg-paper/70 px-3 py-3 shadow-paper sm:px-5 sm:py-5">
      <Link
        aria-label="Предыдущий день"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
        href={`/day/${previousDay.year}/${previousDay.month}/${previousDay.day}`}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Дневной разворот</div>
        <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{formatLongDayLabel(date)}</h1>
        {!isCurrentDay ? (
          <Link
            className="mt-1 inline-flex text-sm font-medium text-accent transition-colors hover:text-ink"
            href={`/day/${todayRef.year}/${todayRef.month}/${todayRef.day}`}
          >
            Сегодня
          </Link>
        ) : null}
      </div>

      <Link
        aria-label="Следующий день"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
        href={`/day/${nextDay.year}/${nextDay.month}/${nextDay.day}`}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </Link>
    </header>
  );
}
