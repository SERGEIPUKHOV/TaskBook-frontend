"use client";

import { parseISO } from "date-fns";

import type { WeekData } from "@/lib/planner-types";
import { formatDayStamp } from "@/lib/dates";
import { getWeekDayKeys } from "@/lib/week-tasks";

type ReflectionSection = "keyEvents" | "gratitudes";

type WeekReflectionProps = {
  week: WeekData;
};

function ReflectionEntry({
  dayKey,
  value,
}: {
  dayKey: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-3">
      <span className="text-sm text-muted">{formatDayStamp(parseISO(dayKey))}</span>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">{value}</p>
    </div>
  );
}

function ReflectionCard({
  section,
  title,
  week,
}: {
  section: ReflectionSection;
  title: string;
  week: WeekData;
}) {
  const dayKeys = getWeekDayKeys(week.startDate);
  const filledDays = dayKeys.filter((dayKey) => (week.reflection[section][dayKey] ?? "").trim().length > 0);

  if (filledDays.length === 0) {
    return null;
  }

  return (
    <article className="paper-panel rounded-[32px] p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{title}</div>
      <div className="mt-3 space-y-3 border-y border-line/80 py-3">
        {filledDays.map((dayKey) => (
          <ReflectionEntry
            key={`${section}-${dayKey}`}
            dayKey={dayKey}
            value={week.reflection[section][dayKey] ?? ""}
          />
        ))}
      </div>
    </article>
  );
}

export function WeekReflection({ week }: WeekReflectionProps) {
  const dayKeys = getWeekDayKeys(week.startDate);
  const hasAnyEntries = dayKeys.some((dayKey) => {
    const keyEvents = week.reflection.keyEvents[dayKey] ?? "";
    const gratitudes = week.reflection.gratitudes[dayKey] ?? "";
    return keyEvents.trim().length > 0 || gratitudes.trim().length > 0;
  });

  if (!hasAnyEntries) {
    return null;
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ReflectionCard section="keyEvents" title="Ключевые события" week={week} />
      <ReflectionCard section="gratitudes" title="Благодарность" week={week} />
    </div>
  );
}
