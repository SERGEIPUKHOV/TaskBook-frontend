# MODULE CONTRACT: Components / Navigation

## Назначение
Навигационные компоненты пользовательского frontend.
Модуль отвечает за sidebar/mobile navigation и маршрутизацию между dashboard, week, month, day и profile flows.

## Ответственность
- `sidebar.tsx` рендерит основную desktop navigation, user actions и period switches.
- `mobile-nav.tsx` рендерит упрощённую мобильную навигацию.
- Вычисляет context-aware hrefs через `@/lib/nav-hrefs`.
- Вызывает navigation/auth actions там, где это нужно для UX-переходов и logout.

## Граница (что НЕ делает этот модуль)
- Не рендерит planner content сам по себе.
- Не делает прямых backend HTTP вызовов.
- Не хранит source of truth для navigation или auth state.
- Не должен содержать week/month/day business logic вне вычисления ссылок и текущего контекста.

## Структура
| Файл | Роль |
|---|---|
| `sidebar.tsx` | Основной desktop sidebar с user actions |
| `mobile-nav.tsx` | Нижняя мобильная навигация |

## Зависимости
- `@/store/nav-store`
- `@/store/auth-store`
- `@/lib/nav-hrefs`, `@/lib/dates`, `@/lib/utils`
- `@/components/ui/icons`
- `next/link`, `next/navigation`

## Инварианты
- Href generation идёт через `@/lib/nav-hrefs`, а не через локально дублированные route rules.
- Navigation components могут вызывать store actions (`setContext`, logout), но не становятся источником planner data.
- Sidebar и mobile-nav должны оставаться согласованными по ключевым маршрутным сценариям.
