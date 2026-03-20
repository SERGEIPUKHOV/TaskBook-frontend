"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayChartStats, MetricName, MonthData } from "@/lib/planner-types";

const PLOT_AREA_HEIGHT = 274;
const CHART_MARGIN_TOP = 16;
const Y_AXIS_TICK_MARGIN = 6;
const Y_AXIS_WIDTH = 32;
const X_TICK_BASELINE = 12;
const X_TICK_BOTTOM_PADDING = 20;
const YSTEP = PLOT_AREA_HEIGHT / 9;
const XAXIS_HEIGHT = X_TICK_BASELINE + YSTEP * 3 + X_TICK_BOTTOM_PADDING;
const CHART_HEIGHT = CHART_MARGIN_TOP + PLOT_AREA_HEIGHT + XAXIS_HEIGHT;

type StateChartProps = {
  dayStats?: Record<number, DayChartStats>;
  month: MonthData;
  onSelectDay?: (day: number) => void;
};

type CustomTickProps = {
  dayStats?: Record<number, DayChartStats>;
  payload?: { value?: number };
  tickFontSize?: number;
  x?: number;
  y?: number;
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

function formatStatValue(value: number | null | undefined): string {
  return typeof value === "number" ? `${value}` : "—";
}

function CustomXTick({ x = 0, y = 0, payload, dayStats, tickFontSize = 14 }: CustomTickProps) {
  const day = payload?.value;
  const stats = typeof day === "number" ? dayStats?.[day] : undefined;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={X_TICK_BASELINE} fill="currentColor" fontSize={12} textAnchor="middle">
        <tspan fontWeight={700}>{day}</tspan>
      </text>
      <text
        x={0}
        y={0}
        dy={X_TICK_BASELINE + YSTEP}
        fill="rgb(var(--success))"
        fontSize={tickFontSize}
        textAnchor="middle"
      >
        {formatStatValue(stats?.habitsPct)}
      </text>
      <text
        x={0}
        y={0}
        dy={X_TICK_BASELINE + YSTEP * 2}
        fill="rgb(var(--accent))"
        fontSize={tickFontSize}
        textAnchor="middle"
      >
        {formatStatValue(stats?.taskDonePct)}
      </text>
      <text
        x={0}
        y={0}
        dy={X_TICK_BASELINE + YSTEP * 3}
        fill="rgb(var(--muted))"
        fontSize={tickFontSize}
        textAnchor="middle"
      >
        {formatStatValue(stats?.taskMovedPct)}
      </text>
    </g>
  );
}

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

export function StateChartImpl({ month, onSelectDay, dayStats }: StateChartProps) {
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const node = chartHostRef.current;

    if (!node) {
      return;
    }

    const updateWidth = () => {
      setChartWidth(node.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const dailyStatesByDay = new Map(month.dailyStates.map((entry) => [entry.day, entry]));
  const daysInMonth = new Date(month.year, month.month, 0).getDate();
  const xAxisInterval = isMobile ? 2 : "preserveEnd";
  const approxPlotWidth = Math.max(chartWidth - Y_AXIS_WIDTH - 16, 0);
  const baseEdgePadding =
    daysInMonth > 0 && approxPlotWidth > 0
      ? Math.round(approxPlotWidth / (daysInMonth + 1))
      : 0;
  const xAxisPadding = isMobile
    ? { left: baseEdgePadding, right: baseEdgePadding }
    : { left: baseEdgePadding, right: 0 };
  const chartData = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const entry = dailyStatesByDay.get(day);

    return {
      day,
      health: entry && entry.health > 0 ? entry.health : null,
      productivity: entry && entry.productivity > 0 ? entry.productivity : null,
      anxiety: entry && entry.anxiety > 0 ? entry.anxiety : null,
    };
  });

  return (
    <div className="space-y-5">
      <div ref={chartHostRef} className="w-full" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: CHART_MARGIN_TOP, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(229,229,227,0.6)" vertical={false} strokeDasharray="2 6" />
            <XAxis
              dataKey="day"
              axisLine={false}
              height={XAXIS_HEIGHT}
              interval={xAxisInterval}
              minTickGap={8}
              padding={xAxisPadding}
              tick={<CustomXTick dayStats={dayStats} tickFontSize={isMobile ? 12 : 14} />}
              tickLine={false}
            />
            <YAxis
              domain={[1, 10]}
              tickCount={10}
              tickLine={false}
              axisLine={false}
              tickMargin={Y_AXIS_TICK_MARGIN}
              tick={{ fill: "currentColor", fontSize: 12 }}
              width={Y_AXIS_WIDTH}
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
            <Customized
              component={({
                offset,
                xAxisMap,
                yAxisMap,
              }: {
                offset?: { height: number; left: number; top: number };
                xAxisMap?: Record<string, { tickMargin?: number; tickSize?: number; y: number }>;
                yAxisMap?: Record<string, { width: number; x: number }>;
              }) => {
                if (!offset) {
                  return null;
                }

                const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : null;
                const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : null;
                const xAxisTop = xAxis
                  ? xAxis.y + (xAxis.tickSize ?? 6) + (xAxis.tickMargin ?? 2)
                  : offset.top + offset.height + 8;
                const pctX = yAxis ? yAxis.x + yAxis.width / 2 : offset.left / 2;

                return (
                  <g transform={`translate(${pctX},${xAxisTop})`}>
                    <text
                      x={0}
                      y={0}
                      dy={X_TICK_BASELINE + YSTEP}
                      textAnchor="middle"
                      fontSize={12}
                      fill="rgb(var(--success))"
                    >
                      %
                    </text>
                    <text
                      x={0}
                      y={0}
                      dy={X_TICK_BASELINE + YSTEP * 2}
                      textAnchor="middle"
                      fontSize={12}
                      fill="rgb(var(--accent))"
                    >
                      %
                    </text>
                    <text
                      x={0}
                      y={0}
                      dy={X_TICK_BASELINE + YSTEP * 3}
                      textAnchor="middle"
                      fontSize={12}
                      fill="rgb(var(--muted))"
                    >
                      %
                    </text>
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="hidden items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-success/10 px-3 py-1.5 text-sm text-success">Здоровье</div>
          <div className="rounded-full bg-accent/10 px-3 py-1.5 text-sm text-accent">Продуктивность</div>
          <div className="rounded-full bg-anxiety/10 px-3 py-1.5 text-sm text-anxiety">Тревожность</div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-1.5 text-sm text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            % вып. привычок
          </div>
          <div className="flex items-center gap-1.5 text-sm text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            % вып. задач
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-muted" />
            % перен. задач
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-1 gap-y-2 sm:hidden">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-full rounded-full bg-success/10 px-2 py-1.5 text-center text-xs text-success">
            Здоровье
          </div>
          <span className="text-xs text-success">% вып. привычок</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-full rounded-full bg-accent/10 px-2 py-1.5 text-center text-xs text-accent">
            Продуктивность
          </div>
          <span className="text-xs text-accent">% вып. задач</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-full rounded-full bg-anxiety/10 px-2 py-1.5 text-center text-xs text-anxiety">
            Тревожность
          </div>
          <span className="text-xs text-muted">% перен. задач</span>
        </div>
      </div>
    </div>
  );
}
