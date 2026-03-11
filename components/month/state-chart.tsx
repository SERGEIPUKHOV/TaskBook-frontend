"use client";

import dynamic from "next/dynamic";

import type { MonthData } from "@/lib/planner-types";

type StateChartProps = {
  month: MonthData;
  onSelectDay?: (day: number) => void;
};

const StateChartImpl = dynamic(
  () => import("@/components/month/state-chart-impl").then((module) => module.StateChartImpl),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-[28px] border border-line bg-canvas/60" />
    ),
  },
);

export function StateChart(props: StateChartProps) {
  return <StateChartImpl {...props} />;
}
