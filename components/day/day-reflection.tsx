"use client";

import { useEffect, useRef, useState } from "react";

import type { WeekData } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

type ReflectionSection = "keyEvents" | "gratitudes";

type ReflectionFieldProps = {
  dayKey: string;
  label: string;
  section: ReflectionSection;
  value: string;
  weekKey: string;
};

function ReflectionField({ dayKey, label, section, value, weekKey }: ReflectionFieldProps) {
  const updateWeekDayNote = useAppStore((state) => state.updateWeekDayNote);
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  function scheduleSave(nextValue: string) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      updateWeekDayNote(weekKey, section, dayKey, nextValue);
    }, 600);
  }

  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-ink">{label}</div>
      <textarea
        className="field-base min-h-[110px] w-full resize-y rounded-[20px] px-4 py-3 text-sm leading-6"
        onBlur={() => updateWeekDayNote(weekKey, section, dayKey, draft)}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraft(nextValue);
          scheduleSave(nextValue);
        }}
        placeholder="—"
        rows={4}
        value={draft}
      />
    </label>
  );
}

type DayReflectionProps = {
  dayKey: string;
  week: WeekData;
  weekKey: string;
};

export function DayReflection({ dayKey, week, weekKey }: DayReflectionProps) {
  return (
    <section className="paper-panel rounded-[32px] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">День</div>
      <div className="mt-4 space-y-4">
        <ReflectionField
          dayKey={dayKey}
          label="Ключевое событие"
          section="keyEvents"
          value={week.reflection.keyEvents[dayKey] ?? ""}
          weekKey={weekKey}
        />
        <ReflectionField
          dayKey={dayKey}
          label="Благодарность"
          section="gratitudes"
          value={week.reflection.gratitudes[dayKey] ?? ""}
          weekKey={weekKey}
        />
      </div>
    </section>
  );
}
