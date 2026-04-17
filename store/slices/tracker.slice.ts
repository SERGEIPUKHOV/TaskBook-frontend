import { api } from "@/lib/api";
import { getWeekKey } from "@/lib/dates";
import type { TrackerDeadline, TrackerGoal, TrackerGoalStatus, TrackerSection, TrackerSprint } from "@/lib/planner-types";

import type { AppSliceCreator, TrackerSlice } from "./shared";
import { touchSave } from "./shared";

type ApiTrackerSprint = {
  created_at: string;
  end_date: string;
  id: string;
  is_active: boolean;
  start_date: string;
  title: string;
  updated_at: string;
};

type ApiTrackerGoal = {
  children: ApiTrackerGoal[];
  created_at: string;
  deadline_date: string | null;
  id: string;
  level: 1 | 2 | 3;
  parent_id: string | null;
  section: TrackerSection;
  sort_order: number;
  sprint_id: string;
  status: Exclude<TrackerGoalStatus, null> | null;
  target_baseline: string | null;
  target_stretch: string | null;
  title: string;
  updated_at: string;
};

type ApiTrackerDeadline = {
  breadcrumb: string[];
  deadline_date: string;
  goal_id: string;
  section: TrackerSection;
  sprint_id: string;
  status: Exclude<TrackerGoalStatus, null> | null;
  title: string;
};

function mapTrackerSprint(entry: ApiTrackerSprint): TrackerSprint {
  return {
    id: entry.id,
    title: entry.title,
    startDate: entry.start_date,
    endDate: entry.end_date,
    isActive: entry.is_active,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

function mapTrackerGoal(entry: ApiTrackerGoal): TrackerGoal {
  return {
    id: entry.id,
    sprintId: entry.sprint_id,
    section: entry.section,
    level: entry.level,
    parentId: entry.parent_id,
    title: entry.title,
    targetBaseline: entry.target_baseline,
    targetStretch: entry.target_stretch,
    deadlineDate: entry.deadline_date,
    status: entry.status,
    sortOrder: entry.sort_order,
    children: (entry.children ?? []).map(mapTrackerGoal),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

function mapTrackerDeadline(entry: ApiTrackerDeadline): TrackerDeadline {
  return {
    goalId: entry.goal_id,
    sprintId: entry.sprint_id,
    section: entry.section,
    title: entry.title,
    deadlineDate: entry.deadline_date,
    status: entry.status,
    breadcrumb: entry.breadcrumb ?? [],
  };
}

function sortSprints(sprints: TrackerSprint[]): TrackerSprint[] {
  return [...sprints].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }
    return right.startDate.localeCompare(left.startDate) || right.createdAt.localeCompare(left.createdAt);
  });
}

function replaceGoalInTree(goals: TrackerGoal[], nextGoal: TrackerGoal): TrackerGoal[] {
  return goals.map((goal) => {
    if (goal.id === nextGoal.id) {
      return { ...nextGoal, children: goal.children.length > 0 && nextGoal.children.length === 0 ? goal.children : nextGoal.children };
    }

    if (goal.children.length === 0) {
      return goal;
    }

    return {
      ...goal,
      children: replaceGoalInTree(goal.children, nextGoal),
    };
  });
}

function removeGoalFromTree(goals: TrackerGoal[], goalId: string): TrackerGoal[] {
  return goals
    .filter((goal) => goal.id !== goalId)
    .map((goal) => ({
      ...goal,
      children: removeGoalFromTree(goal.children, goalId),
    }));
}

function findGoal(goals: TrackerGoal[], goalId: string): TrackerGoal | null {
  for (const goal of goals) {
    if (goal.id === goalId) {
      return goal;
    }
    const nested = findGoal(goal.children, goalId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function findSprintIdByGoal(goalsBySprint: Record<string, TrackerGoal[]>, goalId: string): string | null {
  for (const [sprintId, goals] of Object.entries(goalsBySprint)) {
    if (findGoal(goals, goalId)) {
      return sprintId;
    }
  }
  return null;
}

function replaceDeadlineStatus(deadlinesByKey: Record<string, TrackerDeadline[]>, goalId: string, status: TrackerGoalStatus) {
  return Object.fromEntries(
    Object.entries(deadlinesByKey).map(([key, deadlines]) => [
      key,
      deadlines.map((deadline) => (deadline.goalId === goalId ? { ...deadline, status } : deadline)),
    ]),
  );
}

function removeDeadline(deadlinesByKey: Record<string, TrackerDeadline[]>, goalId: string) {
  return Object.fromEntries(
    Object.entries(deadlinesByKey).map(([key, deadlines]) => [
      key,
      deadlines.filter((deadline) => deadline.goalId !== goalId),
    ]),
  );
}

export const createTrackerSlice: AppSliceCreator<TrackerSlice> = (set, get) => ({
  trackerDayDeadlines: {},
  trackerDayDeadlinesStatus: {},
  trackerGoalsBySprint: {},
  trackerGoalsStatus: {},
  trackerSprints: [],
  trackerSprintsStatus: "idle",
  trackerWeekDeadlines: {},
  trackerWeekDeadlinesStatus: {},

  fetchTrackerSprints: async (force = false) => {
    const currentStatus = get().trackerSprintsStatus;
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set({ trackerSprintsStatus: "loading" });
    try {
      const sprints = (await api.get<ApiTrackerSprint[]>("/tracker/sprints")).map(mapTrackerSprint);
      set({ trackerSprints: sortSprints(sprints), trackerSprintsStatus: "ready" });
    } catch {
      set({ trackerSprintsStatus: "error" });
    }
  },

  createTrackerSprint: async (title, startDate, endDate) => {
    const sprint = mapTrackerSprint(
      await api.post<ApiTrackerSprint>("/tracker/sprints", {
        end_date: endDate,
        start_date: startDate,
        title,
      }),
    );

    set((state) => ({
      ...touchSave(),
      trackerSprints: sortSprints(
        state.trackerSprints.map((item) => ({ ...item, isActive: false })).concat(sprint),
      ),
      trackerSprintsStatus: "ready",
    }));
    return sprint;
  },

  patchTrackerSprint: async (sprintId, patch) => {
    const sprint = mapTrackerSprint(
      await api.patch<ApiTrackerSprint>(`/tracker/sprints/${sprintId}`, {
        ...(patch.endDate !== undefined ? { end_date: patch.endDate } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
      }),
    );

    set((state) => ({
      ...touchSave(),
      trackerSprints: sortSprints(
        state.trackerSprints.map((item) =>
          item.id === sprint.id ? sprint : sprint.isActive ? { ...item, isActive: false } : item,
        ),
      ),
    }));
    return sprint;
  },

  deleteTrackerSprint: async (sprintId) => {
    await api.delete(`/tracker/sprints/${sprintId}`);
    set((state) => {
      const nextGoals = { ...state.trackerGoalsBySprint };
      const nextGoalsStatus = { ...state.trackerGoalsStatus };
      delete nextGoals[sprintId];
      delete nextGoalsStatus[sprintId];
      return {
        ...touchSave(),
        trackerGoalsBySprint: nextGoals,
        trackerGoalsStatus: nextGoalsStatus,
        trackerSprints: state.trackerSprints.filter((sprint) => sprint.id !== sprintId),
      };
    });
    await get().fetchTrackerSprints(true);
  },

  setActiveTrackerSprint: async (sprintId) => get().patchTrackerSprint(sprintId, { isActive: true }),

  fetchTrackerGoals: async (sprintId, force = false) => {
    const currentStatus = get().trackerGoalsStatus[sprintId] ?? "idle";
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set((state) => ({
      trackerGoalsStatus: {
        ...state.trackerGoalsStatus,
        [sprintId]: "loading",
      },
    }));

    try {
      const goals = (await api.get<ApiTrackerGoal[]>(`/tracker/sprints/${sprintId}/goals`)).map(mapTrackerGoal);
      set((state) => ({
        trackerGoalsBySprint: {
          ...state.trackerGoalsBySprint,
          [sprintId]: goals,
        },
        trackerGoalsStatus: {
          ...state.trackerGoalsStatus,
          [sprintId]: "ready",
        },
      }));
    } catch {
      set((state) => ({
        trackerGoalsStatus: {
          ...state.trackerGoalsStatus,
          [sprintId]: "error",
        },
      }));
    }
  },

  createTrackerGoal: async (sprintId, data) => {
    const goal = mapTrackerGoal(
      await api.post<ApiTrackerGoal>(`/tracker/sprints/${sprintId}/goals`, {
        deadline_date: data.deadlineDate ?? null,
        level: data.level,
        parent_id: data.parentId ?? null,
        section: data.section,
        sort_order: data.sortOrder ?? 0,
        target_baseline: data.targetBaseline ?? null,
        target_stretch: data.targetStretch ?? null,
        title: data.title,
      }),
    );
    await get().fetchTrackerGoals(sprintId, true);
    return goal;
  },

  patchTrackerGoal: async (goalId, patch) => {
    const goal = mapTrackerGoal(
      await api.patch<ApiTrackerGoal>(`/tracker/goals/${goalId}`, {
        ...(patch.deadlineDate !== undefined ? { deadline_date: patch.deadlineDate } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.targetBaseline !== undefined ? { target_baseline: patch.targetBaseline } : {}),
        ...(patch.targetStretch !== undefined ? { target_stretch: patch.targetStretch } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
      }),
    );

    const sprintId = findSprintIdByGoal(get().trackerGoalsBySprint, goalId) ?? goal.sprintId;
    set((state) => ({
      ...touchSave(),
      trackerDayDeadlines: replaceDeadlineStatus(state.trackerDayDeadlines, goal.id, goal.status),
      trackerGoalsBySprint: {
        ...state.trackerGoalsBySprint,
        [sprintId]: replaceGoalInTree(state.trackerGoalsBySprint[sprintId] ?? [], goal),
      },
      trackerWeekDeadlines: replaceDeadlineStatus(state.trackerWeekDeadlines, goal.id, goal.status),
    }));
    return goal;
  },

  patchTrackerGoalStatus: async (goalId, status) => get().patchTrackerGoal(goalId, { status }),

  deleteTrackerGoal: async (sprintId, goalId) => {
    await api.delete(`/tracker/goals/${goalId}`);
    set((state) => ({
      ...touchSave(),
      trackerDayDeadlines: removeDeadline(state.trackerDayDeadlines, goalId),
      trackerGoalsBySprint: {
        ...state.trackerGoalsBySprint,
        [sprintId]: removeGoalFromTree(state.trackerGoalsBySprint[sprintId] ?? [], goalId),
      },
      trackerWeekDeadlines: removeDeadline(state.trackerWeekDeadlines, goalId),
    }));
  },

  fetchTrackerWeekDeadlines: async (weekYear, weekNum, force = false) => {
    const key = getWeekKey(weekYear, weekNum);
    const currentStatus = get().trackerWeekDeadlinesStatus[key] ?? "idle";
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set((state) => ({
      trackerWeekDeadlinesStatus: {
        ...state.trackerWeekDeadlinesStatus,
        [key]: "loading",
      },
    }));

    try {
      const deadlines = (await api.get<ApiTrackerDeadline[]>(`/tracker/deadlines/week?week_year=${weekYear}&week_num=${weekNum}`)).map(mapTrackerDeadline);
      set((state) => ({
        trackerWeekDeadlines: {
          ...state.trackerWeekDeadlines,
          [key]: deadlines,
        },
        trackerWeekDeadlinesStatus: {
          ...state.trackerWeekDeadlinesStatus,
          [key]: "ready",
        },
      }));
    } catch {
      set((state) => ({
        trackerWeekDeadlinesStatus: {
          ...state.trackerWeekDeadlinesStatus,
          [key]: "error",
        },
      }));
    }
  },

  fetchTrackerDayDeadlines: async (date, force = false) => {
    const currentStatus = get().trackerDayDeadlinesStatus[date] ?? "idle";
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set((state) => ({
      trackerDayDeadlinesStatus: {
        ...state.trackerDayDeadlinesStatus,
        [date]: "loading",
      },
    }));

    try {
      const deadlines = (await api.get<ApiTrackerDeadline[]>(`/tracker/deadlines/day?date=${date}`)).map(mapTrackerDeadline);
      set((state) => ({
        trackerDayDeadlines: {
          ...state.trackerDayDeadlines,
          [date]: deadlines,
        },
        trackerDayDeadlinesStatus: {
          ...state.trackerDayDeadlinesStatus,
          [date]: "ready",
        },
      }));
    } catch {
      set((state) => ({
        trackerDayDeadlinesStatus: {
          ...state.trackerDayDeadlinesStatus,
          [date]: "error",
        },
      }));
    }
  },
});
