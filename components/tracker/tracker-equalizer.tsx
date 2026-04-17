"use client";

import { addWeeks, eachDayOfInterval, endOfISOWeek, format, parseISO, startOfISOWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { TrackerGoal, TrackerSprint } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

import { TRACKER_SECTION_LABELS } from "./tracker-meta";

function flattenGoals(goals: TrackerGoal[]): TrackerGoal[] {
  return goals.flatMap((goal) => [goal, ...flattenGoals(goal.children)]);
}

function intensityClass(count: number): string {
  if (count === 0) {
    return "bg-canvas/60 text-muted";
  }
  if (count <= 2) {
    return "bg-accent/10 text-accent";
  }
  if (count <= 4) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

function DetailsModal({
  date,
  goals,
  onClose,
}: {
  date: string;
  goals: TrackerGoal[];
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="paper-panel w-full max-w-xl rounded-[32px] p-6" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Дедлайны дня</div>
        <h3 className="mt-3 text-xl font-semibold text-ink">{format(parseISO(date), "d MMMM yyyy", { locale: ru })}</h3>
        <div className="mt-5 space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="rounded-[22px] border border-line bg-paper/80 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted">{TRACKER_SECTION_LABELS[goal.section]}</div>
              <div className="mt-1 text-sm font-medium text-ink">{goal.title}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function TrackerEqualizer() {
  const sprints = useAppStore((state) => state.trackerSprints);
  const goalsBySprint = useAppStore((state) => state.trackerGoalsBySprint);
  const fetchTrackerGoals = useAppStore((state) => state.fetchTrackerGoals);
  const activeSprint = sprints.find((sprint) => sprint.isActive) ?? sprints[0] ?? null;
  const goals = activeSprint ? goalsBySprint[activeSprint.id] ?? [] : [];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSprint) {
      return;
    }
    void fetchTrackerGoals(activeSprint.id);
  }, [activeSprint, fetchTrackerGoals]);

  const deadlineMap = useMemo(() => {
    const items = flattenGoals(goals).filter((goal) => goal.level === 3 && goal.deadlineDate);
    return items.reduce<Record<string, TrackerGoal[]>>((accumulator, goal) => {
      const key = goal.deadlineDate as string;
      accumulator[key] = [...(accumulator[key] ?? []), goal];
      return accumulator;
    }, {});
  }, [goals]);

  const weeks = useMemo(() => {
    if (!activeSprint) {
      return [] as Array<{ days: Date[]; label: string }>;
    }
    const start = startOfISOWeek(parseISO(activeSprint.startDate));
    const end = endOfISOWeek(parseISO(activeSprint.endDate));
    const items: Array<{ days: Date[]; label: string }> = [];
    for (let cursor = start; cursor <= end; cursor = addWeeks(cursor, 1)) {
      const days = eachDayOfInterval({ start: cursor, end: endOfISOWeek(cursor) });
      items.push({
        days,
        label: `Нед ${format(cursor, "I")} · ${format(days[0], "d.MM")}–${format(days[6], "d.MM")}`,
      });
    }
    return items;
  }, [activeSprint]);

  if (!activeSprint) {
    return <div className="paper-panel rounded-[32px] p-6 text-sm text-muted">Сначала создай спринт, чтобы увидеть обзор дедлайнов.</div>;
  }

  return (
    <div className="space-y-5">
      <header className="paper-panel rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Обзор спринта</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{activeSprint.title}</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Сетка показывает, где дедлайны распределились ровно, а где перегружают неделю.</p>
      </header>

      <div className="paper-panel overflow-x-auto rounded-[32px] p-5">
        <div className="grid min-w-[720px] grid-cols-[140px_repeat(7,minmax(0,1fr))] gap-2 text-xs uppercase tracking-[0.16em] text-muted">
          <div />
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
            <div key={day} className="px-2 py-1 text-center">{day}</div>
          ))}
          {weeks.map((week) => (
            <div key={week.label} className="contents">
              <div key={`${week.label}-label`} className="flex items-center rounded-[18px] bg-canvas/60 px-3 py-3 text-[11px] tracking-[0.08em] text-muted">{week.label}</div>
              {week.days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const count = deadlineMap[dateKey]?.length ?? 0;
                return (
                  <button
                    key={dateKey}
                    className={`min-h-[72px] rounded-[18px] border border-line px-2 py-3 text-center text-sm font-medium transition-colors hover:border-accent ${intensityClass(count)}`}
                    onClick={() => setSelectedDate(dateKey)}
                    type="button"
                  >
                    <div>{format(day, "d")}</div>
                    <div className="mt-1 text-lg font-semibold">{count}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && deadlineMap[selectedDate]?.length ? (
        <DetailsModal date={selectedDate} goals={deadlineMap[selectedDate]} onClose={() => setSelectedDate(null)} />
      ) : null}
    </div>
  );
}
