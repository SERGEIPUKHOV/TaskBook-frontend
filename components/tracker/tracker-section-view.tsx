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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        TRACKER_SECTION_COLORS[section],
      )}
    >
      <span>{item?.icon}</span>
      {TRACKER_SECTION_LABELS[section]}
    </span>
  );
}

function GoalNode({
  goal,
  siblings,
  sprintId,
}: {
  goal: TrackerGoal;
  siblings: TrackerGoal[];
  sprintId: string;
}) {
  const createTrackerGoal = useAppStore((state) => state.createTrackerGoal);
  const patchTrackerGoal = useAppStore((state) => state.patchTrackerGoal);
  const patchTrackerGoalStatus = useAppStore((state) => state.patchTrackerGoalStatus);
  const deleteTrackerGoal = useAppStore((state) => state.deleteTrackerGoal);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(goal.title);
  const [draftHypothesis, setDraftHypothesis] = useState(goal.hypothesis ?? "");

  useEffect(() => {
    setDraftTitle(goal.title);
  }, [goal.title]);

  useEffect(() => {
    setDraftHypothesis(goal.hypothesis ?? "");
  }, [goal.hypothesis]);

  async function saveTitle() {
    const normalized = draftTitle.trim();
    setIsEditingTitle(false);
    if (!normalized || normalized === goal.title) {
      setDraftTitle(goal.title);
      return;
    }
    await patchTrackerGoal(goal.id, { title: normalized });
  }

  async function saveHypothesis() {
    const normalized = draftHypothesis.trim();
    if ((goal.hypothesis ?? "") === normalized) return;
    await patchTrackerGoal(goal.id, { hypothesis: normalized || null });
  }

  async function handleAddChild() {
    const childLevel = goal.level === 1 ? 2 : 3;
    await createTrackerGoal(sprintId, {
      deadlineDate: childLevel === 3 ? null : undefined,
      hypothesis: childLevel === 2 ? "" : undefined,
      level: childLevel as 2 | 3,
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

  return (
    <div className="space-y-3 rounded-[24px] border border-line bg-paper/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {/* Level header */}
          <div className="flex flex-wrap items-center gap-2">
            {goal.level === 1 ? (
              <SectionBadge section={goal.section} />
            ) : (
              <span className="text-xs uppercase tracking-[0.14em] text-muted">
                {goal.level === 2 ? "Цель" : "Подцель"}
                {goal.level === 3 && goal.deadlineDate ? ` · ${goal.deadlineDate}` : ""}
              </span>
            )}
          </div>

          {/* Title */}
          {isEditingTitle ? (
            <textarea
              autoFocus
              className="mt-2 w-full rounded-[16px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink outline-none transition-colors focus:border-accent"
              onBlur={() => void saveTitle()}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void saveTitle();
                }
              }}
              rows={2}
              value={draftTitle}
            />
          ) : (
            <button
              className={cn(
                "mt-2 text-left font-semibold text-ink",
                goal.level === 1 ? "text-base" : "text-sm",
              )}
              onClick={() => setIsEditingTitle(true)}
              type="button"
            >
              {goal.title || "Без названия"}
            </button>
          )}

          {/* Hypothesis for level 2 */}
          {goal.level === 2 ? (
            <textarea
              className="mt-3 min-h-[72px] w-full rounded-[18px] border border-line bg-canvas/60 px-4 py-3 text-sm leading-6 text-ink outline-none transition-colors focus:border-accent"
              onBlur={() => void saveHypothesis()}
              onChange={(event) => setDraftHypothesis(event.target.value)}
              placeholder="Гипотеза достижения"
              rows={2}
              value={draftHypothesis}
            />
          ) : null}

          {/* Deadline + status for level 3 */}
          {goal.level === 3 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className="h-9 rounded-[14px] border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
                onChange={(event) => void patchTrackerGoal(goal.id, { deadlineDate: event.target.value || null })}
                type="date"
                value={goal.deadlineDate ?? ""}
              />
              {TRACKER_STATUS_OPTIONS.map((option) => {
                const isActive = option.value === goal.status;
                return (
                  <button
                    key={`${goal.id}-${option.icon}`}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      option.className,
                      !isActive && "opacity-60 hover:opacity-100",
                    )}
                    onClick={() => void patchTrackerGoalStatus(goal.id, option.value)}
                    type="button"
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {goal.level < 3 ? (
            <button
              className="rounded-[14px] border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={() => void handleAddChild()}
              type="button"
            >
              {goal.level === 1 ? "+ Цель" : "+ Подцель"}
            </button>
          ) : null}
          <button
            className="rounded-[14px] border border-line bg-paper px-2.5 py-2 text-xs text-muted transition-colors hover:text-ink"
            onClick={() => void move(-1)}
            type="button"
          >↑</button>
          <button
            className="rounded-[14px] border border-line bg-paper px-2.5 py-2 text-xs text-muted transition-colors hover:text-ink"
            onClick={() => void move(1)}
            type="button"
          >↓</button>
          <button
            className="rounded-[14px] border border-line bg-paper px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
            onClick={() => void deleteTrackerGoal(sprintId, goal.id)}
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Children */}
      {goal.children.length > 0 ? (
        <div className="space-y-3 border-l border-line/70 pl-4">
          {goal.children.map((child) => (
            <GoalNode key={child.id} goal={child} siblings={goal.children} sprintId={sprintId} />
          ))}
        </div>
      ) : null}
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
        className="rounded-[20px] border border-dashed border-line bg-paper px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        + Добавить мета-цель
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-line bg-paper p-3">
      <span className="text-xs text-muted">Выбери секцию:</span>
      {TRACKER_SECTION_ITEMS.map((section) => (
        <button
          key={section.id}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90",
            TRACKER_SECTION_COLORS[section.id],
          )}
          onClick={() => void add(section.id)}
          type="button"
        >
          {section.icon} {section.label}
        </button>
      ))}
      <button
        className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
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
    return <div className="paper-panel h-[480px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  return (
    <div className="space-y-5">
      {sortedRoots.length === 0 ? (
        <div className="paper-panel rounded-[32px] p-6 text-sm text-muted">
          Мета-целей пока нет. Добавь первую — она привяжется к одной из пяти секций.
        </div>
      ) : null}

      <div className="space-y-4">
        {sortedRoots.map((goal) => (
          <GoalNode key={goal.id} goal={goal} siblings={sortedRoots} sprintId={sprintId} />
        ))}
      </div>

      <AddMetaGoalPicker sprintId={sprintId} allGoals={goals} />
    </div>
  );
}

/** @deprecated use TrackerGoalsGrid */
export function TrackerSectionView({ section, sprintId }: { section: TrackerSection; sprintId: string }) {
  return <TrackerGoalsGrid sprintId={sprintId} />;
}
