"use client";

import { useEffect, useRef, useState } from "react";

import type { WeekData } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

type WeekSummaryProps = {
  weekKey: string;
  week: WeekData;
};

function syncTextareaHeight(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 64)}px`;
}

function SummaryCard({
  initiallyOpen,
  onBlur,
  onChange,
  placeholder,
  resetKey,
  title,
  value,
}: {
  initiallyOpen: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  resetKey: string;
  title: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(initiallyOpen);
  const previousResetKeyRef = useRef(resetKey);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [open, value]);

  useEffect(() => {
    if (previousResetKeyRef.current !== resetKey) {
      previousResetKeyRef.current = resetKey;
      setOpen(initiallyOpen);
    }
  }, [initiallyOpen, resetKey]);

  return (
    <article className="paper-panel rounded-[28px]">
      <button
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{title}</div>
        <span className="text-sm text-muted">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="px-6 pb-6">
        <textarea
          ref={textareaRef}
          className="min-h-16 w-full resize-none overflow-hidden border-0 border-b border-transparent bg-transparent px-0 py-0 text-sm leading-7 text-ink outline-none placeholder:text-muted/55 focus:border-accent"
          onBlur={onBlur}
          onChange={(event) => {
            onChange(event.target.value);
            syncTextareaHeight(event.currentTarget);
          }}
          placeholder={placeholder}
          rows={2}
          value={value}
        />
        </div>
      ) : null}
    </article>
  );
}

export function WeekSummary({ weekKey, week }: WeekSummaryProps) {
  const updateWeekText = useAppStore((state) => state.updateWeekText);
  const [focusDraft, setFocusDraft] = useState(week.reflection.focus);
  const [rewardDraft, setRewardDraft] = useState(week.reflection.reward);
  const saveTimersRef = useRef<Record<"focus" | "reward", number | undefined>>({
    focus: undefined,
    reward: undefined,
  });

  useEffect(() => {
    setFocusDraft(week.reflection.focus);
    setRewardDraft(week.reflection.reward);
  }, [week.reflection.focus, week.reflection.reward, weekKey]);

  useEffect(
    () => () => {
      if (saveTimersRef.current.focus) {
        window.clearTimeout(saveTimersRef.current.focus);
      }

      if (saveTimersRef.current.reward) {
        window.clearTimeout(saveTimersRef.current.reward);
      }
    },
    [],
  );

  function scheduleSave(field: "focus" | "reward", value: string) {
    if (saveTimersRef.current[field]) {
      window.clearTimeout(saveTimersRef.current[field]);
    }

    saveTimersRef.current[field] = window.setTimeout(() => {
      updateWeekText(weekKey, field, value);
    }, 800);
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <SummaryCard
        initiallyOpen={week.reflection.focus.trim().length > 0}
        onBlur={() => scheduleSave("focus", focusDraft)}
        onChange={setFocusDraft}
        placeholder="Цель этой недели..."
        resetKey={`${weekKey}:focus`}
        title="Фокус недели"
        value={focusDraft}
      />
      <SummaryCard
        initiallyOpen={week.reflection.reward.trim().length > 0}
        onBlur={() => scheduleSave("reward", rewardDraft)}
        onChange={setRewardDraft}
        placeholder="Мотивация за выполнение..."
        resetKey={`${weekKey}:reward`}
        title="Награда недели"
        value={rewardDraft}
      />
    </div>
  );
}
