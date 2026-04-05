import type { CalendarEvent } from "@/lib/planner-types";

import { CalendarEventList } from "./calendar-event-list";

type CalendarEventsPanelProps = {
  emptyMessage: string;
  events: CalendarEvent[];
  isLoading?: boolean;
  kicker: string;
  title: string;
};

export function CalendarEventsPanel({
  emptyMessage,
  events,
  isLoading = false,
  kicker,
  title,
}: CalendarEventsPanelProps) {
  return (
    <section className="paper-panel rounded-[32px] p-5 sm:p-6">
      <div className="text-xs uppercase tracking-[0.22em] text-muted">{kicker}</div>
      <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-[24px] border border-line bg-paper/60" />
            <div className="h-24 animate-pulse rounded-[24px] border border-line bg-paper/60" />
          </div>
        ) : events.length > 0 ? (
          <CalendarEventList events={events} />
        ) : (
          <div className="rounded-[24px] border border-dashed border-line bg-canvas/50 px-4 py-6 text-sm leading-6 text-muted">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
