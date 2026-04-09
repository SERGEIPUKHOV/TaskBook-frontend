# MODULE CONTRACT: Components / Calendar

## Назначение
Компоненты календарной поверхности пользователя.
Подмодуль отвечает за preview внешних событий, недельную календарную сетку и UX импорта события в planner, включая suggestion badges и массовый импорт недели.

## Ответственность
- `calendar-screen.tsx` собирает route-level календарный экран, week navigation, toggle предложений и bulk import trigger.
- `calendar-week-grid.tsx` рисует недельную сетку, all-day row, timed events, event details modal и suggestion badges.
- `calendar-bulk-import-modal.tsx` делает batch import выбранных событий недели в planner.
- Запускает import flow `Calendar -> Plan` через store action, не обходя backend calendar service.
- Показывает read-only списки и панели событий там, где нужен компактный preview.

## Граница (что НЕ делает этот модуль)
- Не хранит source of truth для календарных данных; это зона `frontend/store/`.
- Не делает raw `fetch()` и не вызывает planner create endpoints напрямую.
- Не является местом для month/week/day planner business logic вне event import UX.
- Не управляет provider OAuth и persistence напрямую; это orchestration через store/backend.

## Структура
| Файл | Роль |
|---|---|
| `calendar-screen.tsx` | Route-level экран календаря и недельная навигация |
| `calendar-week-grid.tsx` | Главная недельная сетка, modal деталей и import dialog |
| `calendar-bulk-import-modal.tsx` | Batch import modal для событий текущей недели |
| `calendar-event-list.tsx` | Список событий в compact/list presentation |
| `calendar-events-panel.tsx` | Встраиваемая панель событий для planner экранов |

## Зависимости
- `@/store/app-store`
- `@/lib/planner-types`, `@/lib/dates`
- `date-fns`, `date-fns/locale`
- `next/navigation`

## Инварианты
- Импорт события в planner всегда идёт через `importCalendarEventToPlanner`.
- UI может предлагать тип (`task` / `habit`), но не должен принимать это решение автоматически без пользователя.
- Existing planner links должны отражаться в event modal как linked/open state.
- Multi-day и cancelled события не импортируются silently; UI обязан явно показать причину блокировки.
- Bulk import использует те же store actions и backend rules, что и одиночный import; компоненты не делают raw `fetch()`.
