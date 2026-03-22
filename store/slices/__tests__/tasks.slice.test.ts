import { beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import type { WeekData, WeekTask } from "@/lib/planner-types";
import type { AppStore } from "@/store/slices/shared";
import { createTasksSlice } from "@/store/slices/tasks.slice";

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
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
    weekEntryMeta: {},
    weekLoadStates: { [weekKey]: "ready" },
    weeks: { [weekKey]: initialWeek },
    ensureWeek: noop,
    updateWeekDayNote: noop,
    updateWeekText: noop,
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

  it("removes persisted tasks and calls delete endpoint", () => {
    const { useStore, weekKey } = createStore(buildWeek({ tasks: [buildTask()] }));

    useStore.getState().deleteTask(weekKey, "task-1");

    expect(apiMock.delete).toHaveBeenCalledWith("/tasks/task-1");
    expect(useStore.getState().weeks[weekKey]?.tasks).toEqual([]);
  });

  it("debounces updateTask persistence and clamps numeric values", async () => {
    vi.useFakeTimers();
    const { useStore, weekKey } = createStore(buildWeek({ tasks: [buildTask()] }));
    apiMock.patch.mockResolvedValue(undefined);

    useStore.getState().updateTask(weekKey, "task-1", "ti", -15);
    expect(useStore.getState().weeks[weekKey]?.tasks[0]?.ti).toBe(0);

    await vi.runAllTimersAsync();

    expect(apiMock.patch).toHaveBeenCalledWith("/tasks/task-1", {
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
