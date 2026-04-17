"use client";

import { addDays, format } from "date-fns";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useAppStore } from "@/store/app-store";

type TrackerSprintFormProps = {
  onClose: () => void;
  open: boolean;
};

export function TrackerSprintForm({ onClose, open }: TrackerSprintFormProps) {
  const createTrackerSprint = useAppStore((state) => state.createTrackerSprint);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const today = new Date();
    setTitle("");
    setStartDate(format(today, "yyyy-MM-dd"));
    setEndDate(format(addDays(today, 27), "yyyy-MM-dd"));
    setError(null);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Введите название спринта.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createTrackerSprint(title.trim(), startDate, endDate);
      onClose();
    } catch (reason) {
      setError((reason as Error)?.message || "Не удалось создать спринт.");
    } finally {
      setIsSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-lg rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Новый спринт</div>
        <h3 className="mt-3 text-xl font-semibold text-ink">Создать спринт TaskTracker</h3>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Название</span>
            <input
              className="h-11 w-full rounded-[16px] border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors focus:border-accent"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например, Майский спринт"
              value={title}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Старт</span>
              <input
                className="h-11 w-full rounded-[16px] border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors focus:border-accent"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Финиш</span>
              <input
                className="h-11 w-full rounded-[16px] border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors focus:border-accent"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
          </div>
          {error ? <div className="rounded-[16px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
              onClick={onClose}
              type="button"
            >
              Отмена
            </button>
            <button
              className="rounded-[18px] border border-line bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Создаём..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
