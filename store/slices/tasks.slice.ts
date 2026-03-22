import { api } from "@/lib/api";
import { getAdjacentWeek, getWeekKey } from "@/lib/dates";
import { mapApiTaskToWeekTask, type ApiTask } from "@/lib/planner-api";
import { cycleTaskAtDay, getWeekDayKeys } from "@/lib/week-tasks";
import { arrayMove, createId } from "@/lib/utils";

import type { AppSliceCreator, TasksSlice } from "./shared";
import { parseWeekKey, touchSave, type TaskField } from "./shared";

const taskSaveTimers: Record<string, number | undefined> = {};

async function persistTask(get: Parameters<AppSliceCreator<TasksSlice>>[1], key: string, taskId: string) {
  const week = get().weeks[key];

  if (!week || taskId.startsWith("temp-")) {
    return;
  }

  const task = week.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  const dayKeys = getWeekDayKeys(week.startDate);
  const startDayIndex = Math.max(0, dayKeys.indexOf(task.startDayKey));

  try {
    await api.patch(`/tasks/${task.id}`, {
      is_priority: task.isPriority,
      start_day: startDayIndex + 1,
      time_actual: task.fa,
      time_planned: task.ti,
      title: task.title,
    });
  } catch {
    // Keep optimistic state locally; the next successful fetch will reconcile from the API.
  }
}

async function syncTaskOrder(get: Parameters<AppSliceCreator<TasksSlice>>[1], key: string) {
  const parsed = parseWeekKey(key);
  const week = get().weeks[key];

  if (!parsed || !week || week.tasks.some((task) => task.id.startsWith("temp-"))) {
    return;
  }

  try {
    await api.post(`/weeks/${parsed.year}/${parsed.week}/tasks/reorder`, {
      task_ids: week.tasks.map((task) => task.id),
    });
  } catch {
    // Keep optimistic state locally; the next successful fetch will reconcile from the API.
  }
}

// BLOCK-START: TASKS_SLICE_MODULE
// Description: Week task CRUD, ordering, and day-status actions backed by weekly bundles.
export const createTasksSlice: AppSliceCreator<TasksSlice> = (set, get) => ({
  addTask: (key) =>
    set((state) => {
      const current = state.weeks[key];
      const parsed = parseWeekKey(key);

      if (!current || !parsed) {
        return state;
      }

      const tempId = createId(`temp-task-${key}`);
      const tempTask = {
        id: tempId,
        title: "",
        ti: 0,
        fa: 0,
        isPriority: false,
        startDayKey: current.startDate,
        statusTrail: [],
        carriedFromTaskId: null,
      };

      void api
        .post<ApiTask>(`/weeks/${parsed.year}/${parsed.week}/tasks`, {
          is_priority: false,
          start_day: 1,
          time_actual: 0,
          time_planned: 0,
          title: "",
        })
        .then((task) => {
          set((innerState) => {
            const week = innerState.weeks[key];
            if (!week) {
              return innerState;
            }

            return {
              weeks: {
                ...innerState.weeks,
                [key]: {
                  ...week,
                  tasks: week.tasks.map((item) =>
                    item.id === tempId ? mapApiTaskToWeekTask(task, week.startDate) : item,
                  ),
                },
              },
            };
          });
        })
        .catch(() => {
          set((innerState) => {
            const week = innerState.weeks[key];
            if (!week) {
              return innerState;
            }

            return {
              weeks: {
                ...innerState.weeks,
                [key]: {
                  ...week,
                  tasks: week.tasks.filter((item) => item.id !== tempId),
                },
              },
            };
          });
        });

      return {
        ...touchSave(),
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: [...current.tasks, tempTask],
          },
        },
      };
    }),

  deleteTask: (key, taskId) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current) {
        return state;
      }

      if (!taskId.startsWith("temp-")) {
        void api.delete(`/tasks/${taskId}`);
      }

      return {
        ...touchSave(),
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: current.tasks.filter((task) => task.id !== taskId),
          },
        },
      };
    }),

  updateTask: (key, taskId, field, value) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current) {
        return state;
      }

      window.clearTimeout(taskSaveTimers[taskId]);
      taskSaveTimers[taskId] = window.setTimeout(() => {
        void persistTask(get, key, taskId);
      }, 300);

      return {
        ...touchSave(),
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: current.tasks.map((task) => {
              if (task.id !== taskId) {
                return task;
              }

              if (field === "title" && typeof value === "string") {
                return { ...task, title: value };
              }

              if ((field === "ti" || field === "fa") && typeof value === "number") {
                return { ...task, [field]: Math.max(0, value) };
              }

              if (field === "isPriority" && typeof value === "boolean") {
                return { ...task, isPriority: value };
              }

              return task;
            }),
          },
        },
      };
    }),

  cycleTaskStatus: (key, taskId, dayKey) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current) {
        return state;
      }

      const dayKeys = getWeekDayKeys(current.startDate);
      const currentTask = current.tasks.find((task) => task.id === taskId);
      if (!currentTask) {
        return state;
      }

      const nextTask = cycleTaskAtDay(currentTask, dayKey, dayKeys);
      const relativeIndex = dayKeys.indexOf(dayKey) - dayKeys.indexOf(currentTask.startDayKey);
      const prevStatus = relativeIndex >= 0 ? currentTask.statusTrail[relativeIndex] ?? "planned" : "planned";
      const nextStatus = relativeIndex >= 0 ? nextTask.statusTrail[relativeIndex] ?? "planned" : "planned";

      if (!taskId.startsWith("temp-")) {
        if (nextStatus === "planned") {
          void api.delete(`/tasks/${taskId}/status/${dayKey}`);
        } else {
          void api.put(`/tasks/${taskId}/status/${dayKey}`, { status: nextStatus });
        }
      }

      const isSunday = dayKey === dayKeys[6];
      const affectsCarryOver = isSunday && (nextStatus === "moved" || prevStatus === "moved");
      let nextWeekLoadStates = state.weekLoadStates;

      if (affectsCarryOver) {
        const parsed = parseWeekKey(key);
        if (parsed) {
          const nextRef = getAdjacentWeek(parsed.year, parsed.week, 1);
          const nextKey = getWeekKey(nextRef.year, nextRef.week);
          nextWeekLoadStates = {
            ...state.weekLoadStates,
            [nextKey]: "idle",
          };
        }
      }

      return {
        ...touchSave(),
        weekLoadStates: nextWeekLoadStates,
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: current.tasks.map((task) => (task.id === taskId ? nextTask : task)),
          },
        },
      };
    }),

  setTaskStartDay: (key, taskId, dayKey) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current) {
        return state;
      }

      if (!taskId.startsWith("temp-")) {
        const nextStartDay = Math.max(1, getWeekDayKeys(current.startDate).indexOf(dayKey) + 1);
        void api.patch(`/tasks/${taskId}`, { start_day: nextStartDay });
      }

      return {
        ...touchSave(),
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === taskId ? { ...task, startDayKey: dayKey, statusTrail: [] } : task,
            ),
          },
        },
      };
    }),

  moveTask: (key, activeId, targetId) =>
    set((state) => {
      const current = state.weeks[key];

      if (!current || activeId === targetId) {
        return state;
      }

      const fromIndex = current.tasks.findIndex((task) => task.id === activeId);
      const toIndex = current.tasks.findIndex((task) => task.id === targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return state;
      }

      queueMicrotask(() => {
        void syncTaskOrder(get, key);
      });

      return {
        ...touchSave(),
        weeks: {
          ...state.weeks,
          [key]: {
            ...current,
            tasks: arrayMove(current.tasks, fromIndex, toIndex),
          },
        },
      };
    }),
});
// BLOCK-END: TASKS_SLICE_MODULE
