# MODULE CONTRACT: React Components

## Назначение
Screen-level и shared UI компоненты пользовательского frontend.
Модуль группирует визуальные части dashboard/week/month/day/auth/profile/navigation flows и общий shell.

## Ответственность
- Рендерить screen components для weekly, monthly, daily, dashboard, auth и profile сценариев.
- Держать shared layout/navigation primitives (`app-shell`, sidebar, mobile nav, icons, day-state blocks).
- Композировать данные из store selectors и typed props в пользовательский интерфейс.
- Изолировать богатую weekly UI-поверхность в отдельном подмодуле `components/week/`.

## Граница (что НЕ делает этот модуль)
- Не должен ходить в backend напрямую через `@/lib/api`.
- Не хранит source of truth для server/client domain state; это задача `frontend/store/`.
- Не дублирует mapping и date/nav helpers из `frontend/lib/`.
- Не должен превращаться в склад несвязанных side effects вне UI-поведения.

## Структура
| Путь | Роль |
|---|---|
| `app-shell.tsx` | Общий shell и композиция верхнего уровня |
| `week/` | Критичный weekly UI; имеет свой вложенный `MODULE_CONTRACT.md` |
| `month/` | Month plan, habit list, charts |
| `day/` | Day view, tasks, habits, reflection, navigator |
| `dashboard/` | Dashboard panels и summary widgets |
| `auth/` | Login/register/forgot/reset/impersonate screens и формы |
| `profile/` | Profile screen |
| `navigation/` | Sidebar и mobile navigation |
| `ui/` | Shared visual primitives |

## Зависимости
- `@/store/*`
- `@/lib/*`
- `next/link` и другие Next/React primitives

## Инварианты
- Planner mutations идут через store actions, не через direct API calls из компонентов.
- Weekly подмодуль остаётся наиболее чувствительным к изменениям store shape и имеет собственный детализированный контракт.
- Shared UI primitives не должны становиться местом для domain-specific planner logic.
- Компоненты могут быть client components там, где используются hooks, drag/drop и интерактивность.
