"use client";

import { useEffect, useMemo, useState } from "react";

import type { CalendarBulkImportSummary, CalendarEvent } from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import {
  buildCalendarBulkImportRows,
  buildCalendarEventImportPayload,
  formatCalendarBulkEventDate,
  formatCalendarBulkEventTime,
  formatCalendarBulkHabitDays,
  type CalendarBulkImportRow,
} from "@/components/calendar/calendar-import-helpers";

// BLOCK-START: CALENDAR_BULK_IMPORT_MODAL_MODULE
// Description: Modal for batch-importing visible calendar events into planner tasks or habits with per-row target overrides.
type CalendarBulkImportModalProps = {
  events: CalendarEvent[];
  onClose: () => void;
  onImported: (summary: CalendarBulkImportSummary) => void;
  weekNumber: number;
  weekYear: number;
};

export function CalendarBulkImportModal({
  events,
  onClose,
  onImported,
  weekNumber,
  weekYear,
}: CalendarBulkImportModalProps) {
  const bulkImportCalendarEventsToPlanner = useAppStore((state) => state.bulkImportCalendarEventsToPlanner);
  const [rows, setRows] = useState<CalendarBulkImportRow[]>(() => buildCalendarBulkImportRows(events));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(buildCalendarBulkImportRows(events));
    setError(null);
  }, [events]);

  const checkedCount = useMemo(() => rows.filter((row) => row.checked).length, [rows]);

  async function handleImport() {
    const selectedRows = rows.filter((row) => row.checked);
    if (selectedRows.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setRows((current) => current.map((row) => ({ ...row, error: undefined })));

    try {
      const summary = await bulkImportCalendarEventsToPlanner(
        selectedRows.map((row) => ({
          eventId: row.event.id,
          payload: buildCalendarEventImportPayload(row.event, row.targetType, weekYear, weekNumber),
        })),
      );
      onImported(summary);
      if (summary.errors.length === 0 || summary.importedCount === summary.requestedCount) {
        onClose();
        return;
      }

      const errorsByEventId = new Map(summary.errors.map((item) => [item.eventId, item.message]));
      setRows((current) =>
        current.map((row) => ({
          ...row,
          error: errorsByEventId.get(row.event.id),
        })),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось добавить события в план.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        aria-modal="true"
        className="paper-panel flex w-full max-w-2xl flex-col rounded-[32px]"
        style={{ maxHeight: "85vh" }}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div>
            <div className="text-base font-semibold leading-snug text-ink">Добавить события в план</div>
            <div className="mt-1 text-sm text-muted">
              Выберите события для добавления в недельный план.
            </div>
          </div>
          <button
            className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-2 pb-2">
          {rows.map((row) => (
            <div
              key={row.event.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border border-line bg-canvas/50 px-4 py-3"
            >
              <label className="flex items-center justify-center">
                <input
                  checked={row.checked}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((entry) =>
                        entry.event.id === row.event.id
                          ? { ...entry, checked: event.target.checked, error: undefined }
                          : entry,
                      ),
                    )
                  }
                  type="checkbox"
                />
              </label>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{row.event.title}</div>
                <div className="mt-1 text-xs text-muted">
                  {row.targetType === "habit" ? formatCalendarBulkHabitDays(row.event) : formatCalendarBulkEventDate(row.event)}
                </div>
                <div className="text-xs text-muted">{formatCalendarBulkEventTime(row.event)}</div>
                {row.error ? (
                  <div className="mt-1 text-xs text-danger">{row.error}</div>
                ) : null}
              </div>

              <div className={cn("flex gap-1", !row.checked && "opacity-50")}>
                {(["task", "habit"] as const).map((type) => (
                  <button
                    key={type}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                      row.targetType === type
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line text-muted hover:border-accent/40 hover:text-ink",
                    )}
                    disabled={isSubmitting}
                    onClick={() =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.event.id === row.event.id
                            ? {
                                ...entry,
                                error: undefined,
                                targetType: type,
                              }
                            : entry,
                        ),
                      )
                    }
                    type="button"
                  >
                    {type === "task" ? "Задача" : "Привычка"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-4">
        {error ? <div className="mb-3 text-sm text-danger">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            {checkedCount > 0 ? `Будет добавлено: ${checkedCount}` : "Выберите хотя бы одно событие."}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Отмена
            </button>
            <button
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={checkedCount === 0 || isSubmitting}
              onClick={() => void handleImport()}
              type="button"
            >
              {isSubmitting ? "Добавляем..." : `Добавить (${checkedCount})`}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
// BLOCK-END: CALENDAR_BULK_IMPORT_MODAL_MODULE
