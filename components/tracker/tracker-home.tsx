"use client";

import { useSearchParams } from "next/navigation";

import { useAppStore } from "@/store/app-store";

import { TrackerSectionView } from "./tracker-section-view";
import { isTrackerSection } from "./tracker-meta";

export function TrackerHome() {
  const searchParams = useSearchParams();
  const sprints = useAppStore((state) => state.trackerSprints);
  const sprintsStatus = useAppStore((state) => state.trackerSprintsStatus);
  const activeSprint = sprints.find((sprint) => sprint.isActive) ?? sprints[0] ?? null;
  const sectionParam = searchParams.get("section");
  const section = isTrackerSection(sectionParam) ? sectionParam : "money";

  if (sprintsStatus === "loading" && !activeSprint) {
    return <div className="paper-panel h-[520px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  if (!activeSprint) {
    return (
      <div className="paper-panel rounded-[32px] p-6 text-sm leading-7 text-muted">
        Спринтов пока нет. Создай первый спринт через селектор сверху, и после этого секции станут активными.
      </div>
    );
  }

  return <TrackerSectionView section={section} sprintId={activeSprint.id} />;
}
