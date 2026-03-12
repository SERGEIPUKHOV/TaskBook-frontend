"use client";

import Link from "next/link";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

import { AnxietyMetricIcon, HeartMetricIcon, ProductivityMetricIcon } from "@/components/ui/icons";
import { formatIsoDate, formatLongDayLabel, getMonthKey } from "@/lib/dates";
import type { DailyState, MetricName, WeekData } from "@/lib/planner-types";
import { clamp, cn } from "@/lib/utils";
import { getWeekDayKeys } from "@/lib/week-tasks";
import { useAppStore } from "@/store/app-store";

type WeekStatePanelProps = {
  week: WeekData;
};

type DraftValues = Record<MetricName, string>;
type ColState = {
  draft: DraftValues;
  error: string;
  isEditing: boolean;
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

function createDraftValues(entry: DailyState | null): DraftValues {
  if (!entry) {
    return { health: "", productivity: "", anxiety: "" };
  }

  return {
    health: entry.health > 0 ? String(entry.health) : "",
    productivity: entry.productivity > 0 ? String(entry.productivity) : "",
    anxiety: entry.anxiety > 0 ? String(entry.anxiety) : "",
  };
}

function createEmptyColState(): ColState {
  return {
    draft: createDraftValues(null),
    error: "",
    isEditing: false,
  };
}

function isMetricValueValid(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10;
}

export function WeekStatePanel({ week }: WeekStatePanelProps) {
  const ensureMonth = useAppStore((state) => state.ensureMonth);
  const monthLoadStates = useAppStore((state) => state.monthLoadStates);
  const months = useAppStore((state) => state.months);
  const setDailyMetric = useAppStore((state) => state.setDailyMetric);
  const dayKeys = getWeekDayKeys(week.startDate);
  const dayDates = dayKeys.map((dayKey) => parseISO(dayKey));
  const today = startOfDay(new Date());
  const [colStates, setColStates] = useState<ColState[]>(() =>
    dayDates.map(() => createEmptyColState()),
  );
  const initializedRef = useRef(false);
  const weekMonthKeys = [...new Set(dayDates.map((date) => getMonthKey(date.getFullYear(), date.getMonth() + 1)))];
  const allMonthsReady = weekMonthKeys.every((key) => monthLoadStates[key] === "ready");

  useEffect(() => {
    weekMonthKeys.forEach((monthKey) => {
      const [yearText, monthText] = monthKey.split("-");
      ensureMonth(Number(yearText), Number(monthText));
    });
  }, [ensureMonth, week.startDate]);

  useEffect(() => {
    initializedRef.current = false;
    setColStates(dayDates.map(() => createEmptyColState()));
  }, [week.startDate]);

  useEffect(() => {
    if (allMonthsReady && !initializedRef.current) {
      initializedRef.current = true;
      setColStates(
        dayDates.map((date) => {
          const entry = stateForDate(date, months);
          const hasAnyValue =
            entry !== null &&
            (entry.health > 0 || entry.productivity > 0 || entry.anxiety > 0);

          return {
            draft: createDraftValues(entry),
            error: "",
            isEditing: !isAfter(startOfDay(date), today) && !hasAnyValue,
          };
        }),
      );
    }
  }, [allMonthsReady, months, week.startDate]);

  function updateDraft(dateIdx: number, key: MetricName, value: string) {
    setColStates((current) =>
      current.map((state, index) =>
        index === dateIdx
          ? {
              ...state,
              draft: { ...state.draft, [key]: value },
              error: "",
            }
          : state,
      ),
    );
  }

  function startEdit(dateIdx: number, entry: DailyState | null) {
    setColStates((current) =>
      current.map((state, index) =>
        index === dateIdx
          ? {
              draft: createDraftValues(entry),
              error: "",
              isEditing: true,
            }
          : state,
      ),
    );
  }

  function saveRow(dateIdx: number, date: Date) {
    const colState = colStates[dateIdx];
    if (!colState) {
      return;
    }

    const hasAnyValue = metricRows.some(({ key }) => colState.draft[key].trim().length > 0);
    const hasInvalidValue = metricRows.some(({ key }) => !isMetricValueValid(colState.draft[key]));

    if (!hasAnyValue) {
      setColStates((current) =>
        current.map((state, index) =>
          index === dateIdx ? { ...state, error: "Введите хотя бы одно значение." } : state,
        ),
      );
      return;
    }

    if (hasInvalidValue) {
      setColStates((current) =>
        current.map((state, index) =>
          index === dateIdx
            ? { ...state, error: "Допустимы только целые числа от 1 до 10." }
            : state,
        ),
      );
      return;
    }

    const monthKey = getMonthKey(date.getFullYear(), date.getMonth() + 1);
    metricRows.forEach(({ key }) => {
      const value = colState.draft[key].trim();
      if (!value) {
        return;
      }

      setDailyMetric(monthKey, date.getDate(), key, clamp(Number(value), 1, 10));
    });

    setColStates((current) =>
      current.map((state, index) =>
        index === dateIdx ? { ...state, error: "", isEditing: false } : state,
      ),
    );
  }

  function stateForDate(date: Date, monthState: typeof months) {
    const monthKey = getMonthKey(date.getFullYear(), date.getMonth() + 1);
    return monthState[monthKey]?.dailyStates.find((entry) => entry.day === date.getDate()) ?? null;
  }

  return (
    <section className="paper-panel rounded-[32px] p-4 sm:p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.2em] text-muted">Состояние недели</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 rounded-[24px] border border-line bg-paper/90">
          <thead>
            <tr>
              <th className="w-[160px] px-4 py-3 text-left text-xs text-muted">Метрика</th>
              {dayDates.map((date) => (
                <th key={date.toISOString()} className="px-2 py-3 text-center text-xs text-muted">
                  <Link
                    className="inline-flex flex-col items-center transition-colors hover:text-accent"
                    href={`/day/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`}
                    title={formatLongDayLabel(date)}
                  >
                    <span>{format(date, "EE", { locale: ru }).replace(".", "")}</span>
                    <span className="font-mono normal-case tracking-normal text-ink">{format(date, "d/M")}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map(({ accentClassName, icon: Icon, key, label }) => (
              <tr key={key} className="border-t border-line/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full bg-canvas",
                        accentClassName,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-sm font-medium text-ink">{label}</div>
                  </div>
                </td>
                {dayDates.map((date, dateIdx) => {
                  const dateKey = formatIsoDate(date);
                  const entry = stateForDate(date, months);
                  const isFuture = isAfter(startOfDay(date), today);
                  const colState = colStates[dateIdx];
                  const value = entry ? entry[key] : null;
                  const hasValue = value !== null && value !== 0;
                  const draftValue = colState?.draft[key] ?? "";
                  const invalid =
                    colState?.isEditing &&
                    draftValue.trim() !== "" &&
                    !isMetricValueValid(draftValue);

                  return (
                    <td key={`${key}-${dateKey}`} className="px-2 py-3 text-center">
                      <div className={cn("mx-auto flex w-full justify-center", isFuture && "opacity-35")}>
                        {colState?.isEditing ? (
                          <input
                            className={cn(
                              "field-base h-9 w-14 rounded-xl px-2 text-center text-lg",
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
                                saveRow(dateIdx, date);
                              }
                            }}
                            placeholder="—"
                            type="number"
                            value={draftValue}
                          />
                        ) : (
                          <span className={cn("text-lg font-semibold", hasValue ? "text-ink" : "text-muted")}>
                            {hasValue ? value : "—"}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-line/60">
              <td className="px-4 py-3">
                <div className="text-sm text-muted">Действие</div>
              </td>
              {dayDates.map((date, dateIdx) => {
                const dateKey = formatIsoDate(date);
                const entry = stateForDate(date, months);
                const isFuture = isAfter(startOfDay(date), today);
                const colState = colStates[dateIdx];
                const hasAnyValue = entry !== null && (entry.health > 0 || entry.productivity > 0 || entry.anxiety > 0);

                return (
                  <td key={`action-${dateKey}`} className="px-2 py-3 text-center">
                    {isFuture ? null : (
                      <button
                        className="whitespace-nowrap rounded-[14px] border border-ink bg-ink px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-accent hover:bg-accent"
                        onClick={() => {
                          if (colState?.isEditing) {
                            saveRow(dateIdx, date);
                            return;
                          }

                          startEdit(dateIdx, entry);
                        }}
                        type="button"
                      >
                        {colState?.isEditing || !hasAnyValue ? "Принять" : "Ред."}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
            {dayDates.some((_, dateIdx) => colStates[dateIdx]?.error) ? (
              <tr>
                <td />
                {dayDates.map((_, dateIdx) => (
                  <td key={`error-${dateIdx}`} className="px-2 pb-2 text-center text-xs text-danger">
                    {colStates[dateIdx]?.error ?? ""}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
