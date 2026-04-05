"use client";

import {
  addDays,
  differenceInMinutes,
  format,
  getHours,
  getMinutes,
  isSameDay,
  parseISO,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

import type { CalendarEvent } from "@/lib/planner-types";

const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, index) => index);

function getEventTop(startsAt: string): number {
  const date = parseISO(startsAt);
  return ((getHours(date) * 60 + getMinutes(date)) / 60) * HOUR_HEIGHT;
}

function getEventHeight(startsAt: string, endsAt: string): number {
  const start = parseISO(startsAt);
  const end = parseISO(endsAt);
  return Math.max((differenceInMinutes(end, start) / 60) * HOUR_HEIGHT, 20);
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
  const [nowTop, setNowTop] = useState<number>(() => {
    const now = new Date();
    return ((getHours(now) * 60 + getMinutes(now)) / 60) * HOUR_HEIGHT;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: Math.max(nowTop - HOUR_HEIGHT * 2, 0),
    });
    // Intentionally scroll only on the first mount for a stable week-navigation feel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNowTop(((getHours(now) * 60 + getMinutes(now)) / 60) * HOUR_HEIGHT);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

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
    <div className="overflow-x-auto rounded-[28px] border border-line bg-canvas/50">
      <div className="flex min-w-[760px] border-b border-line bg-paper/60">
        <div className="w-12 shrink-0" />
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
        <div className="flex min-w-[760px] border-b border-line bg-paper/40">
          <div className="w-12 shrink-0 py-2 pr-2 text-right text-[10px] leading-none text-muted">весь день</div>
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

      <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
        <div className="relative flex min-w-[760px]" style={{ height: TOTAL_HEIGHT }}>
          <div className="w-12 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] leading-none text-muted"
                style={{ top: hour * HOUR_HEIGHT - 6 }}
              >
                {hour === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
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
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-line/50"
                    style={{ top: hour * HOUR_HEIGHT }}
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
                      top: getEventTop(event.startsAt),
                      height: getEventHeight(event.startsAt, event.endsAt),
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
