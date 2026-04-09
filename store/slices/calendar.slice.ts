import { api } from "@/lib/api";
import { getMonthKey, getWeekKey } from "@/lib/dates";
import {
  mapApiCalendarConnection,
  mapApiCalendarEventImportResult,
  mapApiCalendarEventsRange,
  mapApiCalendarTaskExportFeed,
  mapApiGoogleCalendarOptions,
  type ApiCalendarConnection,
  type ApiCalendarEventImportResult,
  type ApiCalendarEventsRange,
  type ApiCalendarTaskExportFeed,
  type ApiGoogleCalendarOptions,
  type ApiGoogleAuthSession,
} from "@/lib/planner-api";

import type { AppSliceCreator, CalendarSlice } from "./shared";
import { getCalendarRangeKey, touchSave } from "./shared";

function invalidateCalendarRanges() {
  return {
    calendarRangeLoadStates: {},
    calendarRanges: {},
  };
}

function upsertConnection(
  connections: CalendarSlice["calendarConnections"],
  nextConnection: CalendarSlice["calendarConnections"][number],
) {
  const hasExisting = connections.some((connection) => connection.id === nextConnection.id);
  if (!hasExisting) {
    return [...connections, nextConnection].sort((left, right) => left.accountLabel?.localeCompare(right.accountLabel ?? "") || left.provider.localeCompare(right.provider));
  }

  return connections
    .map((connection) => (connection.id === nextConnection.id ? nextConnection : connection))
    .sort((left, right) => left.accountLabel?.localeCompare(right.accountLabel ?? "") || left.provider.localeCompare(right.provider));
}

// BLOCK-START: CALENDAR_SLICE_MODULE
// Description: Calendar connection management, persisted per-event dismiss state, range loading, and event-to-planner import orchestration for the planner store.
export const createCalendarSlice: AppSliceCreator<CalendarSlice> = (set, get) => ({
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

  dismissImportEvent: (eventId) => {
    set((state) => ({
      dismissedImportIds: state.dismissedImportIds.includes(eventId)
        ? state.dismissedImportIds
        : [...state.dismissedImportIds, eventId],
    }));
  },

  fetchCalendarConnections: async (force = false) => {
    const currentStatus = get().calendarConnectionsStatus;
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set((state) => ({
      calendarConnectionsStatus: "loading",
      calendarConnections: force ? state.calendarConnections : state.calendarConnections,
    }));

    try {
      const connections = await api.get<ApiCalendarConnection[]>("/calendar/connections");
      set({
        calendarConnections: connections.map(mapApiCalendarConnection),
        calendarConnectionsStatus: "ready",
      });
    } catch {
      set({ calendarConnectionsStatus: "error" });
    }
  },

  fetchGoogleCalendarOptions: async (force = false) => {
    const currentStatus = get().googleCalendarOptionsStatus;
    if (!force && currentStatus === "loading") {
      return;
    }
    if (!force && currentStatus === "ready" && (get().googleCalendarConnected || get().googleCalendarOptions.length > 0)) {
      return;
    }

    set({ googleCalendarOptionsStatus: "loading" });
    try {
      const response = mapApiGoogleCalendarOptions(await api.get<ApiGoogleCalendarOptions>("/calendar/google/calendars"));
      set({
        googleCalendarConnected: response.connected,
        googleCalendarAccountLabel: response.providerAccountLabel,
        googleCalendarOptions: response.options,
        googleCalendarOptionsStatus: "ready",
      });
    } catch {
      set({
        googleCalendarConnected: false,
        googleCalendarAccountLabel: null,
        googleCalendarOptions: [],
        googleCalendarOptionsStatus: "error",
      });
    }
  },

  fetchTaskExportFeeds: async (force = false) => {
    const currentStatus = get().taskExportFeedsStatus;
    if (!force && (currentStatus === "loading" || currentStatus === "ready")) {
      return;
    }

    set({ taskExportFeedsStatus: "loading" });
    try {
      const feeds = await api.get<ApiCalendarTaskExportFeed[]>("/calendar/feeds/tasks/links");
      set({
        taskExportFeeds: feeds.map(mapApiCalendarTaskExportFeed),
        taskExportFeedsStatus: "ready",
      });
    } catch {
      set({
        taskExportFeeds: [],
        taskExportFeedsStatus: "error",
      });
    }
  },

  startGoogleCalendarConnect: async (returnTo) => {
    const session = await api.post<ApiGoogleAuthSession>("/calendar/google/auth-session", { return_to: returnTo });
    return session.authorize_url;
  },

  importCalendarEventToPlanner: async (eventId, payload) => {
    const result = mapApiCalendarEventImportResult(
      await api.post<ApiCalendarEventImportResult>(`/calendar/events/${eventId}/import`, {
        is_priority: payload.isPriority ?? false,
        month: payload.month,
        start_day: payload.startDay,
        target_type: payload.targetType,
        time_planned: payload.timePlanned ?? null,
        title: payload.title ?? null,
        week: payload.week,
        year: payload.year,
      }),
    );

    set((state) => {
      const nextWeekLoadStates = { ...state.weekLoadStates };
      const nextMonthLoadStates = { ...state.monthLoadStates };

      if (payload.targetType === "task" && payload.week) {
        nextWeekLoadStates[getWeekKey(payload.year, payload.week)] = "idle";
      }

      if (payload.targetType === "habit" && payload.month) {
        nextMonthLoadStates[getMonthKey(payload.year, payload.month)] = "idle";
      }

      return {
        ...touchSave(),
        calendarRanges: Object.fromEntries(
          Object.entries(state.calendarRanges).map(([rangeKey, range]) => [
            rangeKey,
            {
              ...range,
              events: range.events.map((event) =>
                event.id === eventId ? { ...event, plannerLink: result.plannerLink } : event,
              ),
            },
          ]),
        ),
        monthLoadStates: nextMonthLoadStates,
        weekLoadStates: nextWeekLoadStates,
      };
    });

    return result;
  },

  bulkImportCalendarEventsToPlanner: async (requests) => {
    const results = await Promise.allSettled(
      requests.map(({ eventId, payload }) => get().importCalendarEventToPlanner(eventId, payload)),
    );

    return {
      failedCount: results.filter((result) => result.status === "rejected").length,
      importedCount: results.filter((result) => result.status === "fulfilled").length,
      requestedCount: requests.length,
    };
  },

  saveGoogleCalendarSelections: async (calendarIds) => {
    await api.put<ApiCalendarConnection[]>("/calendar/google/selections", { calendar_ids: calendarIds });
    set((state) => ({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnectionsStatus: state.calendarConnectionsStatus,
    }));
    await get().fetchCalendarConnections(true);
    await get().fetchGoogleCalendarOptions(true);
  },

  syncAllGoogleCalendars: async () => {
    await api.post<ApiCalendarConnection[]>("/calendar/google/sync-all", {});
    set((state) => ({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnectionsStatus: state.calendarConnectionsStatus,
    }));
    await get().fetchCalendarConnections(true);
    await get().fetchGoogleCalendarOptions(true);
  },

  disconnectGoogleCalendarAccount: async () => {
    await api.delete("/calendar/google/account");
    set({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnections: get().calendarConnections.filter((connection) => connection.provider !== "google"),
      calendarConnectionsStatus: "ready",
      googleCalendarConnected: false,
      googleCalendarAccountLabel: null,
      googleCalendarOptions: [],
      googleCalendarOptionsStatus: "ready",
    });
  },

  connectAppleCalendar: async (icsUrl, accountLabel) => {
    const connection = mapApiCalendarConnection(
      await api.post<ApiCalendarConnection>("/calendar/apple-ics/connections", {
        account_label: accountLabel || null,
        ics_url: icsUrl,
      }),
    );

    set((state) => ({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnections: upsertConnection(state.calendarConnections, connection),
      calendarConnectionsStatus: "ready",
    }));

    return connection;
  },

  syncCalendarConnection: async (connectionId) => {
    const connection = mapApiCalendarConnection(
      await api.post<ApiCalendarConnection>(`/calendar/connections/${connectionId}/sync`, {}),
    );

    set((state) => ({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnections: upsertConnection(state.calendarConnections, connection),
      calendarConnectionsStatus: "ready",
    }));
  },

  deleteCalendarConnection: async (connectionId) => {
    const target = get().calendarConnections.find((connection) => connection.id === connectionId) ?? null;
    await api.delete(`/calendar/connections/${connectionId}`);

    set((state) => ({
      ...touchSave(),
      ...invalidateCalendarRanges(),
      calendarConnections: state.calendarConnections.filter((connection) => connection.id !== connectionId),
      calendarConnectionsStatus: "ready",
    }));

    if (target?.provider === "google") {
      await get().fetchGoogleCalendarOptions(true);
    }
  },

  updateConnectionColor: async (connectionId, color) => {
    const connection = mapApiCalendarConnection(
      await api.patch<ApiCalendarConnection>(`/calendar/connections/${connectionId}/color`, {
        color,
      }),
    );

    set((state) => ({
      ...touchSave(),
      calendarConnections: upsertConnection(state.calendarConnections, connection),
      calendarConnectionsStatus: "ready",
    }));
  },

  ensureCalendarRange: async (dateFrom, dateTo) => {
    const rangeKey = getCalendarRangeKey(dateFrom, dateTo);
    const currentStatus = get().calendarRangeLoadStates[rangeKey];
    if (currentStatus === "loading" || currentStatus === "ready") {
      return;
    }

    set((state) => ({
      calendarRangeLoadStates: {
        ...state.calendarRangeLoadStates,
        [rangeKey]: "loading",
      },
    }));

    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const range = mapApiCalendarEventsRange(
        await api.get<ApiCalendarEventsRange>(`/calendar/events?${params.toString()}`),
      );

      set((state) => ({
        calendarRangeLoadStates: {
          ...state.calendarRangeLoadStates,
          [rangeKey]: "ready",
        },
        calendarRanges: {
          ...state.calendarRanges,
          [rangeKey]: range,
        },
      }));
    } catch {
      set((state) => ({
        calendarRangeLoadStates: {
          ...state.calendarRangeLoadStates,
          [rangeKey]: "error",
        },
      }));
    }
  },

});
// BLOCK-END: CALENDAR_SLICE_MODULE
