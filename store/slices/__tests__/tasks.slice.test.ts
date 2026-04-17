import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { WeekData, WeekTask } from "@/lib/planner-types";
import type { AppStore } from "@/store/slices/shared";
import { createTasksSlice } from "@/store/slices/tasks.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn().mockResolvedValue(undefined),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMock,
}));

function buildWeek(overrides: Partial<WeekData> = {}): WeekData {
  return {
    reflection: {
      focus: "",
      gratitudes: {},
      keyEvents: {},
      reward: "",
    },
    startDate: "2026-03-09",
    tasks: [],
    week: 11,
    year: 2026,
    ...overrides,
  };
}

function buildTask(overrides: Partial<WeekTask> = {}): WeekTask {
  return {
    fa: 0,
    id: "task-1",
    isPriority: false,
    calendarExportEnabled: false,
    calendarExportBucket: null,
    startDayKey: "2026-03-09",
    statusTrail: [],
    ti: 0,
    title: "Task",
    ...overrides,
  };
}

function createStore(initialWeek: WeekData) {
  const weekKey = "2026-W11";
  const noopAsync = async () => ({ ok: true as const });
  const noopCalendarImport = async () => ({
    plannerLink: {
      id: "",
      linkMode: "import_copy" as const,
      openPath: "",
      targetId: "",
      targetKind: "task" as const,
    },
    status: "existing" as const,
  });
  const noopCalendarConnect = async () => ({
    accountLabel: null,
    color: null,
    createdAt: "",
    externalAccountId: "",
    id: "",
    lastError: null,
    lastSyncedAt: null,
    provider: "google" as const,
    providerAccountLabel: null,
    status: "active" as const,
    tokenExpiresAt: null,
    updatedAt: "",
  });
  const noopPromise = async () => {};
  const noop = () => {};

  const useStore = create<AppStore>()((...args) => ({
    lastSavedAt: null,
    monthLoadStates: {},
    months: {},
    addMonthListItem: noop,
    deleteMonthListItem: noop,
    ensureMonth: noop,
    updateMonthListItem: noop,
    updateMonthText: noop,
    setDailyMetric: noop,
    setDailyMetrics: noop,
    habitLoadStates: {},
    addHabit: noopAsync,
    deleteHabit: noop,
    fetchMonthHabits: noopPromise,
    toggleHabitDay: noop,
    updateHabitName: noop,
    updateHabitSchedule: noopPromise,
    updateHabitEventTime: noopPromise,
    weekEntryMeta: {},
    weekLoadStates: { [weekKey]: "ready" },
    weeks: { [weekKey]: initialWeek },
    ensureWeek: noop,
    updateWeekDayNote: noop,
    updateWeekText: noop,
    calendarConnections: [],
    calendarConnectionsStatus: "idle",
    dismissedImportIds: [],
    googleCalendarOptions: [],
    googleCalendarOptionsStatus: "idle",
    googleCalendarConnected: false,
    googleCalendarAccountLabel: null,
    taskExportFeeds: [],
    taskExportFeedsStatus: "idle",
    calendarRangeLoadStates: {},
    calendarRanges: {},
    connectAppleCalendar: noopCalendarConnect,
    dismissImportEvent: noop,
    disconnectGoogleCalendarAccount: noopPromise,
    deleteCalendarConnection: noopPromise,
    ensureCalendarRange: noopPromise,
    fetchCalendarConnections: noopPromise,
    fetchGoogleCalendarOptions: noopPromise,
    fetchTaskExportFeeds: noopPromise,
    bulkImportCalendarEventsToPlanner: async () => ({
      errors: [],
      failedCount: 0,
      importedCount: 0,
      requestedCount: 0,
    }),
    importCalendarEventToPlanner: noopCalendarImport,
    saveGoogleCalendarSelections: noopPromise,
    startGoogleCalendarConnect: async () => "",
    syncCalendarConnection: noopPromise,
    syncAllGoogleCalendars: noopPromise,
    undismissImportEvent: noop,
    updateConnectionColor: noopPromise,
    accessibleOwners: [],
    accessibleOwnersStatus: "idle",
    supervisionGrants: [],
    supervisionGrantsStatus: "idle",
    viewingAs: null,
    fetchSupervisionGrants: noopPromise,
    fetchAccessibleOwners: noopPromise,
    addSupervisorGrant: async () => ({
      createdAt: "",
      id: "",
      sections: ["dashboard"],
      status: "pending",
      supervisorEmail: "",
      supervisorId: null,
      updatedAt: "",
    }),
    updateSupervisorGrant: async () => ({
      createdAt: "",
      id: "",
      sections: ["dashboard"],
      status: "active",
      supervisorEmail: "",
      supervisorId: null,
      updatedAt: "",
    }),
    deleteSupervisorGrant: noopPromise,
    startViewingAs: noop,
    stopViewingAs: noop,
    resetSupervisionState: noop,
    trackerDayDeadlines: {},
    trackerDayDeadlinesStatus: {},
    trackerGoalsBySprint: {},
    trackerGoalsStatus: {},
    trackerSprints: [],
    trackerSprintsStatus: "idle",
    trackerWeekDeadlines: {},
    trackerWeekDeadlinesStatus: {},
    createTrackerGoal: async () => ({
      children: [],
      createdAt: "",
      deadlineDate: null,
      hypothesis: null,
      id: "",
      level: 1,
      parentId: null,
      section: "money",
      sortOrder: 0,
      sprintId: "",
      status: null,
      title: "",
      updatedAt: "",
    }),
    createTrackerSprint: async () => ({
      createdAt: "",
      endDate: "",
      id: "",
      isActive: false,
      startDate: "",
      title: "",
      updatedAt: "",
    }),
    deleteTrackerGoal: noopPromise,
    deleteTrackerSprint: noopPromise,
    fetchTrackerDayDeadlines: noopPromise,
    fetchTrackerGoals: noopPromise,
    fetchTrackerSprints: noopPromise,
    fetchTrackerWeekDeadlines: noopPromise,
    patchTrackerGoal: async () => ({
      children: [],
      createdAt: "",
      deadlineDate: null,
      hypothesis: null,
      id: "",
      level: 1,
      parentId: null,
      section: "money",
      sortOrder: 0,
      sprintId: "",
      status: null,
      title: "",
      updatedAt: "",
    }),
    patchTrackerGoalStatus: async () => ({
      children: [],
      createdAt: "",
      deadlineDate: null,
      hypothesis: null,
      id: "",
      level: 1,
      parentId: null,
      section: "money",
      sortOrder: 0,
      sprintId: "",
      status: null,
      title: "",
      updatedAt: "",
    }),
    patchTrackerSprint: async () => ({
      createdAt: "",
      endDate: "",
      id: "",
      isActive: false,
      startDate: "",
      title: "",
      updatedAt: "",
    }),
    setActiveTrackerSprint: async () => ({
      createdAt: "",
      endDate: "",
      id: "",
      isActive: false,
      startDate: "",
      title: "",
      updatedAt: "",
    }),
    ...createTasksSlice(...args),
  }));

  return { useStore, weekKey };
}

async function flushAsyncUpdates() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createTasksSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a temp task immediately and reconciles it with API response", async () => {
    const { useStore, weekKey } = createStore(buildWeek());
    apiMock.post.mockResolvedValueOnce({
      carried_from_task_id: null,
      calendar_export_bucket: null,
      calendar_export_enabled: false,
      id: "task-server-1",
      is_priority: false,
      order: 0,
      start_day: 1,
      statuses: {},
      time_actual: 0,
      time_planned: 0,
      title: "Persisted task",
    });

    useStore.getState().addTask(weekKey);

    const optimisticTask = useStore.getState().weeks[weekKey]?.tasks[0];
    expect(optimisticTask?.id.startsWith("temp-task-")).toBe(true);

    await flushAsyncUpdates();

    expect(useStore.getState().weeks[weekKey]?.tasks).toEqual([
      expect.objectContaining({
        id: "task-server-1",
        title: "Persisted task",
      }),
    ]);
  });

  it("removes persisted tasks and calls delete endpoint", async () => {
    const { useStore, weekKey } = createStore(buildWeek({ tasks: [buildTask()] }));
    useStore.setState({
      calendarRangeLoadStates: { "2026-03-09:2026-03-15": "ready" },
      calendarRanges: {
        "2026-03-09:2026-03-15": {
          dateFrom: "2026-03-09",
          dateTo: "2026-03-15",
          events: [],
        },
      },
    });

    useStore.getState().deleteTask(weekKey, "task-1");

    expect(apiMock.delete).toHaveBeenCalledWith("/tasks/task-1");
    expect(useStore.getState().weeks[weekKey]?.tasks).toEqual([]);
    // calendar ranges are cleared after the delete API call completes
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(useStore.getState().calendarRangeLoadStates).toEqual({});
    expect(useStore.getState().calendarRanges).toEqual({});
  });

  it("debounces updateTask persistence and clamps numeric values", async () => {
    vi.useFakeTimers();
    const { useStore, weekKey } = createStore(buildWeek({ tasks: [buildTask()] }));
    apiMock.patch.mockResolvedValue(undefined);

    useStore.getState().updateTask(weekKey, "task-1", "ti", -15);
    expect(useStore.getState().weeks[weekKey]?.tasks[0]?.ti).toBe(0);

    await vi.runAllTimersAsync();

    expect(apiMock.patch).toHaveBeenCalledWith("/tasks/task-1", {
      calendar_export_bucket: null,
      calendar_export_enabled: false,
      is_priority: false,
      start_day: 1,
      time_actual: 0,
      time_planned: 0,
      title: "Task",
    });
    vi.useRealTimers();
  });

  it("enables calendar export with default bucket and persists task settings", async () => {
    vi.useFakeTimers();
    const { useStore, weekKey } = createStore(buildWeek({ tasks: [buildTask()] }));
    apiMock.patch.mockResolvedValue(undefined);

    useStore.getState().updateTask(weekKey, "task-1", "calendarExportEnabled", true);

    expect(useStore.getState().weeks[weekKey]?.tasks[0]).toEqual(
      expect.objectContaining({
        calendarExportBucket: "default",
        calendarExportEnabled: true,
      }),
    );

    await vi.runAllTimersAsync();

    expect(apiMock.patch).toHaveBeenCalledWith("/tasks/task-1", {
      calendar_export_bucket: "default",
      calendar_export_enabled: true,
      is_priority: false,
      start_day: 1,
      time_actual: 0,
      time_planned: 0,
      title: "Task",
    });
    vi.useRealTimers();
  });

  it("reorders tasks locally and syncs server order", async () => {
    const { useStore, weekKey } = createStore(
      buildWeek({
        tasks: [buildTask({ id: "task-1", title: "First" }), buildTask({ id: "task-2", title: "Second" })],
      }),
    );
    apiMock.post.mockResolvedValue(undefined);

    useStore.getState().moveTask(weekKey, "task-2", "task-1");
    await Promise.resolve();

    expect(useStore.getState().weeks[weekKey]?.tasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);
    expect(apiMock.post).toHaveBeenCalledWith("/weeks/2026/11/tasks/reorder", {
      task_ids: ["task-2", "task-1"],
    });
  });
});
