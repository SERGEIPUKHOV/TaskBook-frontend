# MODULE CONTRACT: Components / Profile

## Назначение
Компоненты профиля пользователя.
Модуль показывает данные аккаунта и покрывает password change, logout и delete-account flow.

## Ответственность
- `profile-screen.tsx` загружает и рендерит профиль текущего пользователя.
- Синхронизирует profile snapshot через `useAuthStore`.
- Выполняет password change и delete-account запросы через `@/lib/api`.
- Управляет локальным confirmation flow для опасных действий и logout UX.

## Граница (что НЕ делает этот модуль)
- Не является transport-layer для auth/session API.
- Не хранит долгоживущую auth session вне `useAuthStore`.
- Не рендерит login/register/forgot/reset screens; это зона `components/auth`.
- Не должен брать на себя planner state или dashboard/month/day responsibilities.

## Структура
| Файл | Роль |
|---|---|
| `profile-screen.tsx` | Экран профиля, смена пароля, logout и удаление аккаунта |

## Зависимости
- `@/store/auth-store`
- `@/lib/api`, `@/lib/auth-types`, `@/lib/auth-validation`, `@/lib/utils`
- `@/components/auth/auth-fields`
- `next/navigation`
- `date-fns`

## Инварианты
- Загрузка профиля начинается с `useAuthStore.syncUser()` и сохраняет совместимость с текущей auth session model.
- `401` при profile actions приводит к очистке сессии и редиректу на `/login`.
- Password change и delete-account остаются прямыми вызовами transport layer через `@/lib/api`.
- Локальные modal/form states не должны становиться заменой состоянию пользователя из auth-store.
