"use client";

import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

import type { TrackerDeadline, TrackerGoalStatus } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { TRACKER_SECTION_COLORS, TRACKER_SECTION_ITEMS, TRACKER_STATUS_OPTIONS } from "./tracker-meta";

const STATUS_CYCLE: TrackerGoalStatus[] = [null, "done", "not_done", "done_with_delay"];

function nextStatus(current: TrackerGoalStatus): TrackerGoalStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? null;
}

export function TrackerDeadlinesPanel({ deadlines }: { deadlines: TrackerDeadline[] }) {
  const patchTrackerGoalStatus = useAppStore((state) => state.patchTrackerGoalStatus);

  if (deadlines.length === 0) {
    return null;
  }

  return (
    <section className="paper-panel rounded-[32px] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">TaskTracker — дедлайны</div>
      <div className="mt-3 divide-y divide-line">
        {deadlines.map((deadline) => {
          const sectionItem = TRACKER_SECTION_ITEMS.find((s) => s.id === deadline.section);
          const statusOpt = TRACKER_STATUS_OPTIONS.find((o) => o.value === deadline.status) ?? TRACKER_STATUS_OPTIONS[3]!;

          return (
            <div key={deadline.goalId} className="py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold", TRACKER_SECTION_COLORS[deadline.section])}>{sectionItem?.icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{deadline.title}</span>
                <button
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border text-xs font-medium transition-colors",
                    statusOpt.className,
                  )}
                  onClick={() => void patchTrackerGoalStatus(deadline.goalId, nextStatus(deadline.status))}
                  title="Изменить статус"
                  type="button"
                >
                  {statusOpt.icon}
                </button>
              </div>
              <div className="mt-0.5 flex items-center gap-3 pl-6">
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{deadline.breadcrumb.join(" → ")}</span>
                <span className="shrink-0 text-xs text-muted">{format(parseISO(deadline.deadlineDate), "d MMM", { locale: ru })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
