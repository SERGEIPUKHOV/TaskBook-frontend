"use client";

import { useEffect, useMemo, useState } from "react";

import type { TrackerGoal, TrackerSection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import {
  TRACKER_SECTION_COLORS,
  TRACKER_SECTION_ITEMS,
  TRACKER_SECTION_LABELS,
  TRACKER_STATUS_OPTIONS,
} from "./tracker-meta";

const SECTION_ORDER: TrackerSection[] = ["money", "health", "state", "communications", "relations"];

function nextSortOrder(goals: TrackerGoal[]): number {
  return goals.reduce((maxValue, goal) => Math.max(maxValue, goal.sortOrder), -1) + 1;
}

function SectionBadge({ section }: { section: TrackerSection }) {
  const item = TRACKER_SECTION_ITEMS.find((s) => s.id === section);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        TRACKER_SECTION_COLORS[section],
      )}
    >
      {item?.icon} {TRACKER_SECTION_LABELS[section]}
    </span>
  );
}

function InlineText({
  value,
  placeholder,
  onSave,
  bold,
}: {
  value: string;
  placeholder: string;
  onSave: (next: string) => void;
  bold?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    setEditing(false);
    const normalized = draft.trim();
    if (normalized !== value) onSave(normalized || value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full min-w-0 rounded-[10px] border border-accent bg-paper px-2 py-1 text-sm text-ink outline-none"
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        value={draft}
      />
    );
  }

  return (
    <button
      className={cn(
        "w-full min-w-0 truncate text-left text-sm",
        bold ? "font-semibold text-ink" : "text-ink",
        !value && "text-muted/50",
      )}
      onClick={() => setEditing(true)}
      type="button"
    >
      {value || placeholder}
    </button>
  );
}

function MetricInput({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  function commit() {
    setEditing(false);
    const normalized = draft.trim();
    onSave(normalized || null);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full rounded-[10px] border border-accent bg-paper px-2 py-1 text-sm text-ink outline-none"
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
        }}
        value={draft}
      />
    );
  }

  return (
    <button
      className={cn(
        "w-full truncate rounded-[10px] border px-2 py-1 text-left text-sm transition-colors hover:border-line",
        value ? "border-line/60 text-ink" : "border-dashed border-line/40 text-muted/40",
      )}
      onClick={() => setEditing(true)}
      type="button"
    >
      {value ?? placeholder}
    </button>
  );
}

function GoalRow({
  goal,
  siblings,
  sprintId,
  depth,
}: {
  goal: TrackerGoal;
  siblings: TrackerGoal[];
  sprintId: string;
  depth: number;
}) {
  const createTrackerGoal = useAppStore((state) => state.createTrackerGoal);
  const patchTrackerGoal = useAppStore((state) => state.patchTrackerGoal);
  const patchTrackerGoalStatus = useAppStore((state) => state.patchTrackerGoalStatus);
  const deleteTrackerGoal = useAppStore((state) => state.deleteTrackerGoal);

  async function handleAddChild() {
    const childLevel = (goal.level < 3 ? goal.level + 1 : 3) as 2 | 3;
    await createTrackerGoal(sprintId, {
      level: childLevel,
      parentId: goal.id,
      section: goal.section,
      sortOrder: nextSortOrder(goal.children),
      title: childLevel === 2 ? "Новая цель" : "Новая подцель",
    });
  }

  async function move(delta: -1 | 1) {
    const index = siblings.findIndex((item) => item.id === goal.id);
    const target = siblings[index + delta];
    if (!target) return;
    await patchTrackerGoal(goal.id, { sortOrder: target.sortOrder });
    await patchTrackerGoal(target.id, { sortOrder: goal.sortOrder });
  }

  const levelLabel = goal.level === 1 ? "МЕТА" : goal.level === 2 ? "ЦЕЛЬ" : "ПОДЦЕЛЬ";

  return (
    <div className={cn("space-y-1", depth > 0 && "border-l border-line/60 pl-3")}>
      {/* Row */}
      <div className="flex items-center gap-2 rounded-[16px] border border-line bg-paper/80 px-3 py-2.5">
        {/* Level label (desktop) / section badge (level 1) */}
        <div className="hidden w-14 shrink-0 sm:block">
          {goal.level === 1 ? (
            <SectionBadge section={goal.section} />
          ) : (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{levelLabel}</span>
          )}
        </div>

        {/* Description — flex grow */}
        <div className="min-w-0 flex-1">
          <InlineText
            bold={goal.level === 1}
            onSave={(v) => void patchTrackerGoal(goal.id, { title: v })}
            placeholder="Описание цели"
            value={goal.title}
          />
        </div>

        {/* Цель 1.0 */}
        <div className="hidden w-24 shrink-0 md:block">
          <MetricInput
            onSave={(v) => void patchTrackerGoal(goal.id, { targetBaseline: v })}
            placeholder="Цель 1.0"
            value={goal.targetBaseline}
          />
        </div>

        {/* Цель 1.2 */}
        <div className="hidden w-24 shrink-0 lg:block">
          <MetricInput
            onSave={(v) => void patchTrackerGoal(goal.id, { targetStretch: v })}
            placeholder="Цель 1.2"
            value={goal.targetStretch}
          />
        </div>

        {/* Дедлайн */}
        <div className="hidden w-32 shrink-0 md:block">
          <input
            className="w-full rounded-[10px] border border-line/60 bg-paper px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-accent"
            onChange={(e) => void patchTrackerGoal(goal.id, { deadlineDate: e.target.value || null })}
            type="date"
            value={goal.deadlineDate ?? ""}
          />
        </div>

        {/* Статус */}
        <div className="flex shrink-0 items-center gap-1">
          {TRACKER_STATUS_OPTIONS.map((option) => {
            const isActive = option.value === goal.status;
            return (
              <button
                key={`${goal.id}-${option.icon}`}
                className={cn(
                  "h-7 w-7 rounded-full border text-xs font-medium transition-colors",
                  option.className,
                  !isActive && "opacity-40 hover:opacity-80",
                )}
                onClick={() => void patchTrackerGoalStatus(goal.id, option.value)}
                title={option.icon}
                type="button"
              >
                {option.icon}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {goal.level < 3 && (
            <button
              className="rounded-[10px] border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={() => void handleAddChild()}
              title={goal.level === 1 ? "Добавить цель" : "Добавить подцель"}
              type="button"
            >
              +
            </button>
          )}
          <button className="rounded-[10px] border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:text-ink" onClick={() => void move(-1)} type="button">↑</button>
          <button className="rounded-[10px] border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:text-ink" onClick={() => void move(1)} type="button">↓</button>
          <button
            className="rounded-[10px] border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
            onClick={() => void deleteTrackerGoal(sprintId, goal.id)}
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mobile metrics row */}
      <div className="flex gap-2 px-3 md:hidden">
        <MetricInput
          onSave={(v) => void patchTrackerGoal(goal.id, { targetBaseline: v })}
          placeholder="Цель 1.0"
          value={goal.targetBaseline}
        />
        <MetricInput
          onSave={(v) => void patchTrackerGoal(goal.id, { targetStretch: v })}
          placeholder="Цель 1.2"
          value={goal.targetStretch}
        />
        <input
          className="w-32 shrink-0 rounded-[10px] border border-line/60 bg-paper px-2 py-1 text-sm text-ink outline-none"
          onChange={(e) => void patchTrackerGoal(goal.id, { deadlineDate: e.target.value || null })}
          type="date"
          value={goal.deadlineDate ?? ""}
        />
      </div>

      {/* Children */}
      {goal.children.length > 0 && (
        <div className="space-y-1 pt-1">
          {goal.children.map((child) => (
            <GoalRow key={child.id} depth={depth + 1} goal={child} siblings={goal.children} sprintId={sprintId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddMetaGoalPicker({ sprintId, allGoals }: { sprintId: string; allGoals: TrackerGoal[] }) {
  const createTrackerGoal = useAppStore((state) => state.createTrackerGoal);
  const [open, setOpen] = useState(false);

  async function add(section: TrackerSection) {
    const sectionRoots = allGoals.filter((g) => g.section === section);
    await createTrackerGoal(sprintId, {
      level: 1,
      section,
      sortOrder: nextSortOrder(sectionRoots),
      title: "Новая мета-цель",
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        className="rounded-[16px] border border-dashed border-line px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        + Добавить мета-цель
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-line bg-paper p-3">
      <span className="text-xs text-muted">Секция:</span>
      {TRACKER_SECTION_ITEMS.map((section) => (
        <button
          key={section.id}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:opacity-90",
            TRACKER_SECTION_COLORS[section.id],
          )}
          onClick={() => void add(section.id)}
          type="button"
        >
          {section.icon} {section.label}
        </button>
      ))}
      <button
        className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink"
        onClick={() => setOpen(false)}
        type="button"
      >
        Отмена
      </button>
    </div>
  );
}

export function TrackerGoalsGrid({ sprintId }: { sprintId: string }) {
  const fetchTrackerGoals = useAppStore((state) => state.fetchTrackerGoals);
  const goals = useAppStore((state) => state.trackerGoalsBySprint[sprintId] ?? []);
  const goalsStatus = useAppStore((state) => state.trackerGoalsStatus[sprintId] ?? "idle");

  useEffect(() => {
    void fetchTrackerGoals(sprintId);
  }, [fetchTrackerGoals, sprintId]);

  const sortedRoots = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const sectionDiff = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section);
        if (sectionDiff !== 0) return sectionDiff;
        return a.sortOrder - b.sortOrder;
      }),
    [goals],
  );

  if (goalsStatus === "loading" && goals.length === 0) {
    return <div className="h-[480px] animate-pulse rounded-[24px] border border-line bg-paper/60" />;
  }

  return (
    <div className="space-y-4">
      {/* Column headers (desktop) */}
      <div className="hidden items-center gap-2 px-3 md:flex">
        <div className="w-14 shrink-0" />
        <div className="flex-1 text-xs uppercase tracking-[0.14em] text-muted">Описание</div>
        <div className="w-24 shrink-0 text-xs uppercase tracking-[0.14em] text-muted">Цель 1.0</div>
        <div className="hidden w-24 shrink-0 text-xs uppercase tracking-[0.14em] text-muted lg:block">Цель 1.2</div>
        <div className="w-32 shrink-0 text-xs uppercase tracking-[0.14em] text-muted">Дедлайн</div>
        <div className="w-28 shrink-0 text-xs uppercase tracking-[0.14em] text-muted">Статус</div>
        <div className="w-20 shrink-0" />
      </div>

      {sortedRoots.length === 0 && (
        <div className="rounded-[20px] border border-line bg-paper/60 p-5 text-sm text-muted">
          Мета-целей пока нет. Добавь первую ниже.
        </div>
      )}

      <div className="space-y-2">
        {sortedRoots.map((goal) => (
          <GoalRow key={goal.id} depth={0} goal={goal} siblings={sortedRoots} sprintId={sprintId} />
        ))}
      </div>

      <AddMetaGoalPicker sprintId={sprintId} allGoals={goals} />
    </div>
  );
}

/** @deprecated use TrackerGoalsGrid */
export function TrackerSectionView({ sprintId }: { section: TrackerSection; sprintId: string }) {
  return <TrackerGoalsGrid sprintId={sprintId} />;
}
