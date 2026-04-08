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

function DayReflectionCard({ dayKey, label, section, value, weekKey }: ReflectionFieldProps) {
  const updateWeekDayNote = useAppStore((state) => state.updateWeekDayNote);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(value.trim().length > 0);
  const timerRef = useRef<number | null>(null);
  const previousDayKeyRef = useRef(dayKey);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (previousDayKeyRef.current !== dayKey) {
      previousDayKeyRef.current = dayKey;
      setOpen(value.trim().length > 0);
    }
  }, [dayKey, value]);

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
    <article className="paper-panel rounded-[32px]">
      <button
        className="flex w-full items-center justify-between px-5 pt-5 pb-3 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</div>
        <span className="text-sm text-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="px-5 pb-5">
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
        </div>
      ) : null}
    </article>
  );
}

type DayReflectionProps = {
  dayKey: string;
  week: WeekData;
  weekKey: string;
};

export function DayReflection({ dayKey, week, weekKey }: DayReflectionProps) {
  return (
    <>
      <DayReflectionCard
        dayKey={dayKey}
        label="Ключевое событие"
        section="keyEvents"
        value={week.reflection.keyEvents[dayKey] ?? ""}
        weekKey={weekKey}
      />
      <DayReflectionCard
        dayKey={dayKey}
        label="Благодарность"
        section="gratitudes"
        value={week.reflection.gratitudes[dayKey] ?? ""}
        weekKey={weekKey}
      />
    </>
  );
}
