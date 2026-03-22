# MODULE CONTRACT: Components / UI

## Назначение
Базовые переиспользуемые UI-примитивы пользовательского frontend.
Сейчас модуль покрывает иконки и интерактивный блок daily-state.

## Ответственность
- `icons.tsx` экспортирует SVG icon primitives для dashboard/navigation/auth/planner flows.
- `day-state-block.tsx` рендерит editable/readable UI для daily metrics.
- Даёт визуальные building blocks без знания route structure и backend transport.

## Граница (что НЕ делает этот модуль)
- Не обращается к store или backend API напрямую.
- Не владеет planner bundle loading.
- Не знает о страницах и маршрутах приложения.
- Не должен накапливать domain-specific orchestration вне уровня props и локальной интерактивности.

## Структура
| Файл | Роль |
|---|---|
| `icons.tsx` | Набор SVG иконок проекта |
| `day-state-block.tsx` | UI для mood/energy/focus-like daily metrics |

## Зависимости
- `@/lib/planner-types`
- `@/lib/utils`
- React local state для интерактивности

## Инварианты
- `icons.tsx` остаётся pure presentational export surface.
- `day-state-block.tsx` хранит только локальное UI-состояние и общается с внешним миром через props/callbacks.
- Shared UI primitives не должны импортировать store hooks или transport helpers.
