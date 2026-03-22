# MODULE CONTRACT: Components / Auth

## Назначение
Компоненты auth-flow пользовательского frontend.
Модуль покрывает login, register, forgot/reset password, impersonation exchange и общие визуальные примитивы для auth-экранов.

## Ответственность
- `auth-fields.tsx` и `auth-shell.tsx` дают общие поля, баннеры и layout auth-экранов.
- `login-screen.tsx` и `register-screen.tsx` управляют form-state, валидацией и переходами через `useAuthStore`.
- `forgot-password-screen.tsx` и `reset-password-screen.tsx` вызывают password-recovery endpoints через `@/lib/api`.
- `impersonate-screen.tsx` обменивает impersonation code на пользовательскую сессию и синхронизирует auth-store.

## Граница (что НЕ делает этот модуль)
- Не хранит source of truth для пользовательской сессии; это задача `@/store/auth-store` и auth session helpers.
- Не рендерит planner screens и не управляет week/month/day state.
- Не определяет transport primitives уровня `api.ts`; использует уже готовый transport layer.
- Не должен встраивать backend auth business rules внутрь JSX-компонентов.

## Структура
| Файл | Роль |
|---|---|
| `auth-fields.tsx` | Переиспользуемые поля, баннеры и password input |
| `auth-shell.tsx` | Общий shell для auth страниц |
| `login-screen.tsx` | Вход пользователя |
| `register-screen.tsx` | Регистрация пользователя |
| `forgot-password-screen.tsx` | Запрос сброса пароля |
| `reset-password-screen.tsx` | Завершение сброса пароля по токену |
| `impersonate-screen.tsx` | Exchange impersonation code в пользовательскую сессию |

## Зависимости
- `@/store/auth-store`
- `@/lib/api`, `@/lib/auth-types`, `@/lib/auth-validation`
- `@/components/ui/icons`
- `next/link`, `next/navigation`
- browser `fetch` для точечного impersonation exchange

## Инварианты
- Login/register flows идут через actions из `useAuthStore`, а не дублируют session persistence локально.
- Forgot/reset password остаются тонким UI-слоем над `@/lib/api`.
- `impersonate-screen.tsx` пока использует выделенный прямой запрос к `/auth/exchange-impersonate`; это поведение должно сохраняться до отдельной унификации transport layer.
- Общие auth fields и shell не должны зависеть от planner-specific store shape.
