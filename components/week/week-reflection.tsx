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
    <label className="flex min-h-10 items-start gap-3 border-b border-line/45 py-2 last:border-b-0">
      <span className="w-[130px] flex-shrink-0 pt-1 text-sm text-muted">{formatDayStamp(parseISO(dayKey))}</span>
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          syncTextareaHeight(element);
        }}
        className="min-h-6 w-full resize-none overflow-hidden border-0 border-b border-transparent bg-transparent px-0 py-0 text-sm leading-6 text-ink outline-none placeholder:text-muted/55 focus:border-accent"
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
      <div className="mt-5">
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
