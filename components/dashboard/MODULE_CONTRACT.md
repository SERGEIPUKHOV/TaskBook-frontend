# MODULE CONTRACT: Components / Dashboard

## Назначение
Компоненты главного dashboard-экрана TaskBook.
Модуль показывает summary по текущей неделе и месяцу и даёт быстрые переходы к planner views.

## Ответственность
- `dashboard-screen.tsx` загружает summary через store и композирует главный экран.
- `focus-block.tsx` рендерит компактные блоки weekly summary.
- `month-states-panel.tsx` показывает динамику daily metrics и месячную статистику.

## Граница (что НЕ делает этот модуль)
- Не делает прямых HTTP вызовов в backend.
- Не владеет auth/session state.
- Не дублирует логику week/day/month editor flows.
- Не должен становиться вторым store или местом для domain mutations вне store actions.

## Структура
| Файл | Роль |
|---|---|
| `dashboard-screen.tsx` | Главная композиция dashboard и ссылки в planner |
| `focus-block.tsx` | Визуальный блок для focus/reward summary |
| `month-states-panel.tsx` | Панель месячных метрик и графиков |

## Зависимости
- `@/store/app-store`
- `@/lib/dates`, `@/lib/week-tasks`, `@/lib/chart-stats`, `@/lib/planner-types`
- `@/components/month/state-chart`
- `@/components/ui/icons`
- `next/link`

## Инварианты
- Источник данных для dashboard остаётся в `useAppStore`.
- Все вычисления month/day stats в UI остаются производными от уже загруженных store данных и helper-функций из `@/lib/*`.
- Dashboard остаётся read-heavy поверхностью: переходы разрешены, но planner mutations не должны обходить store actions.
