import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { AppStore } from "@/store/slices/shared";
import { createCalendarSlice } from "@/store/slices/calendar.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
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
    exportTaskToGoogle: async () => {},
    unlinkTaskFromGoogle: async () => {},
    updateTaskEventTime: async () => {},
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
    ...createCalendarSlice(...args),
  }));
}

describe("createCalendarSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads calendar connections and maps provider data", async () => {
    const store = createStore();
    apiMock.get.mockResolvedValueOnce([
      {
        account_label: "Команда",
        created_at: "2026-04-05T08:00:00Z",
        external_account_id: "apple-1",
        id: "connection-1",
        last_error: null,
        last_synced_at: "2026-04-05T09:00:00Z",
        color: "#0B8043",
        provider: "apple",
        status: "active",
        token_expires_at: null,
        updated_at: "2026-04-05T09:00:00Z",
      },
    ]);

    await store.getState().fetchCalendarConnections();

    expect(apiMock.get).toHaveBeenCalledWith("/calendar/connections");
    expect(store.getState().calendarConnections).toEqual([
      expect.objectContaining({
        accountLabel: "Команда",
        color: "#0B8043",
        provider: "apple",
      }),
    ]);
    expect(store.getState().calendarConnectionsStatus).toBe("ready");
  });

  it("invalidates cached ranges when connection sync timestamp changes", async () => {
    const store = createStore();
    store.setState({
      calendarConnections: [
        {
          accountLabel: "Команда",
          color: "#0B8043",
          createdAt: "2026-04-05T08:00:00Z",
          externalAccountId: "apple-1",
          id: "connection-1",
          lastError: null,
          lastSyncedAt: "2026-04-05T09:00:00Z",
          provider: "apple",
          providerAccountLabel: null,
          status: "active",
          tokenExpiresAt: null,
          updatedAt: "2026-04-05T09:00:00Z",
        },
      ],
      calendarRangeLoadStates: { "2026-04-07:2026-04-13": "ready" },
      calendarRanges: {
        "2026-04-07:2026-04-13": {
          dateFrom: "2026-04-07",
          dateTo: "2026-04-13",
          events: [],
        },
      },
    });
    apiMock.get.mockResolvedValueOnce([
      {
        account_label: "Команда",
        created_at: "2026-04-05T08:00:00Z",
        external_account_id: "apple-1",
        id: "connection-1",
        last_error: null,
        last_synced_at: "2026-04-05T10:00:00Z",
        color: "#0B8043",
        provider: "apple",
        status: "active",
        token_expires_at: null,
        updated_at: "2026-04-05T10:00:00Z",
      },
    ]);

    await store.getState().fetchCalendarConnections(true);

    expect(store.getState().calendarRanges).toEqual({});
    expect(store.getState().calendarRangeLoadStates).toEqual({});
  });

  it("invalidates cached ranges when the connection list changes", async () => {
    const store = createStore();
    store.setState({
      calendarConnections: [
        {
          accountLabel: "Личный",
          color: "#4285F4",
          createdAt: "2026-04-05T08:00:00Z",
          externalAccountId: "google-primary",
          id: "connection-1",
          lastError: null,
          lastSyncedAt: "2026-04-05T09:00:00Z",
          provider: "google",
          providerAccountLabel: "user@gmail.com",
          status: "active",
          tokenExpiresAt: null,
          updatedAt: "2026-04-05T09:00:00Z",
        },
      ],
      calendarRangeLoadStates: { "2026-04-07:2026-04-13": "ready" },
      calendarRanges: {
        "2026-04-07:2026-04-13": {
          dateFrom: "2026-04-07",
          dateTo: "2026-04-13",
          events: [],
        },
      },
    });
    apiMock.get.mockResolvedValueOnce([
      {
        account_label: "Личный",
        created_at: "2026-04-05T08:00:00Z",
        external_account_id: "google-primary",
        id: "connection-1",
        last_error: null,
        last_synced_at: "2026-04-05T09:00:00Z",
        color: "#4285F4",
        provider: "google",
        provider_account_label: "user@gmail.com",
        status: "active",
        token_expires_at: null,
        updated_at: "2026-04-05T09:00:00Z",
      },
      {
        account_label: "Команда",
        created_at: "2026-04-05T08:30:00Z",
        external_account_id: "team@group.calendar.google.com",
        id: "connection-2",
        last_error: null,
        last_synced_at: "2026-04-05T09:30:00Z",
        color: "#33B679",
        provider: "google",
        provider_account_label: "user@gmail.com",
        status: "active",
        token_expires_at: null,
        updated_at: "2026-04-05T09:30:00Z",
      },
    ]);

    await store.getState().fetchCalendarConnections(true);

    expect(store.getState().calendarRanges).toEqual({});
    expect(store.getState().calendarRangeLoadStates).toEqual({});
    expect(store.getState().calendarConnections).toHaveLength(2);
  });

  it("dismisses import events without duplicating ids", () => {
    const store = createStore();

    expect(store.getState().dismissedImportIds).toEqual([]);

    store.getState().dismissImportEvent("event-1");
    expect(store.getState().dismissedImportIds).toEqual(["event-1"]);

    store.getState().dismissImportEvent("event-1");
    expect(store.getState().dismissedImportIds).toEqual(["event-1"]);
  });

  it("undismisses import events without touching other ids", () => {
    const store = createStore();
    store.setState({ dismissedImportIds: ["event-1", "event-2"] });

    store.getState().undismissImportEvent("event-1");
    expect(store.getState().dismissedImportIds).toEqual(["event-2"]);

    store.getState().undismissImportEvent("missing");
    expect(store.getState().dismissedImportIds).toEqual(["event-2"]);
  });

  it("loads a calendar range once and stores mapped events", async () => {
    const store = createStore();
    apiMock.get.mockResolvedValueOnce({
      date_from: "2026-03-10",
      date_to: "2026-03-10",
      events: [
        {
          account_label: "Google Calendar",
          connection_id: "connection-1",
          description: "Discuss rollout",
          ends_at: "2026-03-10T10:00:00Z",
          external_calendar_id: "primary",
          external_event_id: "event-1",
          id: "event-1",
          is_all_day: false,
          location: "Studio",
          planner_link: null,
          provider: "google",
          series_linked: false,
          source_timezone: "UTC",
          starts_at: "2026-03-10T09:00:00Z",
          status: "confirmed",
          suggested_target_type: "task",
          title: "Review",
        },
      ],
    });

    await store.getState().ensureCalendarRange("2026-03-10", "2026-03-10");
    await store.getState().ensureCalendarRange("2026-03-10", "2026-03-10");

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith("/calendar/events?date_from=2026-03-10&date_to=2026-03-10");
    expect(store.getState().calendarRanges["2026-03-10:2026-03-10"]?.events).toEqual([
      expect.objectContaining({
        accountLabel: "Google Calendar",
        plannerLink: null,
        seriesLinked: false,
        startsAt: "2026-03-10T09:00:00Z",
        suggestedTargetType: "task",
        title: "Review",
      }),
    ]);
  });

  it("imports a calendar event into planner and updates local event link", async () => {
    const store = createStore();
    store.setState({
      calendarRanges: {
        "2026-03-10:2026-03-10": {
          dateFrom: "2026-03-10",
          dateTo: "2026-03-10",
          events: [
            {
              accountLabel: "Google Calendar",
              connectionId: "connection-1",
              description: "Discuss rollout",
              endsAt: "2026-03-10T10:00:00Z",
              externalCalendarId: "primary",
              externalEventId: "event-1",
              id: "event-1",
              isAllDay: false,
              location: "Studio",
              plannerLink: null,
              provider: "google",
              seriesLinked: false,
              sourceTimezone: "UTC",
              startsAt: "2026-03-10T09:00:00Z",
              status: "confirmed",
              suggestedTargetType: "task",
              title: "Review",
            },
          ],
        },
      },
      monthLoadStates: { "2026-03": "ready" },
      weekLoadStates: { "2026-W11": "ready" },
    });
    apiMock.post.mockResolvedValueOnce({
      planner_link: {
        id: "link-1",
        link_mode: "import_copy",
        open_path: "/week/2026/11",
        target_id: "task-1",
        target_kind: "task",
      },
      status: "created",
    });

    const result = await store.getState().importCalendarEventToPlanner("event-1", {
      isPriority: true,
      startDay: 2,
      targetType: "task",
      timePlanned: 2,
      title: "Review",
      week: 11,
      year: 2026,
    });

    expect(apiMock.post).toHaveBeenCalledWith("/calendar/events/event-1/import", {
      is_priority: true,
      month: undefined,
      schedule_days: undefined,
      start_day: 2,
      target_type: "task",
      time_planned: 2,
      title: "Review",
      week: 11,
      year: 2026,
    });
    expect(result).toEqual({
      plannerLink: {
        id: "link-1",
        linkMode: "import_copy",
        openPath: "/week/2026/11",
        targetId: "task-1",
        targetKind: "task",
      },
      status: "created",
    });
    expect(store.getState().calendarRanges["2026-03-10:2026-03-10"]?.events[0]?.plannerLink).toEqual(
      result.plannerLink,
    );
    expect(store.getState().weekLoadStates["2026-W11"]).toBe("idle");
  });

  it("marks sibling events in the same recurring series as linked after import", async () => {
    const store = createStore();
    store.setState({
      calendarRanges: {
        "2026-03-10:2026-03-16": {
          dateFrom: "2026-03-10",
          dateTo: "2026-03-16",
          events: [
            {
              accountLabel: "Google Calendar",
              connectionId: "connection-1",
              description: null,
              endsAt: "2026-03-10T10:00:00Z",
              externalCalendarId: "primary",
              externalEventId: "event-1",
              id: "event-1",
              isAllDay: false,
              location: null,
              plannerLink: null,
              provider: "google",
              recurringEventId: "series-1",
              seriesLinked: false,
              sourceTimezone: "UTC",
              startsAt: "2026-03-10T09:00:00Z",
              status: "confirmed",
              suggestedTargetType: "habit",
              title: "Weekly Review",
            },
            {
              accountLabel: "Google Calendar",
              connectionId: "connection-1",
              description: null,
              endsAt: "2026-03-12T10:00:00Z",
              externalCalendarId: "primary",
              externalEventId: "event-2",
              id: "event-2",
              isAllDay: false,
              location: null,
              plannerLink: null,
              provider: "google",
              recurringEventId: "series-1",
              seriesLinked: false,
              sourceTimezone: "UTC",
              startsAt: "2026-03-12T09:00:00Z",
              status: "confirmed",
              suggestedTargetType: "habit",
              title: "Weekly Review",
            },
          ],
        },
      },
      monthLoadStates: { "2026-03": "ready" },
      weekLoadStates: {},
    });
    apiMock.post.mockResolvedValueOnce({
      planner_link: {
        id: "link-1",
        link_mode: "import_copy",
        open_path: "/month/2026/3",
        target_id: "habit-1",
        target_kind: "habit",
      },
      status: "created",
    });

    await store.getState().importCalendarEventToPlanner("event-1", {
      month: 3,
      targetType: "habit",
      title: "Weekly Review",
      year: 2026,
    });

    expect(store.getState().calendarRanges["2026-03-10:2026-03-16"]?.events).toEqual([
      expect.objectContaining({
        id: "event-1",
        plannerLink: expect.objectContaining({ id: "link-1" }),
        seriesLinked: true,
      }),
      expect.objectContaining({
        id: "event-2",
        plannerLink: null,
        seriesLinked: true,
      }),
    ]);
  });

  it("bulk imports events with allSettled semantics and returns aggregate counts", async () => {
    const store = createStore();
    const importSpy = vi
      .spyOn(store.getState(), "importCalendarEventToPlanner")
      .mockResolvedValueOnce({
        plannerLink: {
          id: "link-1",
          linkMode: "import_copy",
          openPath: "/week/2026/11",
          targetId: "task-1",
          targetKind: "task",
        },
        status: "created",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const summary = await store.getState().bulkImportCalendarEventsToPlanner([
      {
        eventId: "event-1",
        payload: { targetType: "task", week: 11, year: 2026 },
      },
      {
        eventId: "event-2",
        payload: { month: 3, targetType: "habit", year: 2026 },
      },
    ]);

    expect(importSpy).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      errors: [{ eventId: "event-2", message: "boom" }],
      failedCount: 1,
      importedCount: 1,
      requestedCount: 2,
    });
  });

  it("loads Google calendar options and maps connected account metadata", async () => {
    const store = createStore();
    apiMock.get.mockResolvedValueOnce({
      connected: true,
      options: [
        {
          access_role: "owner",
          id: "primary",
          primary: true,
          selected: true,
          summary: "puhov.kzn@gmail.com",
        },
        {
          access_role: "writer",
          id: "team@group.calendar.google.com",
          primary: false,
          selected: false,
          summary: "Команда",
        },
      ],
      provider_account_label: "puhov.kzn@gmail.com",
    });

    await store.getState().fetchGoogleCalendarOptions();

    expect(apiMock.get).toHaveBeenCalledWith("/calendar/google/calendars");
    expect(store.getState().googleCalendarConnected).toBe(true);
    expect(store.getState().googleCalendarAccountLabel).toBe("puhov.kzn@gmail.com");
    expect(store.getState().googleCalendarOptions).toEqual([
      expect.objectContaining({
        accessRole: "owner",
        id: "primary",
        primary: true,
        selected: true,
      }),
      expect.objectContaining({
        accessRole: "writer",
        id: "team@group.calendar.google.com",
        selected: false,
        summary: "Команда",
      }),
    ]);
  });

  it("loads task export feeds for profile copy links", async () => {
    const store = createStore();
    apiMock.get.mockResolvedValueOnce([
      {
        bucket: "default",
        feed_path: "/api/v1/calendar/feeds/tasks/token-default.ics?bucket=default",
        task_count: 2,
      },
      {
        bucket: "work",
        feed_path: "/api/v1/calendar/feeds/tasks/token-work.ics?bucket=work",
        task_count: 1,
      },
    ]);

    await store.getState().fetchTaskExportFeeds();

    expect(apiMock.get).toHaveBeenCalledWith("/calendar/feeds/tasks/links");
    expect(store.getState().taskExportFeedsStatus).toBe("ready");
    expect(store.getState().taskExportFeeds).toEqual([
      {
        bucket: "default",
        feedPath: "/api/v1/calendar/feeds/tasks/token-default.ics?bucket=default",
        taskCount: 2,
      },
      {
        bucket: "work",
        feedPath: "/api/v1/calendar/feeds/tasks/token-work.ics?bucket=work",
        taskCount: 1,
      },
    ]);
  });

  it("saves Google calendar selections and refreshes related calendar state", async () => {
    const store = createStore();
    apiMock.put.mockResolvedValueOnce([]);
    apiMock.get
      .mockResolvedValueOnce([
        {
          account_label: "Команда",
          created_at: "2026-04-05T08:00:00Z",
          external_account_id: "team@group.calendar.google.com",
          id: "connection-1",
          last_error: null,
          last_synced_at: "2026-04-05T09:00:00Z",
          color: "#33B679",
          provider: "google",
          provider_account_label: "puhov.kzn@gmail.com",
          status: "active",
          token_expires_at: null,
          updated_at: "2026-04-05T09:00:00Z",
        },
      ])
      .mockResolvedValueOnce({
        connected: true,
        options: [
          {
            access_role: "writer",
            id: "team@group.calendar.google.com",
            primary: false,
            selected: true,
            summary: "Команда",
          },
        ],
        provider_account_label: "puhov.kzn@gmail.com",
      });

    await store.getState().saveGoogleCalendarSelections(["team@group.calendar.google.com"]);

    expect(apiMock.put).toHaveBeenCalledWith("/calendar/google/selections", {
      calendar_ids: ["team@group.calendar.google.com"],
    });
    expect(apiMock.get).toHaveBeenCalledWith("/calendar/connections");
    expect(apiMock.get).toHaveBeenCalledWith("/calendar/google/calendars");
    expect(store.getState().calendarConnections).toEqual([
      expect.objectContaining({
        accountLabel: "Команда",
        color: "#33B679",
        provider: "google",
        providerAccountLabel: "puhov.kzn@gmail.com",
      }),
    ]);
    expect(store.getState().googleCalendarOptions).toEqual([
      expect.objectContaining({
        id: "team@group.calendar.google.com",
        selected: true,
      }),
    ]);
  });

  it("updates connection color and keeps local store in sync", async () => {
    const store = createStore();
    store.setState({
      calendarConnections: [
        {
          accountLabel: "Команда",
          color: "#33B679",
          createdAt: "2026-04-05T08:00:00Z",
          externalAccountId: "team@group.calendar.google.com",
          id: "connection-1",
          lastError: null,
          lastSyncedAt: "2026-04-05T09:00:00Z",
          provider: "google",
          providerAccountLabel: "puhov.kzn@gmail.com",
          status: "active",
          tokenExpiresAt: null,
          updatedAt: "2026-04-05T09:00:00Z",
        },
      ],
    });

    apiMock.patch.mockResolvedValueOnce({
      account_label: "Команда",
      color: "#8E24AA",
      created_at: "2026-04-05T08:00:00Z",
      external_account_id: "team@group.calendar.google.com",
      id: "connection-1",
      last_error: null,
      last_synced_at: "2026-04-05T09:00:00Z",
      provider: "google",
      provider_account_label: "puhov.kzn@gmail.com",
      status: "active",
      token_expires_at: null,
      updated_at: "2026-04-06T00:00:00Z",
    });

    await store.getState().updateConnectionColor("connection-1", "#8E24AA");

    expect(apiMock.patch).toHaveBeenCalledWith("/calendar/connections/connection-1/color", {
      color: "#8E24AA",
    });
    expect(store.getState().calendarConnections).toEqual([
      expect.objectContaining({
        color: "#8E24AA",
        id: "connection-1",
      }),
    ]);
  });
});
