# MODULE CONTRACT: Next.js App Pages

## Назначение
Route-entry слой пользовательского frontend на Next.js App Router.
Модуль связывает URL-структуру приложения, layout shell и screen-level компоненты.

## Ответственность
- Держать root layout, metadata и глобальные стили.
- Описывать route entrypoints для dashboard, week, month, day, auth и profile flows.
- Выполнять thin routing-операции вроде redirect с `/` на `/dashboard`.
- Композировать screen components без переноса в pages тяжёлой предметной логики.

## Граница (что НЕ делает этот модуль)
- Не должен ходить в backend напрямую через raw `fetch` для planner flows.
- Не хранит глобальное состояние приложения; state живёт в Zustand stores.
- Не дублирует mapper/domain logic из `frontend/lib/`.
- Не является местом для крупных reusable UI primitives; они живут в `frontend/components/`.

## Структура
| Файл / путь | Роль |
|---|---|
| `layout.tsx` | Root HTML shell, metadata, viewport, подключение `AppShell` |
| `page.tsx` | Redirect на основной экран `/dashboard` |
| `dashboard/page.tsx` | Entry для dashboard screen |
| `week/[year]/[week]/page.tsx` | Week screen route |
| `month/[year]/[month]/page.tsx` | Month screen route |
| `day/[year]/[month]/[day]/page.tsx` | Day screen route |
| `login/page.tsx`, `register/page.tsx` | Auth entrypoints |
| `forgot-password/page.tsx`, `reset-password/page.tsx` | Password recovery routes |
| `profile/page.tsx` | User profile route |
| `auth/impersonate/page.tsx` | Admin impersonation exchange route |
| `globals.css` | Global styles |

## Зависимости
- `next/navigation`
- `next` metadata/layout primitives
- `@/components/app-shell`
- Screen-level модули из `frontend/components/`

## Инварианты
- Route files остаются тонкими и по возможности делегируют UI в screen components.
- App Router использует `next/navigation`, не `next/router`.
- Компоненты с hooks/client-side интерактивностью явно остаются client components на своём уровне.
- URL-структура в этом модуле должна оставаться согласованной с `frontend/store/nav-store.ts` и `frontend/lib/nav-hrefs.ts`.
