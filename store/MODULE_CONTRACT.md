# MODULE CONTRACT: Frontend Store

## Назначение
Клиентское состояние TaskBook frontend.
Store слой хранит planner data, auth session snapshot и навигационный контекст между экранами.

## Ответственность
- `app-store.ts`: barrel export и публичная точка входа `useAppStore` для planner state.
- `store/slices/*`: внутренняя декомпозиция planner store по month/week/task/habit/day concerns; имеет вложенный `store/slices/MODULE_CONTRACT.md`.
- `auth-store.ts`: пользовательская сессия и auth-related actions.
- `nav-store.ts`: last visited week/month/day для удобной навигации.
- Инкапсулировать взаимодействие UI с backend API через store actions.

## Граница (что НЕ делает этот модуль)
- Не рендерит JSX и не отвечает за layout/screens.
- Не содержит raw JWT storage в local state.
- Не должен дублировать API маршруты по компонентам.
- Не является заменой domain utility модулям из `frontend/lib/`.

## Структура
| Файл | Роль |
|---|---|
| `app-store.ts` | Barrel export, собирающий итоговый `useAppStore` |
| `slices/MODULE_CONTRACT.md` | Контракт внутреннего slice submodule |
| `slices/months.slice.ts` | Month cache и month-plan edits |
| `slices/weeks.slice.ts` | Week cache и reflection edits |
| `slices/tasks.slice.ts` | Task CRUD, ordering и day-status actions |
| `slices/habits.slice.ts` | Habit CRUD, completion logs и reload |
| `slices/days.slice.ts` | Daily metrics updates |
| `slices/shared.ts` | Общие store types и key parsers |
| `auth-store.ts` | Auth user snapshot, hydration, login/register/logout/sync |
| `nav-store.ts` | Persisted navigation context |

## Зависимости
- `zustand`
- `zustand/middleware`
- `@/lib/api`
- `@/lib/dates`
- `@/lib/planner-api`
- `@/lib/planner-types`
- `@/lib/week-tasks`
- `@/lib/utils`

## Инварианты
- `useAppStore` - source of truth для planner state на клиенте.
- `store/slices/` остаётся основным planner submodule и имеет собственный детализированный контракт.
- Planner keys нормализованы: месяц как `YYYY-MM`, неделя как `YYYY-Www`.
- Компоненты не должны ходить в API напрямую для planner flows; они вызывают store actions.
- `auth-store` хранит user snapshot, но не хранит raw access/refresh tokens.
- `nav-store` хранит только navigation context и не должен разрастаться в общий app store.
- Все store modules остаются client-side (`"use client"`).

## Экспортируемый интерфейс
- `useAppStore`
- `useAuthStore`
- `useNavStore`

## Критичные точки изменения
- Обратная совместимость `useAppStore` важна для week/day/month screens.
- Любое изменение key format или shape store state требует синхронной правки компонентов и mapping helpers.
