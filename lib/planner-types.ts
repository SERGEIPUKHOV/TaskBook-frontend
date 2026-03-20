export type MetricName = "health" | "productivity" | "anxiety";
export type TaskStatus = "planned" | "done" | "moved" | "failed";

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
};

export type HabitLogMap = Record<string, string[]>;

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
