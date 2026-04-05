"use client";

export function CalendarScreen() {
  return (
    <div className="space-y-6">
      <header className="rounded-[32px] border border-line bg-paper/70 px-4 py-4 shadow-paper sm:px-5 sm:py-5">
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Интеграции</div>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Календарь</h1>
      </header>

      <p className="px-1 text-sm text-muted">
        Подключите внешние календари, чтобы видеть события рядом с задачами и привычками.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="paper-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-canvas">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <span className="rounded-full bg-line px-2.5 py-1 text-xs font-medium text-muted">Скоро</span>
          </div>
          <div className="mt-4">
            <div className="text-base font-semibold text-ink">Google Calendar</div>
            <div className="mt-1 text-sm text-muted">
              Синхронизация событий из Google Календаря в дневной и недельный разворот.
            </div>
          </div>
          <button
            className="mt-5 w-full cursor-not-allowed rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm font-medium text-muted"
            disabled
            type="button"
          >
            Подключить
          </button>
        </article>

        <article className="paper-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-canvas">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <rect x="2" y="4" width="20" height="18" rx="4" fill="#FF3B30" />
                <rect x="2" y="4" width="20" height="6" rx="2" fill="#FF6B6B" />
                <rect x="2" y="8" width="20" height="2" fill="#FF3B30" />
                <circle cx="7" cy="17" r="1.2" fill="white" />
                <circle cx="12" cy="17" r="1.2" fill="white" />
                <circle cx="17" cy="17" r="1.2" fill="white" />
                <circle cx="7" cy="13" r="1.2" fill="white" />
                <circle cx="12" cy="13" r="1.2" fill="white" />
                <circle cx="17" cy="13" r="1.2" fill="white" />
                <rect x="6" y="2" width="2" height="4" rx="1" fill="#555" />
                <rect x="16" y="2" width="2" height="4" rx="1" fill="#555" />
              </svg>
            </div>
            <span className="rounded-full bg-line px-2.5 py-1 text-xs font-medium text-muted">Скоро</span>
          </div>
          <div className="mt-4">
            <div className="text-base font-semibold text-ink">Apple Calendar</div>
            <div className="mt-1 text-sm text-muted">
              Импорт событий через CalDAV или файл .ics из Apple Календаря.
            </div>
          </div>
          <button
            className="mt-5 w-full cursor-not-allowed rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm font-medium text-muted"
            disabled
            type="button"
          >
            Подключить
          </button>
        </article>
      </div>
    </div>
  );
}
