import type { TrackerGoalStatus, TrackerSection } from "@/lib/planner-types";

export const TRACKER_SECTION_ITEMS: Array<{ id: TrackerSection; icon: string; label: string }> = [
  { id: "money", icon: "$", label: "Деньги" },
  { id: "health", icon: "H", label: "Здоровье" },
  { id: "state", icon: "S", label: "Состояние" },
  { id: "communications", icon: "C", label: "Коммуникации" },
  { id: "relations", icon: "R", label: "Отношения" },
];

export const TRACKER_SECTION_LABELS: Record<TrackerSection, string> = Object.fromEntries(
  TRACKER_SECTION_ITEMS.map((item) => [item.id, item.label]),
) as Record<TrackerSection, string>;

export const TRACKER_SECTION_COLORS: Record<TrackerSection, string> = {
  money: "border-emerald-200 bg-emerald-50 text-emerald-700",
  health: "border-rose-200 bg-rose-50 text-rose-700",
  state: "border-violet-200 bg-violet-50 text-violet-700",
  communications: "border-sky-200 bg-sky-50 text-sky-700",
  relations: "border-amber-200 bg-amber-50 text-amber-700",
};

export const TRACKER_STATUS_OPTIONS: Array<{ className: string; icon: string; value: TrackerGoalStatus }> = [
  { value: "done", icon: "✓", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "not_done", icon: "✕", className: "border-rose-300 bg-rose-50 text-rose-700" },
  { value: "done_with_delay", icon: "~", className: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: null, icon: "•", className: "border-line bg-paper text-muted" },
];

export function isTrackerSection(value: string | null | undefined): value is TrackerSection {
  return TRACKER_SECTION_ITEMS.some((item) => item.id === value);
}
