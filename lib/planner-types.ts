export type MetricName = "health" | "productivity" | "anxiety";
export type TaskStatus = "planned" | "done" | "moved" | "failed";
export type TaskCalendarExportBucket = "default" | "work" | "personal" | "family";

export const TASK_CALENDAR_EXPORT_BUCKET_OPTIONS: Array<{
  label: string;
  value: TaskCalendarExportBucket;
}> = [
  { value: "default", label: "Общий" },
  { value: "work", label: "Работа" },
  { value: "personal", label: "Личное" },
  { value: "family", label: "Семья" },
];

export type DailyState = {
  day: number;
  health: number;
  productivity: number;
  anxiety: number;
};

export type DayChartStats = {
  habitsPct: number | null;
  taskDonePct: number | null;
  taskMovedPct: number | null;
};

export type Habit = {
  id: string;
  name: string;
  scheduleDays?: number[];
  linkedEventTime?: {
    startsAt: string;
    endsAt: string;
  } | null;
};

export type HabitLogMap = Record<string, string[]>;

export type CalendarProvider = "apple" | "google";
export type PlannerLinkTargetKind = "task" | "habit";

export type CalendarConnection = {
  id: string;
  provider: CalendarProvider;
  status: "active" | "error";
  externalAccountId: string;
  accountLabel: string | null;
  providerAccountLabel: string | null;
  color: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoogleCalendarOption = {
  id: string;
  summary: string;
  accessRole: string | null;
  primary: boolean;
  selected: boolean;
};

export type GoogleCalendarOptionsState = {
  connected: boolean;
  providerAccountLabel: string | null;
  options: GoogleCalendarOption[];
};

export type CalendarPlannerLink = {
  id: string;
  linkMode: "import_copy";
  openPath: string;
  targetId: string;
  targetKind: PlannerLinkTargetKind;
};

export type CalendarEvent = {
  id: string;
  connectionId: string;
  provider: CalendarProvider;
  accountLabel: string | null;
  externalEventId: string;
  externalCalendarId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  sourceTimezone: string | null;
  isAllDay: boolean;
  status: "confirmed" | "cancelled";
  plannerLink: CalendarPlannerLink | null;
  seriesLinked: boolean;
  suggestedTargetType: PlannerLinkTargetKind;
  recurrence?: string[];
  recurringEventId?: string;
};

export type CalendarRangeData = {
  dateFrom: string;
  dateTo: string;
  events: CalendarEvent[];
};

export type CalendarEventImportPayload = {
  isPriority?: boolean;
  month?: number;
  scheduleDays?: number[];
  startDay?: number;
  targetType: PlannerLinkTargetKind;
  timePlanned?: number | null;
  title?: string | null;
  week?: number;
  year: number;
};

export type CalendarEventImportResult = {
  plannerLink: CalendarPlannerLink;
  status: "created" | "existing";
};

export type CalendarTaskExportFeed = {
  bucket: TaskCalendarExportBucket;
  feedPath: string;
  taskCount: number;
};

export type CalendarBulkImportSummary = {
  errors: Array<{ eventId: string; message: string }>;
  failedCount: number;
  importedCount: number;
  requestedCount: number;
};

export type MonthData = {
  year: number;
  month: number;
  mainGoal: string;
  focusAreas: string[];
  newHabits: string[];
  letGo: string[];
  notes: string;
  dailyStates: DailyState[];
  habits: Habit[];
  habitLogs: HabitLogMap;
};

export type WeekTask = {
  id: string;
  title: string;
  ti: number;
  fa: number;
  isPriority: boolean;
  calendarExportEnabled: boolean;
  calendarExportBucket: TaskCalendarExportBucket | null;
  startDayKey: string;
  statusTrail: TaskStatus[];
  carriedFromTaskId?: string | null;
};

export type WeekReflection = {
  focus: string;
  reward: string;
  keyEvents: Record<string, string>;
  gratitudes: Record<string, string>;
};

export type WeekData = {
  year: number;
  week: number;
  startDate: string;
  tasks: WeekTask[];
  reflection: WeekReflection;
};
