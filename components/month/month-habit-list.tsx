"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Habit } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type MonthHabitListProps = {
  habits: Habit[];
  monthKey: string;
};

type PendingDeleteState = {
  countdown: number;
  habitId: string;
  habitName: string;
};

function syncTextareaHeight(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 36)}px`;
}

function DeleteDialog({
  onCancel,
  onConfirm,
  state,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: PendingDeleteState;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-md rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-danger">Удалить привычку?</div>
        <p className="mt-4 text-sm leading-7 text-muted">
          Это действие нельзя отменить. Привычка
          <span className="font-medium text-ink"> «{state.habitName || "Без названия"}» </span>
          будет удалена из этого месяца, его недель и всех будущих месяцев.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button
            className={cn(
              "rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
              state.countdown > 0
                ? "cursor-not-allowed border border-line bg-canvas text-muted"
                : "border border-danger bg-danger text-white",
            )}
            disabled={state.countdown > 0}
            onClick={onConfirm}
            type="button"
          >
            {state.countdown > 0 ? `Удалить (${state.countdown})` : "Удалить"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MonthHabitList({ habits, monthKey }: MonthHabitListProps) {
  const addHabit = useAppStore((state) => state.addHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const updateHabitName = useAppStore((state) => state.updateHabitName);
  const newHabitInputRef = useRef<HTMLInputElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimersRef = useRef<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  useEffect(() => {
    setDrafts((current) =>
      Object.fromEntries(habits.map((habit) => [habit.id, current[habit.id] ?? habit.name])),
    );
  }, [habits]);

  useEffect(() => {
    if (!pendingDelete || pendingDelete.countdown === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingDelete((current) =>
        current ? { ...current, countdown: Math.max(0, current.countdown - 1) } : current,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pendingDelete]);

  useEffect(
    () => () => {
      Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    Object.values(inputRefs.current).forEach((element) => syncTextareaHeight(element));
  }, [drafts, habits.length]);

  function scheduleSave(habitId: string, value: string) {
    window.clearTimeout(saveTimersRef.current[habitId]);
    saveTimersRef.current[habitId] = window.setTimeout(() => {
      updateHabitName(monthKey, habitId, value);
    }, 800);
  }

  async function handleAddHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAdding) {
      return;
    }

    const trimmedName = newHabitName.trim();

    if (!trimmedName) {
      setAddError("Введите название привычки.");
      return;
    }

    if (trimmedName.length > 100) {
      setAddError("Название привычки должно быть не длиннее 100 символов.");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    const result = await addHabit(monthKey, trimmedName);

    if (!result.ok) {
      setIsAdding(false);

      if (result.reason === "duplicate_name") {
        setAddError("Привычка с таким названием уже существует.");
        return;
      }

      if (result.reason === "empty_name") {
        setAddError("Введите название привычки.");
        return;
      }

      setAddError("Не удалось добавить привычку. Попробуй ещё раз.");
      return;
    }

    setNewHabitName("");
    setIsAdding(false);
    window.requestAnimationFrame(() => {
      newHabitInputRef.current?.focus();
    });
  }

  return (
    <>
      <section className="rounded-[28px] border border-line bg-canvas/65 p-4">
        <div className="mb-3">
          <div className="text-base font-semibold text-ink">Привычки месяца</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted">что добавляем и от чего отказываемся</div>
        </div>
        <div className="space-y-1.5 border-y border-line/80 py-3">
          {habits.map((habit, index) => (
            <label key={habit.id} className="grid grid-cols-[20px_minmax(0,1fr)_32px] items-center gap-3">
              <span className="text-sm text-muted">{index + 1}.</span>
              <textarea
                ref={(element) => {
                  inputRefs.current[habit.id] = element;
                  syncTextareaHeight(element);
                }}
                className="min-h-[36px] w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-2 text-sm leading-5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:bg-paper/80"
                onBlur={() => scheduleSave(habit.id, drafts[habit.id] ?? "")}
                onChange={(event) => {
                  setDrafts((current) => ({
                    ...current,
                    [habit.id]: event.target.value,
                  }));
                  syncTextareaHeight(event.currentTarget);
                }}
                onInput={(event) => syncTextareaHeight(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Новая привычка..."
                rows={1}
                value={drafts[habit.id] ?? ""}
              />
              <button
                aria-label={`Удалить ${habit.name || "привычку"}`}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-danger hover:text-danger"
                onClick={() =>
                  setPendingDelete({
                    countdown: 5,
                    habitId: habit.id,
                    habitName: drafts[habit.id] ?? habit.name,
                  })
                }
                type="button"
              >
                ×
              </button>
            </label>
          ))}
        </div>
        <form className="mt-3 space-y-2" onSubmit={handleAddHabit}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={newHabitInputRef}
              className="field-base h-10 flex-1 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isAdding}
              maxLength={100}
              onChange={(event) => {
                setNewHabitName(event.target.value);
                if (addError) {
                  setAddError(null);
                }
              }}
              placeholder="Новая привычка..."
              value={newHabitName}
            />
            <button
              className={cn(
                "rounded-[18px] border px-4 py-2.5 text-sm font-medium transition-colors",
                isAdding
                  ? "cursor-not-allowed border-line bg-canvas text-muted"
                  : "border-line bg-paper text-ink hover:border-accent hover:text-accent",
              )}
              disabled={isAdding}
              type="submit"
            >
              {isAdding ? "Добавление..." : "+ Добавить привычку"}
            </button>
          </div>
          {addError ? <div className="text-xs text-danger">{addError}</div> : null}
        </form>
      </section>

      {pendingDelete ? (
        <DeleteDialog
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteHabit(monthKey, pendingDelete.habitId);
            setPendingDelete(null);
          }}
          state={pendingDelete}
        />
      ) : null}
    </>
  );
}
