"use client";

import Link from "next/link";
import { useEffect } from "react";

import { MonthPlan } from "@/components/month/month-plan";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMonthLabel, getAdjacentMonth, getMonthKey } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";

type MonthScreenProps = {
  year: number;
  month: number;
};

export function MonthScreen({ year, month }: MonthScreenProps) {
  const monthKey = getMonthKey(year, month);
  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const monthData = useAppStore((state) => state.months[monthKey]);

  useEffect(() => {
    ensureMonth(year, month);
  }, [ensureMonth, month, year]);

  if (!monthData) {
    return <div className="paper-panel h-[640px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  const prevMonth = getAdjacentMonth(year, month, -1);
  const nextMonth = getAdjacentMonth(year, month, 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-muted">Месячный разворот</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{formatMonthLabel(year, month)}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            aria-label="Предыдущий месяц"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            href={`/month/${prevMonth.year}/${prevMonth.month}`}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <Link
            className="rounded-[22px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            href="/dashboard"
          >
            К дашборду
          </Link>
          <Link
            aria-label="Следующий месяц"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
            href={`/month/${nextMonth.year}/${nextMonth.month}`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <MonthPlan month={monthData} monthKey={monthKey} />
    </div>
  );
}
