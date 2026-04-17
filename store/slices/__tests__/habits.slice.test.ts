import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { MonthData } from "@/lib/planner-types";
import type { AppStore } from "@/store/slices/shared";
import { createHabitsSlice } from "@/store/slices/habits.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn().mockResolvedValue(undefined),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMock,
}));

function buildMonth(overrides: Partial<MonthData> = {}): MonthData {
  return {
    year: 2026,
    month: 3,
    mainGoal: "",
    focusAreas: [],
    newHabits: [],
    letGo: [],
    notes: "",
    dailyStates: [],
    habits: [],
    habitLogs: {},
    ...overrides,
  };
}

function createStore(initialMonth: MonthData) {
  const monthKey = "2026-03";
  const noopAsync = async () => ({ ok: true as const });
  const noopCalendarImport = async () => ({
    plannerLink: {
      id: "",
      linkMode: "import_copy" as const,
      openPath: "",
      targetId: "",
      targetKind: "habit" as const,
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
    monthLoadStates: { [monthKey]: "ready" },
    months: { [monthKey]: initialMonth },
    addMonthListItem: noop,
    deleteMonthListItem: noop,
    ensureMonth: noop,
    updateMonthListItem: noop,
    updateMonthText: noop,
    setDailyMetric: noop,
    setDailyMetrics: noop,
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
    exportTaskToGoogle: async () => {},
    unlinkTaskFromGoogle: async () => {},
    updateTaskEventTime: async () => {},
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
      targetBaseline: null,
      targetStretch: null,
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
      targetBaseline: null,
      targetStretch: null,
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
      targetBaseline: null,
      targetStretch: null,
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
    ...createHabitsSlice(...args),
  }));

  return { monthKey, useStore };
}

describe("createHabitsSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes habits and invalidates calendar ranges", async () => {
    const { monthKey, useStore } = createStore(
      buildMonth({
        habits: [{ id: "habit-1", name: "Weekly Piano", scheduleDays: [4] }],
        habitLogs: { "habit-1": ["2026-03-12"] },
      }),
    );
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

    useStore.getState().deleteHabit(monthKey, "habit-1");

    expect(apiMock.delete).toHaveBeenCalledWith("/habits/habit-1?year=2026&month=3");
    expect(useStore.getState().months[monthKey]?.habits).toEqual([]);
    expect(useStore.getState().months[monthKey]?.habitLogs).toEqual({});
    // calendar ranges are cleared after the delete API call completes
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(useStore.getState().calendarRangeLoadStates).toEqual({});
    expect(useStore.getState().calendarRanges).toEqual({});
  });
});
