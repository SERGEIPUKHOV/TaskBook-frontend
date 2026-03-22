# MODULE CONTRACT: Store / Slices

## Назначение
Внутренняя декомпозиция planner store на domain-oriented Zustand slices.
Модуль держит typed state/actions для month, week, task, habit и daily-state сценариев и собирается в единый `useAppStore`.

## Ответственность
- `tasks.slice.ts` - task CRUD, reorder, task-day-status transitions и optimistic task updates.
- `habits.slice.ts` - habits, habit logs и month reload после изменений.
- `weeks.slice.ts` - week bundle loading, weekly summary и reflection entries.
- `months.slice.ts` - month bundle loading и month-plan edits.
- `days.slice.ts` - daily metrics updates и day-level save state.
- `shared.ts` - общие store types, slice interfaces, key parsers и reusable helpers.

## Граница (что НЕ делает этот модуль)
- Не рендерит UI и не содержит JSX.
- Не использует raw `fetch()`; HTTP идёт через `@/lib/api`, а mapping helpers через `@/lib/planner-api`.
- Не хранит auth session и navigation context; это отдельные store modules.
- Не должен дублировать backend business rules за пределами client-side state orchestration.

## Структура
| Файл | Роль |
|---|---|
| `tasks.slice.ts` | Задачи недели, reorder и day-status actions |
| `habits.slice.ts` | Привычки и completion logs |
| `weeks.slice.ts` | Week bundle, focus/reward и reflection |
| `months.slice.ts` | Month bundle и month plan |
| `days.slice.ts` | Daily metrics и save state |
| `shared.ts` | Typed slice contracts, helper types и key parsing |
| `__tests__/tasks.slice.test.ts` | Unit coverage для task slice optimistic flows |

## Зависимости
- `@/lib/api`
- `@/lib/planner-api`
- `@/lib/planner-types`
- `@/lib/dates`
- `@/lib/week-tasks`
- `@/lib/utils`
- `zustand` type surface через `StateCreator`

## Инварианты
- Каждый slice экспортирует typed `create*Slice` factory и работает поверх общего `AppStore`.
- Planner keys остаются нормализованными (`YYYY-MM`, `YYYY-Www`) через shared helpers.
- Optimistic updates обязаны иметь rollback path или последующий reconcile через API/store reload.
- `shared.ts` остаётся единой точкой общих store-type и parser utilities для slices.
