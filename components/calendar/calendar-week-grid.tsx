"use client";

import {
  addDays,
  format,
  getHours,
  getISOWeek,
  getISOWeekYear,
  getMinutes,
  isSameDay,
  parseISO,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  estimateCalendarEventTimePlanned,
  getCalendarEventStartDay,
  getCalendarImportBlockedReason,
  isCalendarEventImportable,
} from "@/components/calendar/calendar-import-helpers";
import { useAppStore } from "@/store/app-store";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventImportPayload,
  PlannerLinkTargetKind,
} from "@/lib/planner-types";
import { cn } from "@/lib/utils";

// BLOCK-START: CALENDAR_WEEK_GRID_MODULE
// Description: Interactive weekly calendar grid with event layout, details modal, and calendar-to-planner import flow.
// BLOCK-START: CALENDAR_WEEK_GRID_LAYOUT_HELPERS
// Description: Time-grid constants and geometry helpers for laying out weekly calendar events.
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

// BLOCK-END: CALENDAR_WEEK_GRID_LAYOUT_HELPERS

// BLOCK-START: CALENDAR_WEEK_GRID_IMPORT_HELPERS
// Description: Event grouping, planner import defaults, and recommendation hints used by the import modal.
const PROXIMITY_MS = 30 * 60 * 1000;
const DAY_OPTIONS = [
  { label: "Пн", value: 1 },
  { label: "Вт", value: 2 },
  { label: "Ср", value: 3 },
  { label: "Чт", value: 4 },
  { label: "Пт", value: 5 },
  { label: "Сб", value: 6 },
  { label: "Вс", value: 7 },
] as const;

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

function buildWeekInputValue(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function buildMonthInputValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseWeekInputValue(value: string): { week: number; year: number } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    week: Number(match[2]),
  };
}

function parseMonthInputValue(value: string): { month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function estimateTimePlanned(event: CalendarEvent): string {
  const estimate = estimateCalendarEventTimePlanned(event);
  return estimate ? String(estimate) : "";
}

function getInitialImportTarget(event: CalendarEvent): PlannerLinkTargetKind {
  return event.suggestedTargetType;
}

function buildTaskImportPayload(event: CalendarEvent): CalendarEventImportPayload & { targetType: "task" } {
  const start = parseISO(event.startsAt);
  return {
    isPriority: false,
    startDay: getCalendarEventStartDay(event),
    targetType: "task",
    timePlanned: estimateCalendarEventTimePlanned(event),
    title: event.title,
    week: getISOWeek(start),
    year: getISOWeekYear(start),
  };
}

function buildHabitImportPayload(event: CalendarEvent): CalendarEventImportPayload & { targetType: "habit" } {
  const start = parseISO(event.startsAt);
  return {
    targetType: "habit",
    title: event.title,
    year: start.getFullYear(),
    month: start.getMonth() + 1,
  };
}

function getSuggestionHint(event: CalendarEvent): string {
  if (event.suggestedTargetType === "habit") {
    return "Рекомендуем привычку, потому что событие выглядит повторяющимся.";
  }

  if (event.isAllDay) {
    return "Рекомендуем задачу на день, потому что событие помечено как весь день.";
  }

  return "Рекомендуем задачу как основной сценарий импорта события в план.";
}
// BLOCK-END: CALENDAR_WEEK_GRID_IMPORT_HELPERS

type CalendarWeekGridProps = {
  connections: CalendarConnection[];
  events: CalendarEvent[];
  isLoading: boolean;
  weekStart: Date;
};

type TaskImportState = {
  isPriority: boolean;
  startDay: number;
  timePlanned: string;
  title: string;
  weekValue: string;
};

type HabitImportState = {
  monthValue: string;
  title: string;
};

// BLOCK-START: CALENDAR_WEEK_GRID_COMPONENT
// Description: Renders the week grid, event details, and import dialog with linked-item navigation.
export function CalendarWeekGrid({
  connections,
  events,
  isLoading,
  weekStart,
}: CalendarWeekGridProps) {
  const router = useRouter();
  const dismissedImportIds = useAppStore((state) => state.dismissedImportIds);
  const dismissImportEvent = useAppStore((state) => state.dismissImportEvent);
  const undismissImportEvent = useAppStore((state) => state.undismissImportEvent);
  const importCalendarEventToPlanner = useAppStore((state) => state.importCalendarEventToPlanner);
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState<PlannerLinkTargetKind>("task");
  const [taskImport, setTaskImport] = useState<TaskImportState>({
    isPriority: false,
    startDay: 1,
    timePlanned: "",
    title: "",
    weekValue: buildWeekInputValue(getISOWeekYear(new Date()), getISOWeek(new Date())),
  });
  const [habitImport, setHabitImport] = useState<HabitImportState>({
    monthValue: buildMonthInputValue(new Date().getFullYear(), new Date().getMonth() + 1),
    title: "",
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
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

  useEffect(() => {
    if (!selectedEvent) {
      setIsImportDialogOpen(false);
      setImportError(null);
      setImportNotice(null);
      return;
    }

    const taskDefaults = buildTaskImportPayload(selectedEvent);
    const habitDefaults = buildHabitImportPayload(selectedEvent);
    setSelectedTargetType(getInitialImportTarget(selectedEvent));
    setTaskImport({
      isPriority: Boolean(taskDefaults.isPriority),
      startDay: taskDefaults.startDay ?? 1,
      timePlanned: taskDefaults.timePlanned ? String(taskDefaults.timePlanned) : "",
      title: taskDefaults.title ?? selectedEvent.title,
      weekValue: buildWeekInputValue(taskDefaults.year, taskDefaults.week ?? getISOWeek(parseISO(selectedEvent.startsAt))),
    });
    setHabitImport({
      monthValue: buildMonthInputValue(habitDefaults.year, habitDefaults.month ?? (parseISO(selectedEvent.startsAt).getMonth() + 1)),
      title: habitDefaults.title ?? selectedEvent.title,
    });
    setImportError(null);
    setImportNotice(null);
    setIsImportDialogOpen(false);
  }, [selectedEvent?.id]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = new Date();
  const hasAllDayEvents = days.some((day) =>
    events.some((event) => event.isAllDay && isSameDay(parseISO(event.startsAt), day)),
  );
  const selectedEventColor = selectedEvent
    ? (colorMap.get(selectedEvent.connectionId)?.color ?? FALLBACK_COLOR)
    : FALLBACK_COLOR;
  const importBlockedReason = selectedEvent ? getCalendarImportBlockedReason(selectedEvent) : null;
  const selectedEventIsDismissed = selectedEvent ? dismissedImportIds.includes(selectedEvent.id) : false;
  const showDismissToggle = selectedEvent
    ? !selectedEvent.plannerLink && !importBlockedReason
    : false;

  async function handleImportSubmit() {
    if (!selectedEvent) {
      return;
    }

    let payload: CalendarEventImportPayload | null = null;

    if (selectedTargetType === "task") {
      const parsedWeek = parseWeekInputValue(taskImport.weekValue);
      if (!parsedWeek) {
        setImportError("Проверь неделю для импорта задачи.");
        return;
      }

      payload = {
        isPriority: taskImport.isPriority,
        startDay: taskImport.startDay,
        targetType: "task",
        timePlanned: taskImport.timePlanned.trim() ? Number(taskImport.timePlanned) : null,
        title: taskImport.title,
        week: parsedWeek.week,
        year: parsedWeek.year,
      };
    } else {
      const parsedMonth = parseMonthInputValue(habitImport.monthValue);
      if (!parsedMonth) {
        setImportError("Проверь месяц для импорта привычки.");
        return;
      }

      payload = {
        targetType: "habit",
        title: habitImport.title,
        year: parsedMonth.year,
        month: parsedMonth.month,
      };
    }

    setIsImportSubmitting(true);
    setImportError(null);
    try {
      const result = await importCalendarEventToPlanner(selectedEvent.id, payload);
      setSelectedEvent((current) => (current ? { ...current, plannerLink: result.plannerLink } : current));
      setImportNotice(result.status === "created" ? "Добавлено в план." : "Это событие уже связано с планом.");
      setIsImportDialogOpen(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Не удалось добавить событие в план.");
    } finally {
      setIsImportSubmitting(false);
    }
  }

  function handleOpenLinkedItem() {
    if (!selectedEvent?.plannerLink) {
      return;
    }

    router.push(selectedEvent.plannerLink.openPath);
    setIsImportDialogOpen(false);
    setSelectedEvent(null);
  }

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
                          className={cn(
                            "w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition duration-150 cursor-pointer hover:brightness-95",
                            isCalendarEventImportable(event) &&
                              !dismissedImportIds.includes(event.id) &&
                              "importable-glow",
                          )}
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
                          className={cn(
                            "absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm transition duration-150 cursor-pointer hover:brightness-95",
                            isCalendarEventImportable(event) &&
                              !dismissedImportIds.includes(event.id) &&
                              "importable-glow",
                          )}
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

            {importNotice ? <div className="mt-4 text-sm font-medium text-accent">{importNotice}</div> : null}
            {importError && !isImportDialogOpen ? <div className="mt-4 text-sm text-danger">{importError}</div> : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {selectedEvent.plannerLink ? (
                <button
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  type="button"
                  onClick={handleOpenLinkedItem}
                >
                  Открыть в плане
                </button>
              ) : importBlockedReason ? (
                <div className="max-w-full text-right text-sm text-muted">{importBlockedReason}</div>
              ) : (
                <>
                  {showDismissToggle ? (
                    <button
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                        selectedEventIsDismissed
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-line text-muted hover:text-ink",
                      )}
                      type="button"
                      onClick={() => {
                        if (selectedEventIsDismissed) {
                          undismissImportEvent(selectedEvent.id);
                          return;
                        }

                        dismissImportEvent(selectedEvent.id);
                      }}
                    >
                      {selectedEventIsDismissed ? "Не переносить ✓" : "Не переносить"}
                    </button>
                  ) : null}
                  <button
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    type="button"
                    onClick={() => {
                      setImportError(null);
                      setIsImportDialogOpen(true);
                    }}
                  >
                    Добавить в план
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {selectedEvent && isImportDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm"
          onClick={() => setIsImportDialogOpen(false)}
        >
          <div
            aria-modal="true"
            className="paper-panel w-full max-w-md overflow-y-auto rounded-[32px] p-6"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold leading-snug text-ink">Добавить в план</div>
                <div className="mt-1 text-sm text-muted">{getSuggestionHint(selectedEvent)}</div>
              </div>
              <button
                className="shrink-0 rounded-full p-1 text-muted transition-colors hover:text-ink"
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["task", "habit"] as const).map((targetType) => (
                <button
                  key={targetType}
                  className={[
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                    selectedTargetType === targetType
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line bg-paper text-muted hover:text-ink",
                  ].join(" ")}
                  type="button"
                  onClick={() => setSelectedTargetType(targetType)}
                >
                  {targetType === "task" ? "Как задачу" : "Как привычку"}
                </button>
              ))}
            </div>

            {selectedTargetType === "task" ? (
              <div className="mt-4 space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Название</span>
                  <input
                    className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                    type="text"
                    value={taskImport.title}
                    onChange={(event) => setTaskImport((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Неделя</span>
                    <input
                      className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                      type="week"
                      value={taskImport.weekValue}
                      onChange={(event) => setTaskImport((current) => ({ ...current, weekValue: event.target.value }))}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">День недели</span>
                    <select
                      className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                      value={taskImport.startDay}
                      onChange={(event) =>
                        setTaskImport((current) => ({ ...current, startDay: Number(event.target.value) }))
                      }
                    >
                      {DAY_OPTIONS.map((dayOption) => (
                        <option key={dayOption.value} value={dayOption.value}>
                          {dayOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-ink">Ti</span>
                    <input
                      className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                      inputMode="numeric"
                      min={0}
                      type="number"
                      value={taskImport.timePlanned}
                      onChange={(event) => setTaskImport((current) => ({ ...current, timePlanned: event.target.value }))}
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2 text-sm text-ink">
                    <input
                      checked={taskImport.isPriority}
                      type="checkbox"
                      onChange={(event) =>
                        setTaskImport((current) => ({ ...current, isPriority: event.target.checked }))
                      }
                    />
                    <span>Приоритет</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Название</span>
                  <input
                    className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                    type="text"
                    value={habitImport.title}
                    onChange={(event) => setHabitImport((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">Месяц</span>
                  <input
                    className="field-base w-full px-3 py-2 text-sm text-ink outline-none"
                    type="month"
                    value={habitImport.monthValue}
                    onChange={(event) => setHabitImport((current) => ({ ...current, monthValue: event.target.value }))}
                  />
                </label>
              </div>
            )}

            {importError ? <div className="mt-4 text-sm text-danger">{importError}</div> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Отмена
              </button>
              <button
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isImportSubmitting}
                type="button"
                onClick={() => void handleImportSubmit()}
              >
                {isImportSubmitting ? "Добавляем..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
// BLOCK-END: CALENDAR_WEEK_GRID_COMPONENT
// BLOCK-END: CALENDAR_WEEK_GRID_MODULE
