"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { TrackerGoal, TrackerGoalStatus, TrackerSection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import {
  TRACKER_SECTION_COLORS,
  TRACKER_SECTION_ITEMS,
  TRACKER_STATUS_OPTIONS,
} from "./tracker-meta";

const SECTION_ORDER: TrackerSection[] = ["money", "health", "state", "communications", "relations"];

// Shared desktop grid template — mobile uses the same row semantics inside a horizontal scroll container.
const DESKTOP_COLS = "md:grid-cols-[28px_minmax(0,1fr)_80px_80px_118px_32px_76px]";

type PendingDeleteState = {
  countdown: number;
  goalId: string;
  goalTitle: string;
};

function syncTextareaHeight(element: HTMLTextAreaElement | null, minHeight = 40) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, minHeight)}px`;
}

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
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-sm font-medium transition-colors",
        opt.className,
      )}
      onClick={() => onChange(cycleStatus(status))}
      title={opt.icon}
      type="button"
    >
      {opt.icon}
    </button>
  );
}

function DeleteDialog({
  onCancel,
  onConfirm,
  state,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: PendingDeleteState;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-md rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-danger">Удаление цели</div>
        <h3 className="mt-3 break-all text-2xl font-semibold text-ink">{state.goalTitle || "Без названия"}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">
          Это действие нельзя отменить. Кнопка подтверждения станет активной после обратного отсчёта.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-[20px] border border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button
            className={cn(
              "rounded-[20px] px-4 py-3 text-sm font-medium transition-colors",
              state.countdown > 0
                ? "cursor-not-allowed border border-line bg-canvas text-muted"
                : "border border-danger bg-danger text-white",
            )}
            disabled={state.countdown > 0}
            onClick={onConfirm}
            type="button"
          >
            {state.countdown > 0 ? `Удалить (${state.countdown})` : "Удалить"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing) {
      syncTextareaHeight(textareaRef.current, 40);
    }
  }, [draft, editing]);

  function commit() {
    setEditing(false);
    const normalized = draft.trim();
    if (normalized !== value) onSave(normalized || value);
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        ref={textareaRef}
        className="min-h-[40px] w-full min-w-0 resize-none overflow-hidden rounded-[14px] border border-accent bg-paper px-3 py-2 text-sm leading-5 text-ink shadow-none outline-none focus:border-accent focus:shadow-none focus-visible:outline-none"
        onBlur={commit}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          syncTextareaHeight(e.currentTarget, 40);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        rows={1}
        value={draft}
      />
    );
  }

  return (
    <button
      className={cn(
        "flex min-h-[40px] w-full min-w-0 items-center py-0 text-left text-sm leading-5",
        bold ? "font-semibold text-ink" : "text-ink",
        !value && "text-muted/50",
      )}
      onClick={() => setEditing(true)}
      type="button"
    >
      <span className="block w-full whitespace-pre-wrap break-words">{value || placeholder}</span>
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
        className="field-base flex h-10 w-full items-center rounded-xl px-3 py-2 text-sm leading-5 text-ink outline-none"
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
        "field-base flex h-10 w-full items-center truncate px-3 py-2 text-left text-sm leading-5 transition-colors hover:border-line",
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
  onRequestDelete,
}: {
  goal: TrackerGoal;
  sprintId: string;
  bold?: boolean;
  prefix: React.ReactNode;
  isDragOver?: boolean;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
  onRequestDelete: (goal: TrackerGoal) => void;
}) {
  const patchTrackerGoal = useAppStore((s) => s.patchTrackerGoal);
  const patchTrackerGoalStatus = useAppStore((s) => s.patchTrackerGoalStatus);
  const createTrackerGoal = useAppStore((s) => s.createTrackerGoal);
  const [dateDraft, setDateDraft] = useState(goal.deadlineDate ?? "");
  const hasPrefix = prefix !== null && prefix !== undefined;

  useEffect(() => {
    setDateDraft(goal.deadlineDate ?? "");
  }, [goal.deadlineDate]);

  function commitDate(value: string) {
    const normalized = value || null;
    if (normalized === (goal.deadlineDate ?? null)) return;
    void patchTrackerGoal(goal.id, { deadlineDate: normalized });
  }
  const mobileCols = hasPrefix
    ? "grid-cols-[28px_minmax(180px,1fr)_92px_92px_120px_32px_68px]"
    : "grid-cols-[minmax(180px,1fr)_92px_92px_120px_32px_68px]";

  return (
    <div
      className={cn(
        "cursor-grab rounded-[14px] border px-3 py-2 active:cursor-grabbing",
        bold ? "border-line bg-paper" : "border-line/60 bg-paper/80",
        isDragOver && "border-accent/60 bg-accent/5",
      )}
      draggable
      {...dragHandlers}
    >
      <div className="hide-scrollbar overflow-x-auto md:hidden">
        <div className={cn("grid min-w-[560px] items-center gap-1.5", mobileCols)}>
          {hasPrefix ? <div className="flex items-center justify-center">{prefix}</div> : null}

          <div className="min-w-0">
            <InlineText
              bold={bold}
              onSave={(v) => void patchTrackerGoal(goal.id, { title: v })}
              placeholder={goal.level === 1 ? "Мета-цель" : goal.level === 2 ? "Цель" : "Подцель"}
              value={goal.title}
            />
          </div>

          <div className="flex items-center">
            <MetricInput
              onSave={(v) => void patchTrackerGoal(goal.id, { targetBaseline: v })}
              placeholder="Цель 1.0"
              value={goal.targetBaseline}
            />
          </div>

          <div className="flex items-center">
            <MetricInput
              onSave={(v) => void patchTrackerGoal(goal.id, { targetStretch: v })}
              placeholder="Цель 1.2"
              value={goal.targetStretch}
            />
          </div>

          <div className="flex items-center">
            <input
              className="field-base h-10 w-full rounded-xl px-2.5 py-2 text-sm leading-5 text-ink outline-none [color-scheme:light] dark:[color-scheme:dark]"
              onBlur={(e) => commitDate(e.target.value)}
              onChange={(e) => setDateDraft(e.target.value)}
              type="date"
              value={dateDraft}
            />
          </div>

          <div className="flex items-center justify-center">
            <StatusPill
              onChange={(next) => void patchTrackerGoalStatus(goal.id, next)}
              status={goal.status}
            />
          </div>

          <div className="flex items-center justify-end gap-1">
            {goal.level < 3 && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-line bg-paper text-sm text-muted transition-colors hover:border-accent hover:bg-canvas hover:text-accent"
                onClick={() =>
                  void createTrackerGoal(sprintId, {
                    level: (goal.level + 1) as 2 | 3,
                    parentId: goal.id,
                    section: goal.section,
                    sortOrder: nextSortOrder(goal.children),
                    title: "Новая цель",
                  })
                }
                title={goal.level === 1 ? "Добавить цель" : "Добавить подцель"}
                type="button"
              >
                +
              </button>
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              onClick={() => onRequestDelete(goal)}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <div className={cn("hidden items-start gap-2 md:grid", DESKTOP_COLS)}>
        {hasPrefix ? <div className="flex items-center justify-center">{prefix}</div> : null}

        <div className={cn("min-w-0", !hasPrefix && "md:col-span-2")}>
          <InlineText
            bold={bold}
            onSave={(v) => void patchTrackerGoal(goal.id, { title: v })}
            placeholder="Описание"
            value={goal.title}
          />
        </div>

        <div>
          <MetricInput
            onSave={(v) => void patchTrackerGoal(goal.id, { targetBaseline: v })}
            placeholder="Цель 1.0"
            value={goal.targetBaseline}
          />
        </div>

        <div>
          <MetricInput
            onSave={(v) => void patchTrackerGoal(goal.id, { targetStretch: v })}
            placeholder="Цель 1.2"
            value={goal.targetStretch}
          />
        </div>

        <div>
          <input
            className="field-base w-full rounded-xl px-2 py-1 text-sm text-ink outline-none [color-scheme:light] dark:[color-scheme:dark]"
            onBlur={(e) => commitDate(e.target.value)}
            onChange={(e) => setDateDraft(e.target.value)}
            type="date"
            value={dateDraft}
          />
        </div>

        <StatusPill
          onChange={(next) => void patchTrackerGoalStatus(goal.id, next)}
          status={goal.status}
        />

        <div className="flex shrink-0 items-center justify-end gap-1">
          {goal.level < 3 && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-line bg-paper text-sm text-muted transition-colors hover:border-accent hover:bg-canvas hover:text-accent"
              onClick={() =>
                void createTrackerGoal(sprintId, {
                  level: (goal.level + 1) as 2 | 3,
                  parentId: goal.id,
                  section: goal.section,
                  sortOrder: nextSortOrder(goal.children),
                  title: "Новая цель",
                })
              }
              title={goal.level === 1 ? "Добавить цель" : "Добавить подцель"}
              type="button"
            >
              +
            </button>
          )}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            onClick={() => onRequestDelete(goal)}
            type="button"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Sortable list of child goals (depth 1 = level 2, depth 2 = level 3)
function ChildList({
  goals,
  sprintId,
  depth,
  onRequestDelete,
}: {
  goals: TrackerGoal[];
  sprintId: string;
  depth: number;
  onRequestDelete: (goal: TrackerGoal) => void;
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

  const indentClass =
    depth === 1
      ? "ml-4 border-l border-line/40 pl-3 md:ml-6"
      : "ml-6 border-l border-line/30 pl-3 md:ml-10";

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
            onRequestDelete={onRequestDelete}
            prefix={null}
            sprintId={sprintId}
          />
          {goal.children.length > 0 && (
            <ChildList depth={depth + 1} goals={goal.children} onRequestDelete={onRequestDelete} sprintId={sprintId} />
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
  onRequestDelete,
}: {
  goal: TrackerGoal;
  sprintId: string;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRequestDelete: (goal: TrackerGoal) => void;
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
        onRequestDelete={onRequestDelete}
        prefix={<SectionIcon section={goal.section} />}
        sprintId={sprintId}
      />
      {goal.children.length > 0 && (
        <ChildList depth={1} goals={goal.children} onRequestDelete={onRequestDelete} sprintId={sprintId} />
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
      title: "Новая цель",
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
  const deleteTrackerGoal = useAppStore((state) => state.deleteTrackerGoal);
  const goals = useAppStore((state) => state.trackerGoalsBySprint[sprintId] ?? []);
  const goalsStatus = useAppStore((state) => state.trackerGoalsStatus[sprintId] ?? "idle");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  useEffect(() => {
    void fetchTrackerGoals(sprintId);
  }, [fetchTrackerGoals, sprintId]);

  useEffect(() => {
    if (!pendingDelete) {
      return;
    }

    if (pendingDelete.countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingDelete((current) => (current ? { ...current, countdown: current.countdown - 1 } : null));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pendingDelete]);

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

  function handleRequestDelete(goal: TrackerGoal) {
    setPendingDelete({
      countdown: 5,
      goalId: goal.id,
      goalTitle: goal.title,
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return;
    }

    await deleteTrackerGoal(sprintId, pendingDelete.goalId);
    setPendingDelete(null);
  }

  if (goalsStatus === "loading" && goals.length === 0) {
    return <div className="h-[480px] animate-pulse rounded-[24px] border border-line bg-paper/60" />;
  }

  return (
    <div className="space-y-4">
      {/* Column headers — desktop only */}
      <div className={cn("hidden items-center gap-2 px-3 md:grid", DESKTOP_COLS)}>
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
            onRequestDelete={handleRequestDelete}
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

      {pendingDelete && (
        <DeleteDialog
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleConfirmDelete()}
          state={pendingDelete}
        />
      )}
    </div>
  );
}

/** @deprecated use TrackerGoalsGrid */
export function TrackerSectionView({ sprintId }: { section: TrackerSection; sprintId: string }) {
  return <TrackerGoalsGrid sprintId={sprintId} />;
}
