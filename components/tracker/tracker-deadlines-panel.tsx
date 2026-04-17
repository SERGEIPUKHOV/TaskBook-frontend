"use client";

import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

import type { TrackerDeadline } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { TRACKER_SECTION_LABELS, TRACKER_STATUS_OPTIONS } from "./tracker-meta";

export function TrackerDeadlinesPanel({ deadlines }: { deadlines: TrackerDeadline[] }) {
  const patchTrackerGoalStatus = useAppStore((state) => state.patchTrackerGoalStatus);

  if (deadlines.length === 0) {
    return null;
  }

  return (
    <section className="paper-panel rounded-[32px] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">TaskTracker — дедлайны</div>
      <div className="mt-4 space-y-3">
        {deadlines.map((deadline) => (
          <div key={deadline.goalId} className="rounded-[24px] border border-line bg-paper/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[0.14em] text-muted">{TRACKER_SECTION_LABELS[deadline.section]}</div>
                <div className="mt-1 break-words text-sm font-semibold text-ink">{deadline.title}</div>
                <div className="mt-1 text-xs leading-6 text-muted">{deadline.breadcrumb.join(" → ")}</div>
              </div>
              <div className="shrink-0 text-sm font-medium text-ink">{format(parseISO(deadline.deadlineDate), "d MMM", { locale: ru })}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRACKER_STATUS_OPTIONS.map((option) => {
                const isActive = option.value === deadline.status;
                return (
                  <button
                    key={`${deadline.goalId}-${option.icon}`}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      option.className,
                      !isActive && "opacity-70 hover:opacity-100",
                    )}
                    onClick={() => void patchTrackerGoalStatus(deadline.goalId, option.value)}
                    type="button"
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
