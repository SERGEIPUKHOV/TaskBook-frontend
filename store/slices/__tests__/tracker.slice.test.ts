import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { AppStore } from "@/store/slices/shared";
import { createTrackerSlice } from "@/store/slices/tracker.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMock,
}));

function createStore() {
  const noopAsync = async () => ({ ok: true as const });
  const noopPromise = async () => {};
  const noop = () => {};

  return create<AppStore>()((...args) => ({
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
    weekLoadStates: {},
    weeks: {},
    ensureWeek: noop,
    updateWeekDayNote: noop,
    updateWeekText: noop,
    addTask: noop,
    cycleTaskStatus: noop,
    deleteTask: noop,
    moveTask: noop,
    setTaskStartDay: noop,
    updateTask: noop,
    exportTaskToGoogle: noopPromise,
    unlinkTaskFromGoogle: noopPromise,
    updateTaskEventTime: noopPromise,
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
    connectAppleCalendar: async () => ({
      accountLabel: null,
      color: null,
      createdAt: "",
      externalAccountId: "",
      id: "",
      lastError: null,
      lastSyncedAt: null,
      provider: "google",
      providerAccountLabel: null,
      status: "active",
      tokenExpiresAt: null,
      updatedAt: "",
    }),
    dismissImportEvent: noop,
    disconnectGoogleCalendarAccount: noopPromise,
    deleteCalendarConnection: noopPromise,
    ensureCalendarRange: noopPromise,
    fetchCalendarConnections: noopPromise,
    fetchGoogleCalendarOptions: noopPromise,
    fetchTaskExportFeeds: noopPromise,
    importCalendarEventToPlanner: async () => ({
      plannerLink: { id: "", linkMode: "import_copy", openPath: "", targetId: "", targetKind: "task" },
      status: "existing",
    }),
    bulkImportCalendarEventsToPlanner: async () => ({
      errors: [],
      failedCount: 0,
      importedCount: 0,
      requestedCount: 0,
    }),
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
    ...createTrackerSlice(...args),
  }));
}

describe("createTrackerSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads tracker sprints and keeps active sprint first", async () => {
    const store = createStore();
    apiMock.get.mockResolvedValueOnce([
      {
        created_at: "2026-04-17T08:00:00Z",
        end_date: "2026-05-31",
        id: "sprint-1",
        is_active: false,
        start_date: "2026-05-01",
        title: "May sprint",
        updated_at: "2026-04-17T08:00:00Z",
      },
      {
        created_at: "2026-04-18T08:00:00Z",
        end_date: "2026-06-30",
        id: "sprint-2",
        is_active: true,
        start_date: "2026-06-01",
        title: "June sprint",
        updated_at: "2026-04-18T08:00:00Z",
      },
    ]);

    await store.getState().fetchTrackerSprints();

    expect(apiMock.get).toHaveBeenCalledWith("/tracker/sprints");
    expect(store.getState().trackerSprints[0]).toEqual(
      expect.objectContaining({ id: "sprint-2", isActive: true, title: "June sprint" }),
    );
    expect(store.getState().trackerSprintsStatus).toBe("ready");
  });

  it("patches goal status inside nested goals", async () => {
    const store = createStore();
    store.setState({
      trackerGoalsBySprint: {
        "sprint-1": [
          {
            children: [
              {
                children: [
                  {
                    children: [],
                    createdAt: "2026-04-17T10:00:00Z",
                    deadlineDate: "2026-04-20",
                    targetBaseline: null,
                    targetStretch: null,
                    id: "goal-3",
                    level: 3,
                    parentId: "goal-2",
                    section: "money",
                    sortOrder: 2,
                    sprintId: "sprint-1",
                    status: null,
                    title: "Subgoal",
                    updatedAt: "2026-04-17T10:00:00Z",
                  },
                ],
                createdAt: "2026-04-17T09:00:00Z",
                deadlineDate: null,
                targetBaseline: null,
                targetStretch: null,
                id: "goal-2",
                level: 2,
                parentId: "goal-1",
                section: "money",
                sortOrder: 1,
                sprintId: "sprint-1",
                status: null,
                title: "Goal",
                updatedAt: "2026-04-17T09:00:00Z",
              },
            ],
            createdAt: "2026-04-17T08:00:00Z",
            deadlineDate: null,
            targetBaseline: null,
                    targetStretch: null,
            id: "goal-1",
            level: 1,
            parentId: null,
            section: "money",
            sortOrder: 0,
            sprintId: "sprint-1",
            status: null,
            title: "Meta",
            updatedAt: "2026-04-17T08:00:00Z",
          },
        ],
      },
    });
    apiMock.patch.mockResolvedValueOnce({
      children: [],
      created_at: "2026-04-17T10:00:00Z",
      deadline_date: "2026-04-20",
      targetBaseline: null,
                    targetStretch: null,
      id: "goal-3",
      level: 3,
      parent_id: "goal-2",
      section: "money",
      sort_order: 2,
      sprint_id: "sprint-1",
      status: "done",
      title: "Subgoal",
      updated_at: "2026-04-17T11:00:00Z",
    });

    await store.getState().patchTrackerGoalStatus("goal-3", "done");

    expect(apiMock.patch).toHaveBeenCalledWith("/tracker/goals/goal-3", { status: "done" });
    expect(store.getState().trackerGoalsBySprint["sprint-1"][0]?.children[0]?.children[0]?.status).toBe("done");
  });

  it("activates sprint locally after successful patch", async () => {
    const store = createStore();
    store.setState({
      trackerSprints: [
        {
          createdAt: "2026-04-17T08:00:00Z",
          endDate: "2026-05-31",
          id: "sprint-1",
          isActive: true,
          startDate: "2026-05-01",
          title: "May sprint",
          updatedAt: "2026-04-17T08:00:00Z",
        },
        {
          createdAt: "2026-04-18T08:00:00Z",
          endDate: "2026-06-30",
          id: "sprint-2",
          isActive: false,
          startDate: "2026-06-01",
          title: "June sprint",
          updatedAt: "2026-04-18T08:00:00Z",
        },
      ],
    });
    apiMock.patch.mockResolvedValueOnce({
      created_at: "2026-04-18T08:00:00Z",
      end_date: "2026-06-30",
      id: "sprint-2",
      is_active: true,
      start_date: "2026-06-01",
      title: "June sprint",
      updated_at: "2026-04-19T08:00:00Z",
    });

    await store.getState().setActiveTrackerSprint("sprint-2");

    expect(store.getState().trackerSprints[0]?.id).toBe("sprint-2");
    expect(store.getState().trackerSprints[0]?.isActive).toBe(true);
    expect(store.getState().trackerSprints[1]?.isActive).toBe(false);
  });
});
