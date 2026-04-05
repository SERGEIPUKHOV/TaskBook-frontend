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
import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarEvent } from "@/lib/planner-types";

const HOUR_HEIGHT = 58;
const COLLAPSED_HOUR_HEIGHT = 10;
const HOURS = Array.from({ length: 24 }, (_, index) => index);

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

function eventColorClass(provider: CalendarEvent["provider"]): string {
  return provider === "google"
    ? "border-[#4285F4] bg-[#4285F4]/15 text-[#4285F4]"
    : "border-line bg-muted/10 text-ink";
}

type CalendarWeekGridProps = {
  events: CalendarEvent[];
  isLoading: boolean;
  weekStart: Date;
};

export function CalendarWeekGrid({ events, isLoading, weekStart }: CalendarWeekGridProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-2xl border border-line bg-paper/60" />
        <div className="h-[400px] animate-pulse rounded-[24px] border border-line bg-paper/60" />
      </div>
    );
  }

  return (
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
                  {dayAllDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded border border-accent/20 bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
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

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={[
                      "absolute inset-x-0.5 overflow-hidden rounded border px-1 py-0.5 text-[11px] leading-tight shadow-sm",
                      eventColorClass(event.provider),
                    ].join(" ")}
                    style={{
                      top: getEventTop(event.startsAt, activeHours),
                      height: getEventHeight(event.startsAt, event.endsAt, activeHours),
                    }}
                    title={event.title}
                  >
                    <div className="truncate font-medium">{event.title}</div>
                    <div className="truncate opacity-70">{format(parseISO(event.startsAt), "HH:mm")}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
