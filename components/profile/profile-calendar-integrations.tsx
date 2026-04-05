"use client";

import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { CalendarSyncIcon } from "@/components/ui/icons";
import type { CalendarConnection } from "@/lib/planner-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type ProfileCalendarIntegrationsProps = {
  googleMessage?: string | null;
  googleProvider?: string | null;
  googleStatus?: string | null;
};

function providerLabel(provider: CalendarConnection["provider"]): string {
  return provider === "google" ? "Google Calendar" : "Apple Calendar";
}

function statusLabel(connection: CalendarConnection): string {
  return connection.status === "error" ? "Ошибка синка" : "Подключено";
}

function statusClassName(connection: CalendarConnection): string {
  return connection.status === "error"
    ? "border-danger/30 bg-danger/10 text-danger"
    : "border-accent/30 bg-accent/10 text-accent";
}

function formatConnectionDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return format(parseISO(value), "d MMM, HH:mm", { locale: ru });
}

function accessRoleLabel(accessRole: string | null): string | null {
  if (accessRole === "owner") {
    return "owner";
  }
  if (accessRole === "writer") {
    return "writer";
  }
  if (accessRole === "reader") {
    return "reader";
  }
  return accessRole;
}

function ProviderCard({
  description,
  title,
  children,
}: {
  description: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-line bg-canvas/50 p-5 sm:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-ink shadow-paper">
        <CalendarSyncIcon className="h-6 w-6" />
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold text-ink">{title}</div>
        <div className="mt-1 text-sm leading-6 text-muted">{description}</div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function ProfileCalendarIntegrations({
  googleMessage = null,
  googleProvider = null,
  googleStatus = null,
}: ProfileCalendarIntegrationsProps) {
  const [googlePending, setGooglePending] = useState(false);
  const [googleSelectionPending, setGoogleSelectionPending] = useState(false);
  const [googleSyncPending, setGoogleSyncPending] = useState(false);
  const [googleDisconnectPending, setGoogleDisconnectPending] = useState(false);
  const [selectedGoogleCalendarIds, setSelectedGoogleCalendarIds] = useState<string[]>([]);
  const [applePending, setApplePending] = useState(false);
  const [appleLabel, setAppleLabel] = useState("");
  const [appleUrl, setAppleUrl] = useState("");
  const [screenError, setScreenError] = useState<string | null>(null);

  const fetchCalendarConnections = useAppStore((state) => state.fetchCalendarConnections);
  const fetchGoogleCalendarOptions = useAppStore((state) => state.fetchGoogleCalendarOptions);
  const startGoogleCalendarConnect = useAppStore((state) => state.startGoogleCalendarConnect);
  const saveGoogleCalendarSelections = useAppStore((state) => state.saveGoogleCalendarSelections);
  const syncAllGoogleCalendars = useAppStore((state) => state.syncAllGoogleCalendars);
  const disconnectGoogleCalendarAccount = useAppStore((state) => state.disconnectGoogleCalendarAccount);
  const connectAppleCalendar = useAppStore((state) => state.connectAppleCalendar);
  const syncCalendarConnection = useAppStore((state) => state.syncCalendarConnection);
  const deleteCalendarConnection = useAppStore((state) => state.deleteCalendarConnection);
  const calendarConnections = useAppStore((state) => state.calendarConnections);
  const calendarConnectionsStatus = useAppStore((state) => state.calendarConnectionsStatus);
  const googleCalendarOptions = useAppStore((state) => state.googleCalendarOptions);
  const googleCalendarOptionsStatus = useAppStore((state) => state.googleCalendarOptionsStatus);
  const googleCalendarConnected = useAppStore((state) => state.googleCalendarConnected);
  const googleCalendarAccountLabel = useAppStore((state) => state.googleCalendarAccountLabel);

  useEffect(() => {
    void fetchCalendarConnections();
    void fetchGoogleCalendarOptions();
  }, [fetchCalendarConnections, fetchGoogleCalendarOptions]);

  useEffect(() => {
    setSelectedGoogleCalendarIds(
      googleCalendarOptions.filter((option) => option.selected).map((option) => option.id),
    );
  }, [googleCalendarOptions]);

  useEffect(() => {
    if (googleProvider === "google" && googleStatus === "connected") {
      void fetchGoogleCalendarOptions(true);
      void fetchCalendarConnections(true);
    }
  }, [fetchCalendarConnections, fetchGoogleCalendarOptions, googleProvider, googleStatus]);

  const googleConnections = calendarConnections.filter((connection) => connection.provider === "google");
  const latestGoogleSync = googleConnections.reduce<string | null>((latest, connection) => {
    if (!connection.lastSyncedAt) {
      return latest;
    }
    if (!latest || connection.lastSyncedAt > latest) {
      return connection.lastSyncedAt;
    }
    return latest;
  }, null);
  const selectedGoogleSet = new Set(selectedGoogleCalendarIds);
  const savedGoogleSet = new Set(googleCalendarOptions.filter((option) => option.selected).map((option) => option.id));
  const googleSelectionChanged =
    selectedGoogleSet.size !== savedGoogleSet.size ||
    [...selectedGoogleSet].some((calendarId) => !savedGoogleSet.has(calendarId));
  const bannerTone = googleStatus === "error" ? "danger" : "success";

  async function handleGoogleConnect() {
    if (typeof window === "undefined") {
      return;
    }

    setScreenError(null);
    setGooglePending(true);
    try {
      const authorizeUrl = await startGoogleCalendarConnect(`${window.location.origin}/profile`);
      window.location.assign(authorizeUrl);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось запустить Google OAuth");
      setGooglePending(false);
    }
  }

  async function handleSaveGoogleSelections() {
    setScreenError(null);
    setGoogleSelectionPending(true);
    try {
      await saveGoogleCalendarSelections(selectedGoogleCalendarIds);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось сохранить выбор Google calendars");
    } finally {
      setGoogleSelectionPending(false);
    }
  }

  async function handleSyncAllGoogle() {
    setScreenError(null);
    setGoogleSyncPending(true);
    try {
      await syncAllGoogleCalendars();
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось синхронизировать Google calendars");
    } finally {
      setGoogleSyncPending(false);
    }
  }

  async function handleDisconnectGoogleAccount() {
    setScreenError(null);
    setGoogleDisconnectPending(true);
    try {
      await disconnectGoogleCalendarAccount();
      setSelectedGoogleCalendarIds([]);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось отключить Google Calendar");
    } finally {
      setGoogleDisconnectPending(false);
    }
  }

  async function handleAppleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appleUrl.trim()) {
      setScreenError("Добавь ссылку на ICS feed для Apple Calendar.");
      return;
    }

    setScreenError(null);
    setApplePending(true);
    try {
      await connectAppleCalendar(appleUrl.trim(), appleLabel.trim());
      setAppleLabel("");
      setAppleUrl("");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось подключить Apple ICS feed");
    } finally {
      setApplePending(false);
    }
  }

  async function handleSync(connectionId: string) {
    setScreenError(null);
    try {
      await syncCalendarConnection(connectionId);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось синхронизировать календарь");
    }
  }

  async function handleDelete(connectionId: string) {
    setScreenError(null);
    try {
      await deleteCalendarConnection(connectionId);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось отключить календарь");
    }
  }

  return (
    <div className="space-y-5">
      {googleProvider === "google" && googleStatus ? (
        <div
          className={cn(
            "rounded-[24px] border px-4 py-4 text-sm leading-6",
            bannerTone === "danger" ? "border-danger/30 bg-danger/10 text-danger" : "border-accent/30 bg-accent/10 text-accent",
          )}
        >
          {googleStatus === "connected"
            ? "Google Calendar успешно подключён. Теперь можно выбрать, какие именно календари синхронизировать."
            : googleMessage || "Google Calendar не удалось подключить. Проверь настройки OAuth и повтори попытку."}
        </div>
      ) : null}

      {screenError ? (
        <div className="rounded-[24px] border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
          {screenError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ProviderCard
          description="Read-only подключение через Google OAuth. После авторизации можно выбрать несколько календарей этого аккаунта и держать их в авто-синке."
          title="Google Calendar"
        >
          <div className="space-y-4">
            <button
              className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
              disabled={googlePending}
              onClick={() => {
                void handleGoogleConnect();
              }}
              type="button"
            >
              {googlePending ? "Открываем авторизацию..." : googleCalendarConnected ? "Переподключить Google" : "Подключить Google"}
            </button>

            {googleCalendarConnected ? (
              <div className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm leading-6 text-muted">
                <div className="text-sm font-semibold text-ink">{googleCalendarAccountLabel || "Google account подключён"}</div>
                <div className="mt-2">
                  {latestGoogleSync ? `Последняя синхронизация: ${formatConnectionDate(latestGoogleSync)}` : "Синк ещё не запускался"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                    disabled={googleSyncPending || googleConnections.length === 0}
                    onClick={() => {
                      void handleSyncAllGoogle();
                    }}
                    type="button"
                  >
                    {googleSyncPending ? "Синхронизируем..." : "Синхронизировать все"}
                  </button>
                  <button
                    className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60"
                    disabled={googleDisconnectPending}
                    onClick={() => {
                      void handleDisconnectGoogleAccount();
                    }}
                    type="button"
                  >
                    {googleDisconnectPending ? "Отключаем..." : "Отключить Google"}
                  </button>
                </div>
              </div>
            ) : null}

            {googleCalendarConnected ? (
              <div className="space-y-3 rounded-[24px] border border-line bg-paper/50 px-4 py-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Выбор календарей</div>
                  <div className="mt-2 text-sm leading-6 text-muted">
                    Отметьте один или несколько календарей этого аккаунта. Именно они будут попадать в day/week и обновляться автоматически каждые 5 минут.
                  </div>
                </div>

                {googleCalendarOptionsStatus === "loading" ? (
                  <div className="space-y-2">
                    <div className="h-14 animate-pulse rounded-[18px] border border-line bg-canvas/60" />
                    <div className="h-14 animate-pulse rounded-[18px] border border-line bg-canvas/60" />
                  </div>
                ) : googleCalendarOptions.length > 0 ? (
                  <div className="space-y-2">
                    {googleCalendarOptions.map((option) => {
                      const checked = selectedGoogleSet.has(option.id);
                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-line bg-canvas/70 px-4 py-3 transition-colors hover:border-accent/40"
                        >
                          <input
                            checked={checked}
                            className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                            onChange={(event) => {
                              setSelectedGoogleCalendarIds((current) => {
                                if (event.target.checked) {
                                  return [...current, option.id];
                                }
                                return current.filter((calendarId) => calendarId !== option.id);
                              });
                            }}
                            type="checkbox"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-ink">{option.summary}</div>
                              {option.primary ? (
                                <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                                  primary
                                </span>
                              ) : null}
                              {accessRoleLabel(option.accessRole) ? (
                                <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-muted">
                                  {accessRoleLabel(option.accessRole)}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 break-all text-xs leading-5 text-muted">{option.id}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-line bg-canvas/50 px-4 py-4 text-sm leading-6 text-muted">
                    Не удалось получить список календарей или в аккаунте нет доступных календарей для чтения.
                  </div>
                )}

                <button
                  className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                  disabled={googleSelectionPending || !googleSelectionChanged}
                  onClick={() => {
                    void handleSaveGoogleSelections();
                  }}
                  type="button"
                >
                  {googleSelectionPending ? "Сохраняем выбор..." : "Сохранить выбор календарей"}
                </button>
              </div>
            ) : null}
          </div>
        </ProviderCard>

        <ProviderCard
          description="Read-only импорт по ICS URL. Подходит для опубликованных календарей Apple и любых совместимых подписок."
          title="Apple Calendar / ICS"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              void handleAppleConnect(event);
            }}
          >
            <input
              className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
              onChange={(event) => setAppleLabel(event.target.value)}
              placeholder="Подпись подключения, например Команда"
              value={appleLabel}
            />
            <textarea
              className="min-h-28 w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
              onChange={(event) => setAppleUrl(event.target.value)}
              placeholder="Вставьте https://.../calendar.ics"
              value={appleUrl}
            />
            <button
              className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
              disabled={applePending}
              type="submit"
            >
              {applePending ? "Подключаем ICS..." : "Добавить ICS feed"}
            </button>
          </form>
        </ProviderCard>
      </div>

      <section className="rounded-[28px] border border-line bg-canvas/50 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted">Подключения</div>
            <h2 className="mt-2 text-xl font-semibold text-ink">Источники календаря</h2>
          </div>
          <div className="text-sm text-muted">
            {calendarConnectionsStatus === "loading" ? "Загружаем подключения..." : `${calendarConnections.length} активных источника`}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {calendarConnections.length > 0 ? (
            calendarConnections.map((connection) => (
              <article key={connection.id} className="rounded-[24px] border border-line bg-paper/70 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-ink">{connection.accountLabel || providerLabel(connection.provider)}</div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", statusClassName(connection))}>
                        {statusLabel(connection)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted">
                      Провайдер: {providerLabel(connection.provider)}
                      {connection.provider === "google" && connection.providerAccountLabel ? ` · Аккаунт: ${connection.providerAccountLabel}` : ""}
                      {connection.lastSyncedAt ? ` · Синк: ${formatConnectionDate(connection.lastSyncedAt)}` : " · Синк ещё не запускался"}
                    </div>
                    {connection.lastError ? <div className="mt-2 text-sm leading-6 text-danger">{connection.lastError}</div> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                      onClick={() => {
                        void handleSync(connection.id);
                      }}
                      type="button"
                    >
                      Синхронизировать
                    </button>
                    <button
                      className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger"
                      onClick={() => {
                        void handleDelete(connection.id);
                      }}
                      type="button"
                    >
                      Отключить
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-line bg-paper/50 px-4 py-6 text-sm leading-6 text-muted">
              Пока нет ни одного подключённого календаря. Начните с Google OAuth или добавьте Apple/ICS feed.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
