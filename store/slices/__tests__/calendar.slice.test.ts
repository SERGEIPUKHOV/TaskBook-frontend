import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { AppStore } from "@/store/slices/shared";
import { createCalendarSlice } from "@/store/slices/calendar.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
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
        provider: "apple",
      }),
    ]);
    expect(store.getState().calendarConnectionsStatus).toBe("ready");
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
          provider: "google",
          source_timezone: "UTC",
          starts_at: "2026-03-10T09:00:00Z",
          status: "confirmed",
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
        startsAt: "2026-03-10T09:00:00Z",
        title: "Review",
      }),
    ]);
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
});
