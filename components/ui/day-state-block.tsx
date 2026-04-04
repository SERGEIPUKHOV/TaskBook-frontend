"use client";

import { useEffect, useState } from "react";

import { AnxietyMetricIcon, HeartMetricIcon, ProductivityMetricIcon } from "@/components/ui/icons";
import type { DailyState, MetricName } from "@/lib/planner-types";
import { cn } from "@/lib/utils";

type DayStateBlockProps = {
  disabled?: boolean;
  layout?: "row" | "column";
  onSave: (metric: MetricName, value: number) => Promise<void> | void;
  state: DailyState | null;
};

const metricRows: Array<{
  accentClassName: string;
  icon: typeof HeartMetricIcon;
  key: MetricName;
  label: string;
}> = [
  {
    accentClassName: "text-success",
    icon: HeartMetricIcon,
    key: "health",
    label: "Самочувствие",
  },
  {
    accentClassName: "text-accent",
    icon: ProductivityMetricIcon,
    key: "productivity",
    label: "Продуктивность",
  },
  {
    accentClassName: "text-anxiety",
    icon: AnxietyMetricIcon,
    key: "anxiety",
    label: "Тревожность",
  },
];

function createDraft(state: DailyState | null): Record<MetricName, string> {
  return {
    health: state && state.health > 0 ? String(state.health) : "",
    productivity: state && state.productivity > 0 ? String(state.productivity) : "",
    anxiety: state && state.anxiety > 0 ? String(state.anxiety) : "",
  };
}

function parseMetricValue(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return null;
  }
  return parsed;
}

export function DayStateBlock({
  disabled = false,
  layout = "column",
  onSave,
  state,
}: DayStateBlockProps) {
  const [draft, setDraft] = useState<Record<MetricName, string>>(() => createDraft(state));

  useEffect(() => {
    setDraft(createDraft(state));
  }, [state]);

  function commit(metric: MetricName) {
    const parsed = parseMetricValue(draft[metric]);
    if (parsed === null) {
      setDraft((current) => ({ ...current, [metric]: createDraft(state)[metric] }));
      return;
    }

    void onSave(metric, parsed);
  }

  return (
    <div
      className={cn(
        "space-y-3",
        layout === "row" && "grid grid-cols-3 gap-3 space-y-0",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {metricRows.map(({ accentClassName, icon: Icon, key, label }) => {
        return (
          <div key={key} className="rounded-[24px] border border-line bg-paper/90 px-4 py-3">
            <div className="grid grid-cols-[56px_1fr] items-center gap-4">
              <input
                className="field-base h-10 w-14 rounded-xl px-2 text-center text-lg"
                disabled={disabled}
                inputMode="numeric"
                max={10}
                min={1}
                onBlur={() => commit(key)}
                onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit(key);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setDraft((current) => ({ ...current, [key]: createDraft(state)[key] }));
                  }
                }}
                placeholder="—"
                type="number"
                value={draft[key]}
              />
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-canvas", accentClassName)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{label}</div>
                  <div className="text-xs text-muted">Оценка от 1 до 10</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
