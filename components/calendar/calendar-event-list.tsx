import { addDays, format, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

import type { CalendarEvent } from "@/lib/planner-types";

function providerLabel(provider: CalendarEvent["provider"]): string {
  return provider === "google" ? "Google" : "Apple";
}

function formatEventTiming(event: CalendarEvent): string {
  const startsAt = parseISO(event.startsAt);
  const endsAt = parseISO(event.endsAt);

  if (event.isAllDay) {
    const inclusiveEnd = addDays(endsAt, -1);
    if (isSameDay(startsAt, inclusiveEnd)) {
      return `Весь день · ${format(startsAt, "d MMM", { locale: ru })}`;
    }

    return `${format(startsAt, "d MMM", { locale: ru })} - ${format(inclusiveEnd, "d MMM", {
      locale: ru,
    })}`;
  }

  if (isSameDay(startsAt, endsAt)) {
    return `${format(startsAt, "d MMM, HH:mm", { locale: ru })} - ${format(endsAt, "HH:mm")}`;
  }

  return `${format(startsAt, "d MMM, HH:mm", { locale: ru })} - ${format(endsAt, "d MMM, HH:mm", {
    locale: ru,
  })}`;
}

type CalendarEventListProps = {
  events: CalendarEvent[];
};

export function CalendarEventList({ events }: CalendarEventListProps) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-[24px] border border-line bg-canvas/70 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">{event.title}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{formatEventTiming(event)}</div>
            </div>
            <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-muted">
              {event.accountLabel || providerLabel(event.provider)}
            </span>
          </div>

          {event.location ? <div className="mt-3 text-sm text-ink/80">{event.location}</div> : null}
          {event.description ? <div className="mt-2 text-sm leading-6 text-muted">{event.description}</div> : null}
        </article>
      ))}
    </div>
  );
}
