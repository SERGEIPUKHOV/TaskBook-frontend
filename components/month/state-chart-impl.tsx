"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MetricName, MonthData } from "@/lib/planner-types";

type StateChartProps = {
  month: MonthData;
  onSelectDay?: (day: number) => void;
};

type DotRendererProps = {
  cx?: number;
  cy?: number;
  payload?: { day: number };
};

const metricLabels: Record<MetricName, string> = {
  health: "Здоровье",
  productivity: "Продуктивность",
  anxiety: "Тревожность",
};

function renderDot(color: string, onSelectDay?: (day: number) => void) {
  return function DotRenderer({ cx, cy, payload }: DotRendererProps) {
    if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
      return <circle cx={0} cy={0} fill="transparent" r={0} />;
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        fill={color}
        r={3.5}
        stroke="white"
        strokeWidth={1.5}
        style={{ cursor: onSelectDay ? "pointer" : "default" }}
        onClick={onSelectDay ? () => onSelectDay(payload.day) : undefined}
      />
    );
  };
}

export function StateChartImpl({ month, onSelectDay }: StateChartProps) {
  const chartData = month.dailyStates.map((entry) => ({
    ...entry,
    health: entry.health > 0 ? entry.health : null,
    productivity: entry.productivity > 0 ? entry.productivity : null,
    anxiety: entry.anxiety > 0 ? entry.anxiety : null,
  }));

  return (
    <div className="space-y-5">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="rgba(229,229,227,0.6)" vertical={false} strokeDasharray="2 6" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <YAxis
              domain={[1, 10]}
              tickCount={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "rgba(29,78,216,0.15)", strokeWidth: 24 }}
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid rgba(229,229,227,0.9)",
                background: "rgba(255,255,255,0.94)",
                boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
              }}
              formatter={(value, name) => [value, metricLabels[name as MetricName] ?? name]}
              labelFormatter={(label) =>
                format(new Date(month.year, month.month - 1, Number(label)), "d MMMM", { locale: ru })
              }
            />
            <Line
              type="monotone"
              dataKey="health"
              stroke="rgb(var(--success))"
              strokeWidth={2.5}
              dot={renderDot("rgb(var(--success))", onSelectDay)}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="productivity"
              stroke="rgb(var(--accent))"
              strokeWidth={2.5}
              dot={renderDot("rgb(var(--accent))", onSelectDay)}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="anxiety"
              stroke="rgb(var(--anxiety))"
              strokeWidth={2.5}
              dot={renderDot("rgb(var(--anxiety))", onSelectDay)}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-success/10 px-3 py-1.5 text-sm text-success">Здоровье</div>
        <div className="rounded-full bg-accent/10 px-3 py-1.5 text-sm text-accent">Продуктивность</div>
        <div className="rounded-full bg-anxiety/10 px-3 py-1.5 text-sm text-anxiety">Тревожность</div>
      </div>
    </div>
  );
}
