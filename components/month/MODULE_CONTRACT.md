# MODULE CONTRACT: Components / Month

## Назначение
Компоненты месячного planner view.
Модуль покрывает month screen, month plan, habit editing и визуализацию monthly state metrics.

## Ответственность
- `month-screen.tsx` загружает месяц и собирает page-level композицию.
- `month-plan.tsx` рендерит цели, заметки и summary месяца.
- `month-habit-list.tsx` управляет habit list и локальными form/modal interaction state.
- `state-chart.tsx` и `state-chart-impl.tsx` показывают графики дневных метрик месяца.

## Граница (что НЕ делает этот модуль)
- Не делает прямых HTTP вызовов.
- Не хранит source of truth для planner state; опирается на `useAppStore`.
- Не дублирует date/chart helper-логику из `@/lib/*`.
- Не должен брать на себя общую navigation orchestration вне текущего month screen.

## Структура
| Файл | Роль |
|---|---|
| `month-screen.tsx` | Route-level композиция месяца и навигация по соседним месяцам |
| `month-plan.tsx` | План месяца, цели и вспомогательные секции |
| `month-habit-list.tsx` | Управление привычками месяца |
| `state-chart.tsx` | Lazy wrapper над графиком |
| `state-chart-impl.tsx` | Реализация графика monthly state metrics |

## Зависимости
- `@/store/app-store`
- `@/store/nav-store`
- `@/lib/dates`, `@/lib/planner-types`, `@/lib/utils`
- `@/components/ui/icons`
- `next/link`, `react-dom/createPortal`

## Инварианты
- Все planner mutations идут через store actions.
- `state-chart.tsx` остаётся тонким lazy boundary над тяжёлой реализацией графика.
- Порталы и локальные формы внутри `month-habit-list.tsx` не должны превращаться в отдельный источник domain state.
- Month navigation использует вычисления из `@/lib/dates`, а не ручную работу с датами внутри компонентов.
