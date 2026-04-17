"use client";

import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { TrackerSprintForm } from "./tracker-sprint-form";

type PendingDelete = {
  countdown: number;
  sprintId: string;
};

export function TrackerSprintSelector({ className }: { className?: string }) {
  const sprints = useAppStore((state) => state.trackerSprints);
  const fetchTrackerSprints = useAppStore((state) => state.fetchTrackerSprints);
  const setActiveTrackerSprint = useAppStore((state) => state.setActiveTrackerSprint);
  const deleteTrackerSprint = useAppStore((state) => state.deleteTrackerSprint);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const activeSprint = useMemo(() => sprints.find((sprint) => sprint.isActive) ?? sprints[0] ?? null, [sprints]);

  useEffect(() => {
    void fetchTrackerSprints();
  }, [fetchTrackerSprints]);

  useEffect(() => {
    if (!pendingDelete || pendingDelete.countdown === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPendingDelete((current) => (current ? { ...current, countdown: Math.max(0, current.countdown - 1) } : current));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pendingDelete]);

  function formatRange(startDate: string, endDate: string): string {
    return `${format(parseISO(startDate), "d MMM", { locale: ru })} – ${format(parseISO(endDate), "d MMM", { locale: ru })}`;
  }

  async function handleDelete(sprintId: string) {
    if (pendingDelete?.sprintId !== sprintId || pendingDelete.countdown > 0) {
      setPendingDelete({ sprintId, countdown: 3 });
      return;
    }

    await deleteTrackerSprint(sprintId);
    setPendingDelete(null);
    setIsOpen(false);
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          className="flex w-full items-center justify-between rounded-[22px] border border-line bg-paper/90 px-4 py-4 text-left shadow-paper transition-colors hover:border-accent"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Активный спринт</div>
            <div className="mt-1 truncate text-sm font-semibold text-ink">
              {activeSprint?.title ?? "Создай первый спринт"}
            </div>
            {activeSprint ? (
              <div className="mt-1 text-xs text-muted">{formatRange(activeSprint.startDate, activeSprint.endDate)}</div>
            ) : null}
          </div>
          <span className="ml-3 text-sm text-muted">∨</span>
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[24px] border border-line bg-paper shadow-paper">
            <div className="max-h-[320px] overflow-y-auto p-2">
              {sprints.map((sprint) => {
                const deleteState = pendingDelete?.sprintId === sprint.id ? pendingDelete : null;
                return (
                  <div key={sprint.id} className="rounded-[18px] border border-transparent px-2 py-2 transition-colors hover:bg-canvas/60">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={async () => {
                          await setActiveTrackerSprint(sprint.id);
                          setIsOpen(false);
                        }}
                        type="button"
                      >
                        <div className={cn("truncate text-sm font-medium", sprint.isActive ? "text-accent" : "text-ink")}>{sprint.title}</div>
                        <div className="mt-1 text-xs text-muted">{formatRange(sprint.startDate, sprint.endDate)}</div>
                      </button>
                      <button
                        className={cn(
                          "shrink-0 rounded-[14px] border px-3 py-2 text-xs font-medium transition-colors",
                          deleteState
                            ? deleteState.countdown > 0
                              ? "border-line bg-canvas text-muted"
                              : "border-danger bg-danger text-white"
                            : "border-line bg-paper text-muted hover:border-danger hover:text-danger",
                        )}
                        onClick={() => void handleDelete(sprint.id)}
                        type="button"
                      >
                        {deleteState ? (deleteState.countdown > 0 ? `Удалить (${deleteState.countdown})` : "Подтвердить") : "✕"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                className="mt-2 flex w-full items-center justify-center rounded-[18px] border border-dashed border-line bg-canvas/60 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                onClick={() => {
                  setIsCreating(true);
                  setIsOpen(false);
                }}
                type="button"
              >
                + Новый спринт
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <TrackerSprintForm onClose={() => setIsCreating(false)} open={isCreating} />
    </>
  );
}
