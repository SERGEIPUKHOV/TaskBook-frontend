"use client";

import Link from "next/link";
import { useEffect } from "react";

import { MonthPlan } from "@/components/month/month-plan";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMonthLabel, getAdjacentMonth, getMonthKey } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { useNavStore } from "@/store/nav-store";

type MonthScreenProps = {
  year: number;
  month: number;
};

export function MonthScreen({ year, month }: MonthScreenProps) {
  const monthKey = getMonthKey(year, month);
  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const monthData = useAppStore((state) => state.months[monthKey]);
  const setLastMonth = useNavStore((state) => state.setLastMonth);

  useEffect(() => {
    ensureMonth(year, month);
  }, [ensureMonth, month, year]);

  useEffect(() => {
    setLastMonth({ year, month });
  }, [month, setLastMonth, year]);

  if (!monthData) {
    return <div className="paper-panel h-[640px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  const prevMonth = getAdjacentMonth(year, month, -1);
  const nextMonth = getAdjacentMonth(year, month, 1);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 rounded-[32px] border border-line bg-paper/70 px-3 py-3 shadow-paper sm:px-5 sm:py-5">
        <Link
          aria-label="Предыдущий месяц"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
          href={`/month/${prevMonth.year}/${prevMonth.month}`}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-xs uppercase tracking-[0.22em] text-muted">Месячный разворот</div>
          <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{formatMonthLabel(year, month)}</h1>
          <div className="mt-2">
            <Link
              className="inline-flex rounded-[18px] border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent sm:text-sm"
              href="/dashboard"
            >
              К дашборду
            </Link>
          </div>
        </div>

        <Link
          aria-label="Следующий месяц"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper transition-colors hover:border-accent hover:text-accent"
          href={`/month/${nextMonth.year}/${nextMonth.month}`}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </header>

      <MonthPlan month={monthData} monthKey={monthKey} />
    </div>
  );
}
