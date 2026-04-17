"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

import { TrackerDeadlinesPanel } from "./tracker-deadlines-panel";

export function TrackerDeadlinesForDay({ date }: { date: string }) {
  const user = useAuthStore((state) => state.user);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const fetchTrackerDayDeadlines = useAppStore((state) => state.fetchTrackerDayDeadlines);
  const deadlines = useAppStore((state) => state.trackerDayDeadlines[date] ?? []);

  useEffect(() => {
    if (!user?.tasktrackerEnabled || viewingAs) {
      return;
    }
    void fetchTrackerDayDeadlines(date);
  }, [date, fetchTrackerDayDeadlines, user?.tasktrackerEnabled, viewingAs]);

  if (!user?.tasktrackerEnabled || viewingAs) {
    return null;
  }

  return <TrackerDeadlinesPanel deadlines={deadlines} />;
}
