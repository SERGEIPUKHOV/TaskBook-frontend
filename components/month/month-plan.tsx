"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { MonthHabitList } from "@/components/month/month-habit-list";
import type { MonthData } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

type MonthPlanProps = {
  monthKey: string;
  month: MonthData;
};

type ListField = "focusAreas";

function syncTextareaHeight(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 36)}px`;
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[24px] border border-line bg-canvas/65 p-3">
      <div className="mb-3 text-base font-semibold text-ink">{title}</div>
      {children}
    </section>
  );
}

function AutoHeightTextarea({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="field-base min-h-9 resize-none overflow-hidden px-3 py-2 text-sm leading-6"
      onChange={(event) => onChange(event.target.value)}
      onInput={(event) => syncTextareaHeight(event.currentTarget)}
      placeholder={placeholder}
      rows={1}
      value={value}
    />
  );
}

function ListSection({
  field,
  monthKey,
  placeholder,
  title,
  values,
}: {
  field: ListField;
  monthKey: string;
  placeholder: string;
  title: string;
  values: string[];
}) {
  const addMonthListItem = useAppStore((state) => state.addMonthListItem);
  const deleteMonthListItem = useAppStore((state) => state.deleteMonthListItem);
  const updateMonthListItem = useAppStore((state) => state.updateMonthListItem);
  const inputRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const previousLengthRef = useRef(values.length);

  useEffect(() => {
    function resync() {
      Object.values(inputRefs.current).forEach((element) => syncTextareaHeight(element));
    }

    window.addEventListener("resize", resync);
    return () => window.removeEventListener("resize", resync);
  }, []);

  useEffect(() => {
    if (values.length <= previousLengthRef.current) {
      previousLengthRef.current = values.length;
      return;
    }

    const newIndex = values.length - 1;
    const frame = window.requestAnimationFrame(() => {
      inputRefs.current[newIndex]?.focus();
      inputRefs.current[newIndex]?.select();
    });

    previousLengthRef.current = values.length;
    return () => window.cancelAnimationFrame(frame);
  }, [values.length]);

  return (
    <Section title={title}>
      <div className="space-y-2">
        {values.map((value, index) => (
          <label
            key={`${field}-${index}`}
            className="grid grid-cols-[20px_minmax(0,1fr)_28px] items-center gap-3"
          >
            <span className="text-sm text-muted">{index + 1}.</span>
            <textarea
              ref={(element) => {
                inputRefs.current[index] = element;
                syncTextareaHeight(element);
              }}
              className="min-h-[36px] w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-2 text-sm leading-5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:bg-paper/80"
              onChange={(event) => {
                updateMonthListItem(monthKey, field, index, event.target.value);
                syncTextareaHeight(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
              placeholder={`${placeholder} ${index + 1}`}
              rows={1}
              value={value}
            />
            <button
              aria-label={`Удалить пункт ${index + 1}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-danger hover:text-danger"
              onClick={() => deleteMonthListItem(monthKey, field, index)}
              type="button"
            >
              ×
            </button>
          </label>
        ))}
      </div>

      <button
        className="mt-3 text-sm text-muted transition-colors hover:text-accent"
        onClick={() => addMonthListItem(monthKey, field)}
        type="button"
      >
        + Добавить пункт
      </button>
    </Section>
  );
}

export function MonthPlan({ monthKey, month }: MonthPlanProps) {
  const updateMonthText = useAppStore((state) => state.updateMonthText);

  return (
    <div className="paper-panel rounded-[32px] p-4 sm:p-6">
      <div className="mb-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted">Планирование</div>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Блоки планирования месяца</h2>
        </div>
      </div>

      <div className="space-y-3">
        <Section title="Главная задача месяца">
          <AutoHeightTextarea
            onChange={(value) => updateMonthText(monthKey, "mainGoal", value)}
            placeholder="Главная задача месяца..."
            value={month.mainGoal}
          />
        </Section>

        <ListSection
          field="focusAreas"
          monthKey={monthKey}
          placeholder="Фокус"
          title="Фокус месяца"
          values={month.focusAreas}
        />

        <MonthHabitList habits={month.habits} monthKey={monthKey} />

        <Section title="Другое важное">
          <AutoHeightTextarea
            onChange={(value) => updateMonthText(monthKey, "notes", value)}
            placeholder="Свободное поле для любых заметок..."
            value={month.notes}
          />
        </Section>
      </div>
    </div>
  );
}
