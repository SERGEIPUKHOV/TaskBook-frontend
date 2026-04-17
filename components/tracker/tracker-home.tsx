"use client";

import { useAppStore } from "@/store/app-store";

import { TrackerGoalsGrid } from "./tracker-section-view";

export function TrackerHome() {
  const sprints = useAppStore((state) => state.trackerSprints);
  const sprintsStatus = useAppStore((state) => state.trackerSprintsStatus);
  const activeSprint = sprints.find((sprint) => sprint.isActive) ?? sprints[0] ?? null;

  if (sprintsStatus === "loading" && !activeSprint) {
    return <div className="paper-panel h-[520px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  if (!activeSprint) {
    return (
      <div className="paper-panel rounded-[32px] p-6 text-sm leading-7 text-muted">
        Спринтов пока нет. Создай первый спринт через селектор сверху — после этого можно добавлять мета-цели.
      </div>
    );
  }

  return <TrackerGoalsGrid sprintId={activeSprint.id} />;
}
