"use client";

import { useEffect, useMemo, useState } from "react";

import type { TrackerGoal, TrackerSection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { TRACKER_SECTION_LABELS, TRACKER_STATUS_OPTIONS } from "./tracker-meta";

function nextSortOrder(goals: TrackerGoal[]): number {
  return goals.reduce((maxValue, goal) => Math.max(maxValue, goal.sortOrder), -1) + 1;
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
    if ((goal.hypothesis ?? "") === normalized) {
      return;
    }
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
    if (!target) {
      return;
    }
    await patchTrackerGoal(goal.id, { sortOrder: target.sortOrder });
    await patchTrackerGoal(target.id, { sortOrder: goal.sortOrder });
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-line bg-paper/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted">
            <span>Level {goal.level}</span>
            {goal.level === 3 && goal.deadlineDate ? <span>{goal.deadlineDate}</span> : null}
          </div>
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
            <button className="mt-2 text-left text-sm font-semibold text-ink" onClick={() => setIsEditingTitle(true)} type="button">
              {goal.title || "Без названия"}
            </button>
          )}

          {goal.level === 2 ? (
            <textarea
              className="mt-3 min-h-[88px] w-full rounded-[18px] border border-line bg-canvas/60 px-4 py-3 text-sm leading-6 text-ink outline-none transition-colors focus:border-accent"
              onBlur={() => void saveHypothesis()}
              onChange={(event) => setDraftHypothesis(event.target.value)}
              placeholder="Гипотеза"
              rows={3}
              value={draftHypothesis}
            />
          ) : null}

          {goal.level === 3 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className="h-10 rounded-[14px] border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
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
                      "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      option.className,
                      !isActive && "opacity-70 hover:opacity-100",
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

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {goal.level < 3 ? (
            <button
              className="rounded-[14px] border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={() => void handleAddChild()}
              type="button"
            >
              {goal.level === 1 ? "+ Цель" : "+ Подцель"}
            </button>
          ) : null}
          <button className="rounded-[14px] border border-line bg-paper px-3 py-2 text-xs text-muted transition-colors hover:text-ink" onClick={() => void move(-1)} type="button">↑</button>
          <button className="rounded-[14px] border border-line bg-paper px-3 py-2 text-xs text-muted transition-colors hover:text-ink" onClick={() => void move(1)} type="button">↓</button>
          <button
            className="rounded-[14px] border border-line bg-paper px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-danger hover:text-danger"
            onClick={() => void deleteTrackerGoal(sprintId, goal.id)}
            type="button"
          >
            Удалить
          </button>
        </div>
      </div>

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

export function TrackerSectionView({ section, sprintId }: { section: TrackerSection; sprintId: string }) {
  const fetchTrackerGoals = useAppStore((state) => state.fetchTrackerGoals);
  const goals = useAppStore((state) => state.trackerGoalsBySprint[sprintId] ?? []);
  const goalsStatus = useAppStore((state) => state.trackerGoalsStatus[sprintId] ?? "idle");
  const createTrackerGoal = useAppStore((state) => state.createTrackerGoal);

  useEffect(() => {
    void fetchTrackerGoals(sprintId);
  }, [fetchTrackerGoals, sprintId]);

  const sectionRoots = useMemo(() => goals.filter((goal) => goal.section === section), [goals, section]);

  if (goalsStatus === "loading" && goals.length === 0) {
    return <div className="paper-panel h-[480px] animate-pulse rounded-[32px] border border-line bg-paper/60" />;
  }

  return (
    <div className="space-y-5">
      <header className="paper-panel rounded-[32px] p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">TaskTracker</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{TRACKER_SECTION_LABELS[section]}</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Мета-цели, цели, подцели и дедлайны живут здесь в одной вертикали.</p>
      </header>

      {sectionRoots.length === 0 ? (
        <div className="paper-panel rounded-[32px] p-6 text-sm text-muted">
          Для секции пока нет целей. Можно начать с одной мета-цели и затем развернуть её вниз.
        </div>
      ) : null}

      <div className="space-y-4">
        {sectionRoots.map((goal) => (
          <GoalNode key={goal.id} goal={goal} siblings={sectionRoots} sprintId={sprintId} />
        ))}
      </div>

      <button
        className="rounded-[20px] border border-dashed border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        onClick={() =>
          void createTrackerGoal(sprintId, {
            level: 1,
            section,
            sortOrder: nextSortOrder(sectionRoots),
            title: "Новая мета-цель",
          })
        }
        type="button"
      >
        + Добавить мета-цель
      </button>
    </div>
  );
}
