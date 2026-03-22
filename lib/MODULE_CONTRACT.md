# MODULE CONTRACT: Frontend Lib

## Назначение
Typed helper-слой пользовательского frontend.
Модуль объединяет transport helpers, мапперы backend payloads, доменные типы, auth/session utilities и навигационно-дата-ориентированные pure functions.

## Ответственность
- `api.ts` - единая fetch-обёртка с `credentials: include`, error normalization и refresh retry.
- `planner-api.ts` - маппинг backend payloads в frontend domain types и payload builders.
- `planner-types.ts`, `auth-types.ts` - transport/domain type contracts.
- `dates.ts`, `week-tasks.ts`, `nav-hrefs.ts`, `utils.ts`, `chart-stats.ts` - вычисления и UI-support utilities.
- `auth-constants.ts`, `auth-validation.ts`, `auth-session.ts` - auth constants, validation и browser session persistence helpers.

## Граница (что НЕ делает этот модуль)
- Не рендерит React components и не импортирует hooks/components.
- Не хранит Zustand store state и не подменяет собой store actions.
- Не должен содержать screen-specific JSX или layout decisions.
- Не является местом для backend business logic; здесь только frontend transport/utility concerns.

## Зависимости
- `fetch` / browser APIs для `api.ts` и `auth-session.ts`
- `date-fns`
- Typed contracts из соседних файлов модуля

## Инварианты
- `api.ts` остаётся единой transport entrypoint для browser-side HTTP вызовов в user frontend.
- Mapping backend -> frontend domain shapes происходит здесь до попадания данных в store/components.
- Большинство utility файлов остаются pure и deterministic; исключения с осознанными side effects - `api.ts` и `auth-session.ts`.
- ISO-week/date/navigation правила должны оставаться согласованными со store и route structure.
