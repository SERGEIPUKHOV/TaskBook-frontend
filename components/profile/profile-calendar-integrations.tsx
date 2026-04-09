"use client";

import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import {
  TASK_CALENDAR_EXPORT_BUCKET_OPTIONS,
  type CalendarTaskExportFeed,
  type TaskCalendarExportBucket,
} from "@/lib/planner-types";
import { useAppStore } from "@/store/app-store";

type ProfileCalendarIntegrationsProps = {
  googleMessage?: string | null;
  googleProvider?: string | null;
  googleStatus?: string | null;
};

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

const CALENDAR_PALETTE = [
  "#D50000",
  "#E67C73",
  "#F4511E",
  "#F6BF26",
  "#33B679",
  "#0B8043",
  "#039BE5",
  "#3F51B5",
  "#7986CB",
  "#8E24AA",
  "#616161",
] as const;

const FALLBACK_CONNECTION_COLOR = "#616161";
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

function resolveConnectionColor(color: string | null): string {
  return color ?? FALLBACK_CONNECTION_COLOR;
}

function taskFeedLabel(bucket: TaskCalendarExportBucket): string {
  return TASK_CALENDAR_EXPORT_BUCKET_OPTIONS.find((option) => option.value === bucket)?.label ?? bucket;
}

function buildAbsoluteFeedUrl(feedPath: string): string {
  return new URL(feedPath, API_BASE).toString();
}

function ConnectionColorSwatches({
  currentColor,
  disabled = false,
  onSelect,
}: {
  currentColor: string | null;
  disabled?: boolean;
  onSelect: (paletteColor: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {CALENDAR_PALETTE.map((paletteColor) => (
        <button
          key={paletteColor}
          className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-wait disabled:opacity-60"
          disabled={disabled}
          style={{
            backgroundColor: paletteColor,
            borderColor: resolveConnectionColor(currentColor) === paletteColor ? "var(--color-ink)" : "transparent",
          }}
          type="button"
          onClick={() => onSelect(paletteColor)}
        />
      ))}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
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
  );
}

function AppleLogo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function ProviderCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-[28px] border border-line bg-canvas/50 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper text-ink shadow-paper">
          {icon}
        </div>
        <div className="text-base font-semibold text-ink">{title}</div>
      </div>
      <div className="mt-2 text-sm leading-6 text-muted">{description}</div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function GoogleCalendarOptionList({
  onToggle,
  options,
  selectedIds,
}: {
  onToggle: (calendarId: string, checked: boolean) => void;
  options: Array<{
    accessRole: string | null;
    id: string;
    primary: boolean;
    summary: string;
  }>;
  selectedIds: Set<string>;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const checked = selectedIds.has(option.id);
        return (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-line bg-canvas/70 px-4 py-3 transition-colors hover:border-accent/40"
          >
            <input
              checked={checked}
              className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
              onChange={(event) => onToggle(option.id, event.target.checked)}
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
  );
}

export function ProfileCalendarIntegrations({
  googleProvider = null,
  googleStatus = null,
}: ProfileCalendarIntegrationsProps) {
  const [googlePending, setGooglePending] = useState(false);
  const [googleSelectionPending, setGoogleSelectionPending] = useState(false);
  const [googleSyncPending, setGoogleSyncPending] = useState(false);
  const [googleDisconnectPending, setGoogleDisconnectPending] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [selectedGoogleCalendarIds, setSelectedGoogleCalendarIds] = useState<string[]>([]);
  const [applePending, setApplePending] = useState(false);
  const [showApplePicker, setShowApplePicker] = useState(false);
  const [appleSyncPending, setAppleSyncPending] = useState<Record<string, boolean>>({});
  const [colorPickerConnectionId, setColorPickerConnectionId] = useState<string | null>(null);
  const [colorUpdatePendingConnectionId, setColorUpdatePendingConnectionId] = useState<string | null>(null);
  const [appleLabel, setAppleLabel] = useState("");
  const [appleUrl, setAppleUrl] = useState("");
  const [copiedFeedBucket, setCopiedFeedBucket] = useState<TaskCalendarExportBucket | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const copiedFeedTimerRef = useRef<number | null>(null);

  const fetchCalendarConnections = useAppStore((state) => state.fetchCalendarConnections);
  const fetchGoogleCalendarOptions = useAppStore((state) => state.fetchGoogleCalendarOptions);
  const fetchTaskExportFeeds = useAppStore((state) => state.fetchTaskExportFeeds);
  const startGoogleCalendarConnect = useAppStore((state) => state.startGoogleCalendarConnect);
  const saveGoogleCalendarSelections = useAppStore((state) => state.saveGoogleCalendarSelections);
  const syncAllGoogleCalendars = useAppStore((state) => state.syncAllGoogleCalendars);
  const disconnectGoogleCalendarAccount = useAppStore((state) => state.disconnectGoogleCalendarAccount);
  const connectAppleCalendar = useAppStore((state) => state.connectAppleCalendar);
  const syncCalendarConnection = useAppStore((state) => state.syncCalendarConnection);
  const deleteCalendarConnection = useAppStore((state) => state.deleteCalendarConnection);
  const updateConnectionColor = useAppStore((state) => state.updateConnectionColor);
  const calendarConnections = useAppStore((state) => state.calendarConnections);
  const calendarConnectionsStatus = useAppStore((state) => state.calendarConnectionsStatus);
  const googleCalendarOptions = useAppStore((state) => state.googleCalendarOptions);
  const googleCalendarOptionsStatus = useAppStore((state) => state.googleCalendarOptionsStatus);
  const googleCalendarConnected = useAppStore((state) => state.googleCalendarConnected);
  const googleCalendarAccountLabel = useAppStore((state) => state.googleCalendarAccountLabel);
  const taskExportFeeds = useAppStore((state) => state.taskExportFeeds);
  const taskExportFeedsStatus = useAppStore((state) => state.taskExportFeedsStatus);

  useEffect(() => {
    void fetchCalendarConnections();
    void fetchGoogleCalendarOptions();
    void fetchTaskExportFeeds();
  }, [fetchCalendarConnections, fetchGoogleCalendarOptions, fetchTaskExportFeeds]);

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

  useEffect(
    () => () => {
      if (copiedFeedTimerRef.current) {
        window.clearTimeout(copiedFeedTimerRef.current);
      }
    },
    [],
  );

  const googleConnections = calendarConnections.filter((connection) => connection.provider === "google");
  const appleConnections = calendarConnections.filter((connection) => connection.provider === "apple");
  const latestGoogleSync = googleConnections.reduce<string | null>((latest, connection) => {
    if (!connection.lastSyncedAt) {
      return latest;
    }
    if (!latest || connection.lastSyncedAt > latest) {
      return connection.lastSyncedAt;
    }
    return latest;
  }, null);
  const savedGoogleCalendarIds = useMemo(
    () => googleCalendarOptions.filter((option) => option.selected).map((option) => option.id),
    [googleCalendarOptions],
  );
  const selectedGoogleSet = new Set(selectedGoogleCalendarIds);
  const savedGoogleSet = new Set(savedGoogleCalendarIds);
  const googleSelectionChanged =
    selectedGoogleSet.size !== savedGoogleSet.size ||
    [...selectedGoogleSet].some((calendarId) => !savedGoogleSet.has(calendarId));

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
      setShowCalendarPicker(false);
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
      setShowCalendarPicker(false);
      setColorPickerConnectionId(null);
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
      setShowApplePicker(false);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось подключить Apple ICS feed");
    } finally {
      setApplePending(false);
    }
  }

  async function handleAppleSyncConnection(connectionId: string) {
    setScreenError(null);
    setAppleSyncPending((current) => ({ ...current, [connectionId]: true }));
    try {
      await syncCalendarConnection(connectionId);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось синхронизировать Apple Calendar");
    } finally {
      setAppleSyncPending((current) => ({ ...current, [connectionId]: false }));
    }
  }

  async function handleDelete(connectionId: string) {
    setScreenError(null);
    try {
      await deleteCalendarConnection(connectionId);
      setColorPickerConnectionId((current) => (current === connectionId ? null : current));
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось отключить календарь");
    }
  }

  async function handleUpdateConnectionColor(connectionId: string, color: string) {
    setScreenError(null);
    setColorUpdatePendingConnectionId(connectionId);
    try {
      await updateConnectionColor(connectionId, color);
      setColorPickerConnectionId(null);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось обновить цвет календаря");
    } finally {
      setColorUpdatePendingConnectionId(null);
    }
  }

  function handleCalendarToggle(calendarId: string, checked: boolean) {
    setSelectedGoogleCalendarIds((current) => {
      if (checked) {
        return [...current, calendarId];
      }
      return current.filter((id) => id !== calendarId);
    });
  }

  function handleCloseCalendarPicker() {
    setSelectedGoogleCalendarIds(savedGoogleCalendarIds);
    setShowCalendarPicker(false);
  }

  function handleOpenApplePicker() {
    setScreenError(null);
    setShowApplePicker(true);
  }

  function handleCloseApplePicker() {
    setScreenError(null);
    setAppleLabel("");
    setAppleUrl("");
    setShowApplePicker(false);
  }

  async function handleCopyTaskFeed(feed: CalendarTaskExportFeed) {
    try {
      await navigator.clipboard.writeText(buildAbsoluteFeedUrl(feed.feedPath));
      setCopiedFeedBucket(feed.bucket);
      if (copiedFeedTimerRef.current) {
        window.clearTimeout(copiedFeedTimerRef.current);
      }
      copiedFeedTimerRef.current = window.setTimeout(() => {
        setCopiedFeedBucket((current) => (current === feed.bucket ? null : current));
      }, 1800);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Не удалось скопировать ссылку на ICS feed");
    }
  }

  return (
    <div className="space-y-5">
      {screenError ? (
        <div className="rounded-[24px] border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
          {screenError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ProviderCard
          description="После авторизации можно выбрать несколько календарей этого аккаунта и держать их в авто-синке."
          icon={<GoogleLogo />}
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
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="w-full rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                    disabled={googleCalendarOptionsStatus === "loading"}
                    onClick={() => setShowCalendarPicker(true)}
                    type="button"
                  >
                    {`Выбрать календари${savedGoogleCalendarIds.length > 0 ? ` (${savedGoogleCalendarIds.length})` : ""}`}
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                      disabled={googleSyncPending || googleConnections.length === 0}
                      onClick={() => {
                        void handleSyncAllGoogle();
                      }}
                      type="button"
                    >
                      {googleSyncPending ? "Синхронизируем..." : "Синхронизировать"}
                    </button>
                    <button
                      className="flex-1 rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60"
                      disabled={googleDisconnectPending}
                      onClick={() => {
                        void handleDisconnectGoogleAccount();
                      }}
                      type="button"
                    >
                      {googleDisconnectPending ? "Удаляем..." : "Удалить"}
                    </button>
                  </div>
                </div>

                {googleConnections.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {googleConnections.map((connection) => (
                      <div
                        key={connection.id}
                        className="rounded-[20px] border border-line bg-canvas/70 px-4 py-3 text-sm leading-6 text-muted"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            className="mt-1 h-4 w-4 shrink-0 rounded-full border border-line/50 transition-transform hover:scale-110 disabled:cursor-wait disabled:opacity-60"
                            disabled={colorUpdatePendingConnectionId === connection.id}
                            style={{ backgroundColor: resolveConnectionColor(connection.color) }}
                            title="Изменить цвет"
                            type="button"
                            onClick={() => setColorPickerConnectionId(
                              colorPickerConnectionId === connection.id ? null : connection.id,
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-ink">{connection.accountLabel || "Google calendar"}</div>
                            <div className="mt-1 text-xs leading-5 text-muted">
                              {connection.lastError ? (
                                <span className="text-danger">{connection.lastError}</span>
                              ) : connection.lastSyncedAt ? (
                                `Последняя синхронизация: ${formatConnectionDate(connection.lastSyncedAt)}`
                              ) : (
                                "Синк ещё не запускался"
                              )}
                            </div>
                          </div>
                        </div>

                        {colorPickerConnectionId === connection.id ? (
                          <ConnectionColorSwatches
                            currentColor={connection.color}
                            disabled={colorUpdatePendingConnectionId === connection.id}
                            onSelect={(paletteColor) => {
                              void handleUpdateConnectionColor(connection.id, paletteColor);
                            }}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </ProviderCard>

        <ProviderCard
          description="Подходит для опубликованных календарей Apple и любых совместимых подписок."
          icon={<AppleLogo />}
          title="Apple Calendar / ICS"
        >
          <div className="space-y-4">
            <button
              className="w-full rounded-[18px] border border-line bg-paper px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
              onClick={handleOpenApplePicker}
              type="button"
            >
              {appleConnections.length > 0 ? "Переподключить Apple Calendar" : "Подключить Apple Calendar"}
            </button>

            {calendarConnectionsStatus === "loading" ? (
              <div className="rounded-[20px] border border-dashed border-line bg-paper/50 px-4 py-4 text-sm leading-6 text-muted">
                Загружаем подключения...
              </div>
            ) : null}

            {appleConnections.length > 0 ? (
              <div className="space-y-2">
                {appleConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm leading-6 text-muted"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-1 h-4 w-4 shrink-0 rounded-full border border-line/50 transition-transform hover:scale-110 disabled:cursor-wait disabled:opacity-60"
                        disabled={colorUpdatePendingConnectionId === connection.id}
                        style={{ backgroundColor: resolveConnectionColor(connection.color) }}
                        title="Изменить цвет"
                        type="button"
                        onClick={() => setColorPickerConnectionId(
                          colorPickerConnectionId === connection.id ? null : connection.id,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink">{connection.accountLabel || "ICS feed"}</div>
                        <div className="mt-1">
                          {connection.lastError ? (
                            <span className="text-danger">{connection.lastError}</span>
                          ) : connection.lastSyncedAt ? (
                            `Последняя синхронизация: ${formatConnectionDate(connection.lastSyncedAt)}`
                          ) : (
                            "Синк ещё не запускался"
                          )}
                        </div>
                      </div>
                    </div>

                    {colorPickerConnectionId === connection.id ? (
                      <ConnectionColorSwatches
                        currentColor={connection.color}
                        disabled={colorUpdatePendingConnectionId === connection.id}
                        onSelect={(paletteColor) => {
                          void handleUpdateConnectionColor(connection.id, paletteColor);
                        }}
                      />
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                        disabled={appleSyncPending[connection.id]}
                        onClick={() => {
                          void handleAppleSyncConnection(connection.id);
                        }}
                        type="button"
                      >
                        {appleSyncPending[connection.id] ? "Синхронизируем..." : "Синхронизировать"}
                      </button>
                      <button
                        className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:cursor-wait disabled:opacity-60"
                        onClick={() => {
                          void handleDelete(connection.id);
                        }}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ProviderCard>
      </div>

      <section className="rounded-[28px] border border-line bg-canvas/50 p-5 sm:p-6">
        <div className="text-base font-semibold text-ink">Экспорт задач</div>
        <div className="mt-2 text-sm leading-6 text-muted">
          Выбери bucket для задачи в planner и подпиши нужный ICS URL во внешний календарь. Так можно развести рабочие и личные задачи по разным календарям без write-доступа к Google или Apple.
        </div>
        <div className="mt-4 space-y-3">
          {taskExportFeedsStatus === "loading" ? (
            <>
              <div className="h-20 animate-pulse rounded-[22px] border border-line bg-paper/60" />
              <div className="h-20 animate-pulse rounded-[22px] border border-line bg-paper/60" />
            </>
          ) : null}

          {taskExportFeedsStatus === "error" ? (
            <div className="rounded-[22px] border border-danger/30 bg-danger/10 px-4 py-4 text-sm leading-6 text-danger">
              Не удалось загрузить ссылки на экспорт задач.
              <button
                className="ml-2 font-medium underline underline-offset-4"
                onClick={() => {
                  void fetchTaskExportFeeds(true);
                }}
                type="button"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {taskExportFeedsStatus === "ready"
            ? taskExportFeeds.map((feed) => (
                <div
                  key={feed.bucket}
                  className="rounded-[24px] border border-line bg-paper/70 px-4 py-4 text-sm leading-6 text-muted"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-ink">{taskFeedLabel(feed.bucket)}</div>
                      <div className="mt-1 text-xs text-muted">
                        {feed.taskCount > 0 ? `Задач в фиде: ${feed.taskCount}` : "Пока пусто, но ссылку уже можно подписать"}
                      </div>
                    </div>
                    <button
                      className="rounded-[18px] border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                      onClick={() => {
                        void handleCopyTaskFeed(feed);
                      }}
                      type="button"
                    >
                      {copiedFeedBucket === feed.bucket ? "Скопировано" : "Скопировать ссылку"}
                    </button>
                  </div>
                  <div className="mt-3 break-all rounded-[18px] border border-line bg-canvas/70 px-3 py-3 text-xs leading-5 text-muted">
                    {buildAbsoluteFeedUrl(feed.feedPath)}
                  </div>
                </div>
              ))
            : null}
        </div>
        <div className="mt-4 rounded-[22px] border border-line bg-paper/70 px-4 py-4 text-sm leading-6 text-muted">
          Google Calendar: <span className="text-ink">Другие календари → Добавить по URL</span>.
          Apple Calendar: <span className="text-ink">Файл → Новая подписка на календарь</span>.
        </div>
      </section>

      {showApplePicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
          <div className="paper-panel max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[32px] p-6">
            <div className="text-lg font-semibold text-ink">
              {appleConnections.length > 0 ? "Переподключить Apple Calendar" : "Подключить Apple Calendar"}
            </div>
            <form
              id="apple-calendar-form"
              className="mt-4 space-y-3"
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
            </form>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                onClick={handleCloseApplePicker}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                disabled={applePending}
                form="apple-calendar-form"
                type="submit"
              >
                {applePending ? "Подключаем ICS..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCalendarPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
          <div className="paper-panel max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[32px] p-6">
            <div className="text-lg font-semibold text-ink">Выбор календарей</div>
            <div className="mt-4">
              {googleCalendarOptionsStatus === "loading" ? (
                <div className="space-y-2">
                  <div className="h-14 animate-pulse rounded-[18px] border border-line bg-canvas/60" />
                  <div className="h-14 animate-pulse rounded-[18px] border border-line bg-canvas/60" />
                </div>
              ) : googleCalendarOptions.length > 0 ? (
                <GoogleCalendarOptionList
                  onToggle={handleCalendarToggle}
                  options={googleCalendarOptions}
                  selectedIds={selectedGoogleSet}
                />
              ) : (
                <div className="rounded-[18px] border border-dashed border-line bg-canvas/50 px-4 py-4 text-sm leading-6 text-muted">
                  Не удалось получить список календарей или в аккаунте нет доступных календарей для чтения.
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                onClick={handleCloseCalendarPicker}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                disabled={googleSelectionPending || !googleSelectionChanged}
                onClick={() => {
                  void handleSaveGoogleSelections();
                }}
                type="button"
              >
                {googleSelectionPending ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
