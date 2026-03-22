# MODULE CONTRACT: Components / Day

## Назначение
Компоненты дневного planner view.
Модуль отвечает за отображение одного дня, его задач, привычек, рефлексии и daily-state.

## Ответственность
- `day-screen.tsx` собирает day view из route params и store data.
- `day-navigator.tsx` строит переходы между соседними днями.
- `day-task-list.tsx` показывает задачи дня и их состояние в контексте недели.
- `day-habit-list.tsx` и `day-reflection.tsx` отображают привычки и дневные записи.

## Граница (что НЕ делает этот модуль)
- Не делает прямых HTTP вызовов.
- Не владеет глобальным navigation state; использует `@/store/nav-store`.
- Не агрегирует week/month bundles самостоятельно; эти данные приходят из store.
- Не должен дублировать date/week helper-логику из `@/lib/*`.

## Структура
| Файл | Роль |
|---|---|
| `day-screen.tsx` | Главная композиция дневного экрана |
| `day-navigator.tsx` | Переход к соседним дням |
| `day-task-list.tsx` | Задачи выбранного дня |
| `day-habit-list.tsx` | Привычки выбранного дня |
| `day-reflection.tsx` | Ключевые события и благодарности за день |

## Зависимости
- `@/store/app-store`
- `@/store/nav-store`
- `@/lib/dates`, `@/lib/week-tasks`, `@/lib/planner-types`, `@/lib/utils`
- `@/components/ui/day-state-block`
- `next/link`

## Инварианты
- `day-screen.tsx` нормализует входные `year/month/day` в `dayKey`, `weekKey` и `monthKey` до рендера дочерних частей.
- Все day mutations идут через store actions.
- `day-navigator.tsx` отвечает только за вычисление соседних ссылок и не мутирует store.
- Модуль ожидает согласованные ISO week/day keys из `@/lib/dates`.
