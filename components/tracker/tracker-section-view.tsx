"use client";

import { useEffect, useMemo, useState } from "react";

import type { TrackerGoal, TrackerGoalStatus, TrackerSection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import {
  TRACKER_SECTION_COLORS,
  TRACKER_SECTION_ITEMS,
  TRACKER_STATUS_OPTIONS,
} from "./tracker-meta";

const SECTION_ORDER: TrackerSection[] = ["money", "health", "state", "communications", "relations"];

// Shared grid template — header + every row use the same columns
const COLS = "grid-cols-[28px_1fr_32px_36px] md:grid-cols-[28px_1fr_80px_80px_118px_32px_60px]";

function nextSortOrder(goals: TrackerGoal[]): number {
  return goals.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1;
}

function cycleStatus(current: TrackerGoalStatus): TrackerGoalStatus {
  const order: TrackerGoalStatus[] = [null, "done", "not_done", "done_with_delay"];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length] ?? null;
}

function SectionIcon({ section }: { section: TrackerSection }) {
  const item = TRACKER_SECTION_ITEMS.find((s) => s.id === section);
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
        TRACKER_SECTION_COLORS[section],
      )}
    >
      {item?.icon}
    </span>
  );
}

function StatusPill({
  status,
  onChange,
}: {
  status: TrackerGoalStatus;
  onChange: (next: TrackerGoalStatus) => void;
}) {
  const opt = TRACKER_STATUS_OPTIONS.find((o) => o.value === status) ?? TRACKER_STATUS_OPTIONS[3]!;
  return (
    <button
      className={cn("h-7 w-7 shrink-0 rounded-full border text-xs font-medium transition-colors", opt.className)}
      onClick={() => onChange(cycleStatus(status))}
      title={opt.icon}
      type="button"
    >
      {opt.icon}
    </button>
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

  useEffect(() => { setDraft(value); }, [value]);

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

  useEffect(() => { setDraft(value ?? ""); }, [value]);

  function commit() {
    setEditing(false);
    onSave(draft.trim() || null);
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

// Single goal row — shared by all levels; prefix slot carries icon or level label
function GoalRowInner({
  goal,
  sprintId,
  bold,
  prefix,
  isDragOver,
  dragHandlers,
}: {
  goal: TrackerGoal;
  sprintId: string;
  bold?: boolean;
  prefix: React.ReactNode;
  isDragOver?: boolean;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const patchTrackerGoal = useAppStore((s) => s.patchTrackerGoal);
  const patchTrackerGoalStatus = useAppStore((s) => s.patchTrackerGoalStatus);
  const deleteTrackerGoal = useAppStore((s) => s.deleteTrackerGoal);
  const createTrackerGoal = useAppStore((s) => s.createTrackerGoal);

  return (
    <div
      className={cn(
        "grid cursor-grab items-center gap-2 rounded-[14px] border px-3 py-2 active:cursor-grabbing",
        COLS,
        bold ? "border-line bg-paper" : "border-line/60 bg-paper/80",
        isDragOver && "border-accent/60 bg-accent/5",
      )}
      draggable
      {...dragHandlers}
    >
      {/* Prefix: section icon (level 1) or level label (level 2/3) */}
      <div className="flex items-center justify-center">{prefix}</div>

      {/* Description */}
      <div className="min-w-0">
        <InlineText
          bold={bold}
          onSave={(v) => void patchTrackerGoal(goal.id, { title: v })}
          placeholder="Описание"
          value={goal.title}
        />
      </div>

      {/* Цель 1.0 — hidden on mobile */}
      <div className="hidden md:block">
        <MetricInput
          onSave={(v) => void patchTrackerGoal(goal.id, { targetBaseline: v })}
          placeholder="Цель 1.0"
          value={goal.targetBaseline}
        />
      </div>

      {/* Цель 1.2 — hidden on mobile */}
      <div className="hidden md:block">
        <MetricInput
          onSave={(v) => void patchTrackerGoal(goal.id, { targetStretch: v })}
          placeholder="Цель 1.2"
          value={goal.targetStretch}
        />
      </div>

      {/* Дедлайн — hidden on mobile */}
      <div className="hidden md:block">
        <input
          className="w-full rounded-[10px] border border-line/60 bg-paper px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-accent"
          onChange={(e) => void patchTrackerGoal(goal.id, { deadlineDate: e.target.value || null })}
          type="date"
          value={goal.deadlineDate ?? ""}
        />
      </div>

      {/* Статус — cycling pill */}
      <StatusPill
        onChange={(next) => void patchTrackerGoalStatus(goal.id, next)}
        status={goal.status}
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {goal.level < 3 && (
          <button
            className="rounded-[8px] border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            onClick={() =>
              void createTrackerGoal(sprintId, {
                level: (goal.level + 1) as 2 | 3,
                parentId: goal.id,
                section: goal.section,
                sortOrder: nextSortOrder(goal.children),
                title: goal.level === 1 ? "Новая цель" : "Новая подцель",
              })
            }
            title="Добавить дочернюю"
            type="button"
          >
            +
          </button>
        )}
        <button
          className="rounded-[8px] border border-line px-1.5 py-1 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
          onClick={() => void deleteTrackerGoal(sprintId, goal.id)}
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Sortable list of child goals (depth 1 = level 2, depth 2 = level 3)
function ChildList({
  goals,
  sprintId,
  depth,
}: {
  goals: TrackerGoal[];
  sprintId: string;
  depth: number;
}) {
  const patchTrackerGoal = useAppStore((s) => s.patchTrackerGoal);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sorted = useMemo(() => [...goals].sort((a, b) => a.sortOrder - b.sortOrder), [goals]);

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const from = sorted.find((g) => g.id === draggingId);
    const to = sorted.find((g) => g.id === targetId);
    if (!from || !to) return;
    const fromOrder = from.sortOrder;
    await patchTrackerGoal(from.id, { sortOrder: to.sortOrder });
    await patchTrackerGoal(to.id, { sortOrder: fromOrder });
    setDraggingId(null);
    setDragOverId(null);
  }

  const levelLabel = depth === 1 ? "ЦЕЛЬ" : "ПОДЦЕЛЬ";
  const indentClass =
    depth === 1
      ? "ml-6 border-l border-line/40 pl-3"
      : "ml-10 border-l border-line/30 pl-3";

  return (
    <div className={cn("space-y-1", indentClass)}>
      {sorted.map((goal) => (
        <div key={goal.id} className="space-y-1">
          <GoalRowInner
            bold={false}
            dragHandlers={{
              onDragStart: () => setDraggingId(goal.id),
              onDragEnd: () => { setDraggingId(null); setDragOverId(null); },
              onDragOver: (e) => { e.preventDefault(); setDragOverId(goal.id); },
              onDragLeave: () => setDragOverId(null),
              onDrop: (e) => { e.preventDefault(); void handleDrop(goal.id); },
            }}
            goal={goal}
            isDragOver={dragOverId === goal.id}
            prefix={
              <span className="text-center text-[9px] uppercase leading-tight tracking-[0.12em] text-muted/70">
                {levelLabel}
              </span>
            }
            sprintId={sprintId}
          />
          {goal.children.length > 0 && (
            <ChildList depth={depth + 1} goals={goal.children} sprintId={sprintId} />
          )}
        </div>
      ))}
    </div>
  );
}

// Meta-goal card: level-1 row + all descendants wrapped in a rounded card
function MetaGoalCard({
  goal,
  sprintId,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  goal: TrackerGoal;
  sprintId: string;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-[20px] border p-2 transition-colors",
        isDragOver ? "border-accent/60 bg-accent/5" : "border-line bg-paper/40",
      )}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <GoalRowInner
        bold
        dragHandlers={{ onDragStart, onDragEnd }}
        goal={goal}
        prefix={<SectionIcon section={goal.section} />}
        sprintId={sprintId}
      />
      {goal.children.length > 0 && (
        <ChildList depth={1} goals={goal.children} sprintId={sprintId} />
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
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:opacity-90",
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
  const patchTrackerGoal = useAppStore((state) => state.patchTrackerGoal);
  const goals = useAppStore((state) => state.trackerGoalsBySprint[sprintId] ?? []);
  const goalsStatus = useAppStore((state) => state.trackerGoalsStatus[sprintId] ?? "idle");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  async function handleRootDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const from = sortedRoots.find((g) => g.id === draggingId);
    const to = sortedRoots.find((g) => g.id === targetId);
    // Only reorder within the same section
    if (!from || !to || from.section !== to.section) return;
    const fromOrder = from.sortOrder;
    await patchTrackerGoal(from.id, { sortOrder: to.sortOrder });
    await patchTrackerGoal(to.id, { sortOrder: fromOrder });
    setDraggingId(null);
    setDragOverId(null);
  }

  if (goalsStatus === "loading" && goals.length === 0) {
    return <div className="h-[480px] animate-pulse rounded-[24px] border border-line bg-paper/60" />;
  }

  return (
    <div className="space-y-4">
      {/* Column headers — desktop only */}
      <div className={cn("hidden items-center gap-2 px-3 md:grid", COLS)}>
        <div />
        <div className="text-xs uppercase tracking-[0.14em] text-muted">Описание</div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted">Цель 1.0</div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted">Цель 1.2</div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted">Дедлайн</div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted">Ст.</div>
        <div />
      </div>

      {sortedRoots.length === 0 && (
        <div className="rounded-[20px] border border-line bg-paper/60 p-5 text-sm text-muted">
          Мета-целей пока нет. Добавь первую ниже.
        </div>
      )}

      <div className="space-y-3">
        {sortedRoots.map((goal) => (
          <MetaGoalCard
            key={goal.id}
            goal={goal}
            isDragOver={dragOverId === goal.id}
            sprintId={sprintId}
            onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
            onDragLeave={() => setDragOverId(null)}
            onDragOver={(e) => { e.preventDefault(); setDragOverId(goal.id); }}
            onDragStart={() => setDraggingId(goal.id)}
            onDrop={(e) => { e.preventDefault(); void handleRootDrop(goal.id); }}
          />
        ))}
      </div>

      <AddMetaGoalPicker allGoals={goals} sprintId={sprintId} />
    </div>
  );
}

/** @deprecated use TrackerGoalsGrid */
export function TrackerSectionView({ sprintId }: { section: TrackerSection; sprintId: string }) {
  return <TrackerGoalsGrid sprintId={sprintId} />;
}
