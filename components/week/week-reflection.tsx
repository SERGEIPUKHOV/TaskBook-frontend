"use client";

import { parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";

import type { WeekData } from "@/lib/planner-types";
import { formatDayStamp } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { getWeekDayKeys } from "@/lib/week-tasks";

type ReflectionSection = "keyEvents" | "gratitudes";

type WeekReflectionProps = {
  weekKey: string;
  week: WeekData;
};

function syncTextareaHeight(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 24)}px`;
}

function ReflectionRow({
  dayKey,
  section,
  value,
  weekKey,
}: {
  dayKey: string;
  section: ReflectionSection;
  value: string;
  weekKey: string;
}) {
  const updateWeekDayNote = useAppStore((state) => state.updateWeekDayNote);
  const [draft, setDraft] = useState(value);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [draft]);

  useEffect(() => {
    function handleResize() {
      syncTextareaHeight(textareaRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  function scheduleSave(nextValue: string) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      updateWeekDayNote(weekKey, section, dayKey, nextValue);
    }, 800);
  }

  return (
    <label className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
      <span className="text-sm text-muted">{formatDayStamp(parseISO(dayKey))}</span>
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          syncTextareaHeight(element);
        }}
        className="min-h-[36px] w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-2 text-sm leading-5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:bg-paper/80"
        onBlur={() => scheduleSave(draft)}
        onChange={(event) => {
          setDraft(event.target.value);
          syncTextareaHeight(event.currentTarget);
        }}
        placeholder="—"
        rows={1}
        value={draft}
      />
    </label>
  );
}

function ReflectionCard({
  section,
  title,
  week,
  weekKey,
}: {
  section: ReflectionSection;
  title: string;
  week: WeekData;
  weekKey: string;
}) {
  const dayKeys = getWeekDayKeys(week.startDate);

  return (
    <article className="paper-panel rounded-[32px] p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{title}</div>
      <div className="space-y-1.5 border-y border-line/80 py-3 mt-3">
        {dayKeys.map((dayKey) => (
          <ReflectionRow
            key={`${section}-${dayKey}`}
            dayKey={dayKey}
            section={section}
            value={week.reflection[section][dayKey] ?? ""}
            weekKey={weekKey}
          />
        ))}
      </div>
    </article>
  );
}

export function WeekReflection({ weekKey, week }: WeekReflectionProps) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ReflectionCard section="keyEvents" title="Ключевые события" week={week} weekKey={weekKey} />
      <ReflectionCard section="gratitudes" title="Благодарность" week={week} weekKey={weekKey} />
    </div>
  );
}
