"use client";

import {
  addDays,
  format,
  getHours,
  getMinutes,
  isSameDay,
  parseISO,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { CalendarConnection, CalendarEvent } from "@/lib/planner-types";

const HOUR_HEIGHT = 58;
const COLLAPSED_HOUR_HEIGHT = 30;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const FALLBACK_COLOR = "#616161";

function getActiveHours(events: CalendarEvent[]): Set<number> {
  const activeHours = new Set<number>();

  for (const event of events) {
    if (event.isAllDay) {
      continue;
    }

    const start = parseISO(event.startsAt);
    const end = parseISO(event.endsAt);
    const startHour = getHours(start);
    const endHour = Math.min(23, getHours(end));

    for (let hour = startHour; hour <= endHour; hour += 1) {
      activeHours.add(hour);
    }
  }

  return activeHours;
}

function hourHeightOf(hour: number, activeHours: Set<number>): number {
  return activeHours.has(hour) ? HOUR_HEIGHT : COLLAPSED_HOUR_HEIGHT;
}

function minutesToPx(totalMinutes: number, activeHours: Set<number>): number {
  const clampedMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
  const wholeHours = Math.floor(clampedMinutes / 60);
  const minuteInHour = clampedMinutes % 60;
  let offset = 0;

  for (let hour = 0; hour < Math.min(wholeHours, 24); hour += 1) {
    offset += hourHeightOf(hour, activeHours);
  }

  if (wholeHours >= 24) {
    return offset;
  }

  return offset + (minuteInHour / 60) * hourHeightOf(wholeHours, activeHours);
}

function getEventTop(startsAt: string, activeHours: Set<number>): number {
  const date = parseISO(startsAt);
  return minutesToPx(getHours(date) * 60 + getMinutes(date), activeHours);
}

function getEventHeight(startsAt: string, endsAt: string, activeHours: Set<number>): number {
  const start = parseISO(startsAt);
  const end = parseISO(endsAt);
  const startMinutes = getHours(start) * 60 + getMinutes(start);
  const endMinutes = getHours(end) * 60 + getMinutes(end);

  if (endMinutes <= startMinutes) {
    return 20;
  }

  return Math.max(minutesToPx(endMinutes, activeHours) - minutesToPx(startMinutes, activeHours), 20);
}

function getTotalHeight(activeHours: Set<number>): number {
  return HOURS.reduce((height, hour) => height + hourHeightOf(hour, activeHours), 0);
}

function withAlpha(color: string, alpha: string): string {
  return `${color}${alpha}`;
}

function eventStyle(color: string, provider: CalendarConnection["provider"]): CSSProperties {
  if (provider === "google") {
    return {
      backgroundColor: withAlpha(color, "26"),
      borderColor: color,
      color: "rgb(var(--ink))",
    };
  }

  return {
    backgroundColor: withAlpha(color, "15"),
    borderColor: withAlpha(color, "60"),
    color: "rgb(var(--ink))",
  };
}

function formatEventTimeLabel(event: CalendarEvent): string {
  if (event.isAllDay) {
    return "Весь день";
  }

  return `${format(parseISO(event.startsAt), "d MMM, HH:mm", { locale: ru })} — ${format(parseISO(event.endsAt), "HH:mm", { locale: ru })}`;
}

const PROXIMITY_MS = 30 * 60 * 1000;

function groupEventsByProximity(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];
  const sorted = [...events].sort(
    (a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime(),
  );
  const groups: CalendarEvent[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const currentGroup = groups[groups.length - 1];
    const lastEvent = currentGroup[currentGroup.length - 1];
    const diff = parseISO(sorted[i].startsAt).getTime() - parseISO(lastEvent.startsAt).getTime();
    if (diff < PROXIMITY_MS) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups;
}

type CalendarWeekGridProps = {
  connections: CalendarConnection[];
  events: CalendarEvent[];
  isLoading: boolean;
  weekStart: Date;
};

export function CalendarWeekGrid({ connections, events, isLoading, weekStart }: CalendarWeekGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeHours = useMemo(() => getActiveHours(events), [events]);
  const totalHeight = useMemo(() => getTotalHeight(activeHours), [activeHours]);
  const hourOffsets = useMemo(() => {
    let currentTop = 0;

    return HOURS.map((hour) => {
      const height = hourHeightOf(hour, activeHours);
      const offset = { hour, height, top: currentTop };
      currentTop += height;
      return offset;
    });
  }, [activeHours]);
  const [nowTop, setNowTop] = useState<number>(() => {
    const now = new Date();
    return minutesToPx(getHours(now) * 60 + getMinutes(now), activeHours);
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const colorMap = useMemo(() => {
    const map = new Map<string, { color: string; provider: CalendarConnection["provider"] }>();

    for (const connection of connections) {
      map.set(connection.id, {
        color: connection.color ?? FALLBACK_COLOR,
        provider: connection.provider,
      });
    }

    return map;
  }, [connections]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: Math.max(nowTop - HOUR_HEIGHT * 2, 0),
    });
    // Intentionally scroll only on the first mount for a stable week-navigation feel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateNowTop = () => {
      const now = new Date();
      setNowTop(minutesToPx(getHours(now) * 60 + getMinutes(now), activeHours));
    };

    updateNowTop();
    const interval = setInterval(updateNowTop, 60_000);

    return () => clearInterval(interval);
  }, [activeHours]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = new Date();
  const hasAllDayEvents = days.some((day) =>
    events.some((event) => event.isAllDay && isSameDay(parseISO(event.startsAt), day)),
  );
  const selectedEventColor = selectedEvent
    ? (colorMap.get(selectedEvent.connectionId)?.color ?? FALLBACK_COLOR)
    : FALLBACK_COLOR;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-2xl border border-line bg-paper/60" />
        <div className="h-[400px] animate-pulse rounded-[24px] border border-line bg-paper/60" />
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[600px] overflow-auto rounded-[28px] border border-line bg-canvas/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative min-w-[760px]">
          <div className="sticky top-0 z-20 flex border-b border-line bg-paper/95 backdrop-blur-sm">
            <div className="sticky left-0 z-30 w-12 shrink-0 bg-paper/95" />
            {days.map((day) => {
              const isToday = isSameDay(day, today);

              return (
                <div key={day.toISOString()} className="flex min-w-[100px] flex-1 flex-col items-center py-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {format(day, "EEE", { locale: ru })}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <span
                      className={[
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-semibold",
                        isToday ? "bg-accent text-white" : "text-ink",
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="text-muted">{format(day, "MMM", { locale: ru })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {hasAllDayEvents ? (
            <div className="sticky top-14 z-20 flex border-b border-line bg-paper/90 backdrop-blur-sm">
              <div className="sticky left-0 z-30 w-12 shrink-0 bg-paper/90 py-2 pr-2 text-right text-[10px] leading-none text-muted">
                весь день
              </div>
              {days.map((day) => {
                const dayAllDayEvents = events.filter(
                  (event) => event.isAllDay && isSameDay(parseISO(event.startsAt), day),
                );

                return (
                  <div key={day.toISOString()} className="min-w-[100px] flex-1 space-y-1 px-1 py-1.5">
                    {dayAllDayEvents.map((event) => {
                      const resolved = colorMap.get(event.connectionId) ?? {
                        color: FALLBACK_COLOR,
                        provider: event.provider,
                      };

                      return (
                        <button
                          key={event.id}
                          className="w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition duration-150 cursor-pointer hover:brightness-95"
                          style={eventStyle(resolved.color, resolved.provider)}
                          title={event.title}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="relative flex" style={{ height: totalHeight }}>
            <div className="sticky left-0 z-10 w-12 shrink-0 border-r border-line bg-canvas/95 backdrop-blur-sm">
              {hourOffsets.map(({ hour, height }) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-2 text-[10px] leading-none text-muted"
                  style={{ height }}
                >
                  {`${String(hour).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const dayEvents = events.filter(
                (event) => !event.isAllDay && isSameDay(parseISO(event.startsAt), day),
              );

              return (
                <div key={day.toISOString()} className="relative min-w-[100px] flex-1 border-l border-line">
                  {hourOffsets.map(({ hour, top }) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-line/50"
                      style={{ top }}
                    />
                  ))}

                  {isToday ? (
                    <div className="absolute inset-x-0 z-10 h-px bg-red-500" style={{ top: nowTop }}>
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  ) : null}

                  {groupEventsByProximity(dayEvents).flatMap((group) =>
                    group.map((event, colIndex) => {
                      const colTotal = group.length;
                      const colWidth = 100 / colTotal;
                      const colLeft = colWidth * colIndex;
                      const resolved = colorMap.get(event.connectionId) ?? {
                        color: FALLBACK_COLOR,
                        provider: event.provider,
                      };
                      return (
                        <button
                          key={event.id}
                          className={[
                            "absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm transition duration-150 cursor-pointer hover:brightness-95",
                          ].join(" ")}
                          style={{
                            ...eventStyle(resolved.color, resolved.provider),
                            top: getEventTop(event.startsAt, activeHours),
                            height: getEventHeight(event.startsAt, event.endsAt, activeHours),
                            left: `calc(${colLeft}% + 2px)`,
                            width: `calc(${colWidth}% - 4px)`,
                          }}
                          title={event.title}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className={colTotal > 1 ? "line-clamp-2 font-medium" : "truncate font-medium"}>{event.title}</div>
                          <div className="truncate opacity-70">{format(parseISO(event.startsAt), "HH:mm")}</div>
                        </button>
                      );
                    }),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {selectedEvent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            aria-modal="true"
            className="paper-panel w-full max-w-sm overflow-y-auto rounded-[32px] p-6"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-base font-semibold leading-snug text-ink">{selectedEvent.title}</div>
              <button
                className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink"
                type="button"
                onClick={() => setSelectedEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3 text-sm leading-6 text-muted">
              <div>{formatEventTimeLabel(selectedEvent)}</div>

              {selectedEvent.location ? (
                <div className="text-ink">{selectedEvent.location}</div>
              ) : null}

              {selectedEvent.description ? (
                <div className="whitespace-pre-line text-ink">{selectedEvent.description}</div>
              ) : null}

              {selectedEvent.accountLabel ? (
                <div className="flex items-center gap-1.5 pt-1 text-xs uppercase tracking-[0.12em] text-muted">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedEventColor }}
                  />
                  <span>{selectedEvent.accountLabel}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
