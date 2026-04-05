import { Suspense } from "react";

import { CalendarScreen } from "@/components/calendar/calendar-screen";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={<div className="paper-panel h-[640px] animate-pulse rounded-[32px] border border-line bg-paper/60" />}
    >
      <CalendarScreen />
    </Suspense>
  );
}
