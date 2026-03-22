# MODULE CONTRACT: Week Screen Components

## Назначение
Набор компонентов недельного экрана TaskBook.
Модуль отвечает за отображение недельного разворота, задач, рефлексии и ежедневных метрик в пределах одной недели.

## Ответственность
- Композировать основной week screen по route params `year` и `week`.
- Показывать и редактировать недельные задачи.
- Показывать weekly summary (`focus`, `reward`).
- Показывать weekly reflection (`key events`, `gratitudes`).
- Показывать daily metrics panel для дней недели.

## Граница (что НЕ делает этот модуль)
- Не должен напрямую работать с `@/lib/api`.
- Не должен управлять auth/session/navigation persistence кроме вызова store actions.
- Не должен содержать month/day business logic вне локального UI поведения.
- Не должен становиться общим складом shared UI для всего приложения.

## Структура
| Файл | Роль |
|---|---|
| `week-screen.tsx` | Route-level composition и загрузка недели |
| `week-planner-board.tsx` | Главная интерактивная доска задач недели |
| `week-summary.tsx` | Фокус недели и награда |
| `week-state-panel.tsx` | Таблица ежедневных метрик состояния |
| `week-reflection.tsx` | События и благодарности по дням |
| `task-grid.tsx` | Альтернативное/вспомогательное представление задач недели |

## Зависимости
- `@/store/app-store`
- `@/store/nav-store`
- `@/lib/dates`
- `@/lib/week-tasks`
- `@/lib/planner-types`
- `@/lib/utils`
- `@/components/ui/icons`
- `next/link`

## Инварианты
- `WeekScreen` получает `year` и `week`, вызывает `ensureWeek`, затем рендерит дочерние части из нормализованного `WeekData`.
- Мутации выполняются через store actions, не через direct API calls.
- Компоненты модуля ожидают ISO-week compatible ключи и даты из `@/lib/dates`.
- Все файлы модуля остаются client components.
- `week-planner-board.tsx` и `week-state-panel.tsx` являются самыми чувствительными к изменению shape store state.

## Экспортируемый интерфейс
- `WeekScreen`
- `WeekPlannerBoard`
- `WeekSummary`
- `WeekStatePanel`
- `WeekReflection`
- `TaskGrid`

## Критичные точки изменения
- Изменение props контракта `WeekScreen` или `WeekData` затрагивает весь weekly flow.
- Изменение store interaction внутри week components должно проверяться на экранах week/day/month из-за общего состояния.
