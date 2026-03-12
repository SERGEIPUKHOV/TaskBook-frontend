"use client";

import { format, isSameMonth, isSameDay, startOfDay, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";

import { AnxietyMetricIcon, HeartMetricIcon, ProductivityMetricIcon } from "@/components/ui/icons";
import { StateChart } from "@/components/month/state-chart";
import type { DailyState, MetricName, MonthData } from "@/lib/planner-types";
import { clamp, cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type MonthStatesPanelProps = {
  monthKey: string;
  month: MonthData;
};

type DraftValues = Record<MetricName, string>;
type DateState = {
  draft: DraftValues;
  error: string;
  isEditing: boolean;
};
type DateRow = {
  canEdit: boolean;
  date: Date;
  entry: DailyState | null;
};

const metricColumns: Array<{
  accentClassName: string;
  icon: typeof HeartMetricIcon;
  key: MetricName;
  label: string;
}> = [
  {
    accentClassName: "text-success",
    icon: HeartMetricIcon,
    key: "health",
    label: "Здоровье",
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

function createDraftValues(state: DailyState | null): DraftValues {
  if (!state) {
    return { health: "", productivity: "", anxiety: "" };
  }

  return {
    health: state.health > 0 ? String(state.health) : "",
    productivity: state.productivity > 0 ? String(state.productivity) : "",
    anxiety: state.anxiety > 0 ? String(state.anxiety) : "",
  };
}

function isMetricValueValid(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10;
}

function getVisibleDates(month: MonthData): Date[] {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const monthDate = new Date(month.year, month.month - 1, 1);
  const currentMonthDates = [today, yesterday].filter((date) => isSameMonth(date, monthDate));

  if (currentMonthDates.length > 0) {
    return currentMonthDates;
  }

  return month.dailyStates
    .slice(-2)
    .reverse()
    .map((entry) => startOfDay(new Date(month.year, month.month - 1, entry.day)));
}

function createDateStates(rows: DateRow[]): DateState[] {
  return rows.map((row) => ({
    draft: createDraftValues(row.entry),
    error: "",
    isEditing: !row.entry,
  }));
}

export function MonthStatesPanel({ monthKey, month }: MonthStatesPanelProps) {
  const setDailyMetric = useAppStore((state) => state.setDailyMetric);
  const today = startOfDay(new Date());
  const rows: DateRow[] = getVisibleDates(month).map((date) => ({
    canEdit: isSameDay(date, today) || isSameDay(date, subDays(today, 1)),
    date,
    entry: month.dailyStates.find((state) => state.day === date.getDate()) ?? null,
  }));
  const [dateStates, setDateStates] = useState<DateState[]>(() => createDateStates(rows));

  useEffect(() => {
    setDateStates(createDateStates(rows));
  }, [monthKey]);

  function updateDraft(dateIdx: number, key: MetricName, value: string) {
    setDateStates((current) =>
      current.map((state, index) =>
        index === dateIdx
          ? {
              ...state,
              draft: {
                ...state.draft,
                [key]: value,
              },
              error: "",
            }
          : state,
      ),
    );
  }

  function startEdit(dateIdx: number) {
    setDateStates((current) =>
      current.map((state, index) =>
        index === dateIdx
          ? {
              draft: createDraftValues(rows[dateIdx]?.entry ?? null),
              error: "",
              isEditing: true,
            }
          : state,
      ),
    );
  }

  function saveRow(dateIdx: number) {
    const row = rows[dateIdx];
    const state = dateStates[dateIdx];

    if (!row || !state) {
      return;
    }

    const hasAnyValue = metricColumns.some(({ key }) => state.draft[key].trim().length > 0);
    const hasInvalidValue = metricColumns.some(({ key }) => !isMetricValueValid(state.draft[key]));

    if (!hasAnyValue) {
      setDateStates((current) =>
        current.map((item, index) =>
          index === dateIdx ? { ...item, error: "Введите хотя бы одно значение." } : item,
        ),
      );
      return;
    }

    if (hasInvalidValue) {
      setDateStates((current) =>
        current.map((item, index) =>
          index === dateIdx ? { ...item, error: "Допустимы только целые числа от 1 до 10." } : item,
        ),
      );
      return;
    }

    metricColumns.forEach(({ key }) => {
      const nextValue = state.draft[key].trim();

      if (!nextValue) {
        return;
      }

      setDailyMetric(monthKey, row.date.getDate(), key, clamp(Number(nextValue), 1, 10));
    });

    setDateStates((current) =>
      current.map((item, index) =>
        index === dateIdx ? { ...item, error: "", isEditing: false } : item,
      ),
    );
  }

  const firstError = dateStates.find((state) => state.error)?.error;

  return (
    <article className="paper-panel rounded-[32px] p-4 sm:p-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Состояния месяца</div>
        <h2 className="mt-1 text-lg font-semibold text-ink">График и состояния</h2>
      </div>

      <div className="mt-5">
        <StateChart month={month} />
      </div>

      <div className="mt-3 rounded-[20px] border border-line bg-canvas/70 p-3">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 rounded-[16px] border border-line bg-paper/90 sm:hidden">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs text-muted" />
                {rows.map((row, index) => (
                  <th key={row.date.toISOString()} className="px-2 py-2 text-center text-xs font-medium text-ink">
                    {format(row.date, "d MMM", { locale: ru })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricColumns.map(({ accentClassName, icon: Icon, key, label }) => (
                <tr key={key} className="border-t border-line/60">
                  <td className="px-2 py-2">
                    <div className={cn("flex items-center gap-2 text-xs font-semibold", accentClassName)}>
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas",
                          accentClassName,
                        )}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      {label}
                    </div>
                  </td>
                  {rows.map((row, dateIdx) => {
                    const state = dateStates[dateIdx];
                    const value = state?.draft[key] ?? "";
                    const invalid = state?.isEditing && value.trim() && !isMetricValueValid(value);

                    return (
                      <td key={`${key}-${row.date.toISOString()}`} className="px-2 py-1.5 text-center">
                        {state?.isEditing ? (
                          <input
                            className={cn(
                              "field-base mx-auto w-10 rounded-lg px-1 py-1 text-center text-sm",
                              invalid &&
                                "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(var(--danger),0.12)]",
                            )}
                            inputMode="numeric"
                            max={10}
                            min={1}
                            onChange={(event) => updateDraft(dateIdx, key, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveRow(dateIdx);
                              }
                            }}
                            placeholder="—"
                            type="number"
                            value={value}
                          />
                        ) : (
                          <span className="text-sm font-medium text-ink">
                            {row.entry && row.entry[key] > 0 ? row.entry[key] : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-line/60">
                <td className="px-2 py-2 text-xs text-muted">Действие</td>
                {rows.map((row, dateIdx) => {
                  const state = dateStates[dateIdx];

                  return (
                    <td key={`action-${row.date.toISOString()}`} className="px-2 py-2 text-center">
                      {row.canEdit ? (
                        <button
                          className="whitespace-nowrap rounded-[14px] border border-accent bg-accent px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-ink hover:bg-ink"
                          onClick={() => {
                            if (state?.isEditing) {
                              saveRow(dateIdx);
                              return;
                            }

                            startEdit(dateIdx);
                          }}
                          type="button"
                        >
                          {state?.isEditing ? "Принять" : "Ред."}
                        </button>
                      ) : (
                        <span className="rounded-[14px] border border-line bg-canvas px-2.5 py-1.5 text-xs text-muted">
                          Архив
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              {firstError ? (
                <tr>
                  <td className="px-2 pb-2 text-xs text-danger" colSpan={rows.length + 1}>
                    {firstError}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <table className="hidden w-full border-separate border-spacing-0 rounded-[16px] border border-line bg-paper/90 sm:table">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs text-muted" />
                {metricColumns.map(({ accentClassName, icon: Icon, key, label }) => (
                  <th key={key} className={cn("px-2 py-3 text-center text-lg font-semibold", accentClassName)}>
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-canvas",
                          accentClassName,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-3 text-center text-base text-muted">Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, dateIdx) => {
                const state = dateStates[dateIdx];

                return (
                  <tr key={row.date.toISOString()} className="border-t border-line/60">
                    <td className="px-3 py-3 text-center text-lg font-medium text-ink">
                      {format(row.date, "d MMMM", { locale: ru })}
                    </td>
                    {metricColumns.map(({ key }) => {
                      const value = state?.draft[key] ?? "";
                      const invalid = state?.isEditing && value.trim() && !isMetricValueValid(value);

                      return (
                        <td key={key} className="px-3 py-2 text-center">
                          {state?.isEditing ? (
                            <input
                              className={cn(
                                "field-base mx-auto w-12 rounded-lg px-2 py-1 text-center text-lg",
                                invalid &&
                                  "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(var(--danger),0.12)]",
                              )}
                              inputMode="numeric"
                              max={10}
                              min={1}
                              onChange={(event) => updateDraft(dateIdx, key, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveRow(dateIdx);
                                }
                              }}
                              placeholder="—"
                              type="number"
                              value={value}
                            />
                          ) : (
                            <span className="text-lg font-medium text-ink">{row.entry ? row.entry[key] : "—"}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {row.canEdit ? (
                        <button
                          className="whitespace-nowrap rounded-[14px] border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:border-ink hover:bg-ink"
                          onClick={() => {
                            if (state?.isEditing) {
                              saveRow(dateIdx);
                              return;
                            }

                            startEdit(dateIdx);
                          }}
                          type="button"
                        >
                          {state?.isEditing ? "Принять" : "Редактировать"}
                        </button>
                      ) : (
                        <span className="rounded-[14px] border border-line bg-canvas px-4 py-2 text-sm text-muted">
                          Архив
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {firstError ? (
                <tr>
                  <td className="px-2 pb-2 text-xs text-danger" colSpan={metricColumns.length + 2}>
                    {firstError}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td className="py-3" colSpan={metricColumns.length + 2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
