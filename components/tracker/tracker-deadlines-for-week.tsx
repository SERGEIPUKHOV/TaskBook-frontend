"use client";

import { useEffect } from "react";

import { getWeekKey } from "@/lib/dates";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

import { TrackerDeadlinesPanel } from "./tracker-deadlines-panel";

export function TrackerDeadlinesForWeek({ weekNum, weekYear }: { weekNum: number; weekYear: number }) {
  const user = useAuthStore((state) => state.user);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const fetchTrackerWeekDeadlines = useAppStore((state) => state.fetchTrackerWeekDeadlines);
  const deadlines = useAppStore((state) => state.trackerWeekDeadlines[getWeekKey(weekYear, weekNum)] ?? []);

  useEffect(() => {
    if (!user?.tasktrackerEnabled || viewingAs) {
      return;
    }
    void fetchTrackerWeekDeadlines(weekYear, weekNum);
  }, [fetchTrackerWeekDeadlines, user?.tasktrackerEnabled, viewingAs, weekNum, weekYear]);

  if (!user?.tasktrackerEnabled || viewingAs) {
    return null;
  }

  return <TrackerDeadlinesPanel deadlines={deadlines} />;
}
