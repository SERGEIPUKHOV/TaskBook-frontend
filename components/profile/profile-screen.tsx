"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBanner, AuthPasswordField } from "@/components/auth/auth-fields";
import { ProfileCalendarIntegrations } from "@/components/profile/profile-calendar-integrations";
import { ProfileSupervisionAccess } from "@/components/profile/profile-supervision-access";
import { api } from "@/lib/api";
import type { ApiError, AuthUser } from "@/lib/auth-types";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-validation";
import { getISOWeekReference } from "@/lib/dates";
import { getSupervisionTargetHref } from "@/lib/supervision-nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

type ChangePasswordErrors = {
  confirmPassword?: string;
  currentPassword?: string;
  newPassword?: string;
};

type DeleteStep = "confirm" | "warning" | null;

type ProfileScreenProps = {
  googleMessage?: string | null;
  googleProvider?: string | null;
  googleStatus?: string | null;
};

type ChangePasswordModalProps = {
  changeErrors: ChangePasswordErrors;
  changeNotice: string;
  confirmPassword: string;
  currentPassword: string;
  isChanging: boolean;
  newPassword: string;
  onCancel: () => void;
  onConfirmPasswordChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  requestError: string;
};

function Section({
  children,
  tone = "default",
  title,
}: {
  children: React.ReactNode;
  title: string;
  tone?: "danger" | "default";
}) {
  return (
    <section
      className={cn(
        "paper-panel rounded-[30px] p-6",
        tone === "danger" && "border-danger/25 bg-danger/5",
      )}
    >
      <div
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.12em]",
          tone === "danger" ? "text-danger" : "text-muted",
        )}
      >
        {title}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[980px] space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={`profile-skeleton-${index}`} className="paper-panel rounded-[30px] p-6">
          <div className="h-3 w-24 animate-pulse rounded bg-line/60" />
          <div className="mt-5 h-5 w-full animate-pulse rounded bg-line/50" />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-line/40" />
          {index > 0 ? <div className="mt-4 h-11 w-full animate-pulse rounded-[16px] bg-line/35" /> : null}
        </div>
      ))}
    </div>
  );
}

function DeleteAccountModal({
  deleteError,
  isDeleting,
  onCancel,
  onConfirmPasswordChange,
  onContinue,
  onSubmit,
  password,
  step,
}: {
  deleteError: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirmPasswordChange: (value: string) => void;
  onContinue: () => void;
  onSubmit: () => void;
  password: string;
  step: Exclude<DeleteStep, null>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-lg rounded-[32px] p-6">
        {step === "warning" ? (
          <>
            <div className="text-lg font-semibold text-ink">Удалить аккаунт?</div>
            <p className="mt-3 text-sm leading-7 text-muted">Это действие нельзя отменить. Будут удалены:</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-ink">
              <li>• Все задачи и статусы</li>
              <li>• Все привычки и отметки</li>
              <li>• Все состояния и события</li>
              <li>• Данные всех месяцев и недель</li>
            </ul>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                onClick={onCancel}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-[18px] border border-danger bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                onClick={onContinue}
                type="button"
              >
                Продолжить
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-ink">Подтвердите действие</div>
            <p className="mt-3 text-sm leading-7 text-muted">Введите пароль для подтверждения удаления аккаунта.</p>
            <div className="mt-5">
              <AuthPasswordField
                disabled={isDeleting}
                error={deleteError}
                id="delete-account-password"
                label="Пароль"
                onChange={onConfirmPasswordChange}
                placeholder="Текущий пароль"
                value={password}
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                onClick={onCancel}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-[18px] border border-danger bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDeleting || !password.trim()}
                onClick={onSubmit}
                type="button"
              >
                {isDeleting ? "Удаляем..." : "Удалить навсегда"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChangePasswordModal({
  changeErrors,
  changeNotice,
  confirmPassword,
  currentPassword,
  isChanging,
  newPassword,
  onCancel,
  onConfirmPasswordChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onSubmit,
  requestError,
}: ChangePasswordModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-lg rounded-[32px] p-6">
        <div className="text-lg font-semibold text-ink">Смена пароля</div>
        <p className="mt-3 text-sm leading-7 text-muted">Введите текущий пароль и задайте новый.</p>
        <form className="mt-5 space-y-5" onSubmit={onSubmit}>
          <AuthPasswordField
            autoComplete="current-password"
            disabled={isChanging}
            error={changeErrors.currentPassword}
            id="profile-modal-current-password"
            label="Текущий пароль"
            onChange={onCurrentPasswordChange}
            placeholder="Текущий пароль"
            value={currentPassword}
          />
          <AuthPasswordField
            autoComplete="new-password"
            disabled={isChanging}
            error={changeErrors.newPassword}
            hint={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
            id="profile-modal-new-password"
            label="Новый пароль"
            onChange={onNewPasswordChange}
            placeholder="Новый пароль"
            value={newPassword}
          />
          <AuthPasswordField
            autoComplete="new-password"
            disabled={isChanging}
            error={changeErrors.confirmPassword}
            id="profile-modal-confirm-password"
            label="Повторите новый пароль"
            onChange={onConfirmPasswordChange}
            placeholder="Повторите новый пароль"
            value={confirmPassword}
          />
          {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
          {changeNotice ? <AuthBanner tone="success">{changeNotice}</AuthBanner> : null}
          <div className="flex items-center justify-end gap-3">
            <button
              className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
              onClick={onCancel}
              type="button"
            >
              Отмена
            </button>
            <button
              className="rounded-[18px] border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isChanging}
              type="submit"
            >
              {isChanging ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfileScreen({
  googleMessage = null,
  googleProvider = null,
  googleStatus = null,
}: ProfileScreenProps) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const logout = useAuthStore((state) => state.logout);
  const initialUser = useAuthStore((state) => state.user);
  const syncUser = useAuthStore((state) => state.syncUser);
  const accessibleOwners = useAppStore((state) => state.accessibleOwners);
  const fetchAccessibleOwners = useAppStore((state) => state.fetchAccessibleOwners);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const startViewingAs = useAppStore((state) => state.startViewingAs);
  const stopViewingAs = useAppStore((state) => state.stopViewingAs);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [loadError, setLoadError] = useState("");
  const [changeNotice, setChangeNotice] = useState("");
  const [requestError, setRequestError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeErrors, setChangeErrors] = useState<ChangePasswordErrors>({});
  const [isChanging, setIsChanging] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      setLoadError("");
      setIsLoading(!initialUser);

      try {
        const nextUser = await syncUser();

        if (isCancelled) {
          return;
        }

        setUser(nextUser);
      } catch (error) {
        const typedError = error as ApiError;

        if (isCancelled) {
          return;
        }

        if (typedError.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        setLoadError("Не удалось загрузить данные профиля.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [clearSession, router, syncUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchAccessibleOwners();
  }, [fetchAccessibleOwners]);

  useEffect(() => {
    if (viewingAs) {
      setSelectedOwnerId(viewingAs.ownerId);
      return;
    }

    setSelectedOwnerId("");
  }, [viewingAs]);

  async function handleRetry() {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextUser = await syncUser();
      setUser(nextUser);
    } catch (error) {
      const typedError = error as ApiError;

      if (typedError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      setLoadError("Не удалось загрузить данные профиля.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ChangePasswordErrors = {};

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = "Введите текущий пароль.";
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      nextErrors.newPassword = `Пароль должен быть не менее ${PASSWORD_MIN_LENGTH} символов.`;
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Пароли не совпадают.";
    }

    setChangeErrors(nextErrors);
    setChangeNotice("");
    setRequestError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsChanging(true);

    try {
      await api.post<{ ok: true }>("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangeNotice("Пароль изменён.");
      setShowChangePassword(false);
    } catch (error) {
      const typedError = error as ApiError;

      if (typedError.status === 401) {
        setChangeErrors({ currentPassword: "Неверный текущий пароль." });
      } else if (typedError.status === 400) {
        setChangeErrors({ newPassword: typedError.message });
      } else {
        setRequestError("Не удалось изменить пароль. Попробуйте ещё раз.");
      }
    } finally {
      setIsChanging(false);
    }
  }

  function resetChangePasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangeErrors({});
    setRequestError("");
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }

    router.replace("/login");
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      setDeleteError("Введите пароль.");
      return;
    }

    setDeleteError("");
    setIsDeleting(true);

    try {
      await api.deleteWithBody<{ ok: true }>("/auth/account", { password: deletePassword });
      clearSession();
      router.replace("/login?deleted=1");
    } catch (error) {
      const typedError = error as ApiError;

      if (typedError.status === 401) {
        setDeleteError("Неверный пароль.");
      } else {
        setDeleteError("Не удалось удалить аккаунт. Попробуйте ещё раз.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function handleStartViewingAs(ownerId?: string) {
    const id = ownerId ?? selectedOwnerId;
    if (!id) {
      return;
    }

    const owner = accessibleOwners.find((item) => item.ownerId === id);
    if (!owner) {
      return;
    }

    startViewingAs(owner.ownerId);
    const today = new Date();
    const weekRef = getISOWeekReference(today);
    router.push(
      getSupervisionTargetHref({
        allowedSections: owner.sections,
        calendarHref: "/calendar",
        currentHref: "/profile",
        currentSection: null,
        dayHref: `/day/${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`,
        monthHref: `/month/${today.getFullYear()}/${today.getMonth() + 1}`,
        weekHref: `/week/${weekRef.year}/${weekRef.week}`,
      }),
    );
  }

  if (isLoading && !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[980px] space-y-4">
      {loadError ? (
        <AuthBanner>
          {loadError}{" "}
          <button className="auth-link font-medium" onClick={() => void handleRetry()} type="button">
            Повторить
          </button>
        </AuthBanner>
      ) : null}

      <header className="rounded-[32px] border border-line bg-paper/70 px-5 py-5 shadow-paper">
        <div className="text-xs uppercase tracking-[0.22em] text-muted">Профиль</div>
        <h1 className="mt-2 break-all text-3xl font-semibold text-ink">{user?.email ?? "Профиль пользователя"}</h1>
      </header>

      <Section title="Аккаунт">
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-line/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted">Email</span>
            <span className="text-sm font-medium text-ink">{user?.email ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted">В системе с</span>
            <span className="text-sm font-medium text-ink">
              {user ? format(new Date(user.created_at), "d MMMM yyyy", { locale: ru }) : "—"}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Смена пароля">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Сменить пароль</p>
            <p className="mt-1 text-sm leading-6 text-muted">Откроем безопасное окно с подтверждением нового пароля.</p>
          </div>
          <button
            className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isChanging}
            onClick={() => {
              resetChangePasswordForm();
              setChangeNotice("");
              setShowChangePassword(true);
            }}
            type="button"
          >
            Сменить пароль
          </button>
        </div>
        {changeNotice ? <AuthBanner tone="success">{changeNotice}</AuthBanner> : null}
      </Section>

      <Section title="Интеграции календаря">
        <ProfileCalendarIntegrations
          googleMessage={googleMessage}
          googleProvider={googleProvider}
          googleStatus={googleStatus}
        />
      </Section>

      {(accessibleOwners.length > 0 || viewingAs) ? (
        <Section title="Наблюдение">
          {viewingAs ? (
            <div className="flex flex-col gap-3 rounded-[22px] border border-accent/30 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Просматриваете аккаунт</p>
                <p className="mt-0.5 break-all text-sm text-muted">{viewingAs.ownerEmail}</p>
              </div>
              <button
                className="shrink-0 rounded-[16px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                onClick={() => stopViewingAs()}
                type="button"
              >
                Вернуться к себе
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <button
                  className="flex h-11 w-full items-center justify-between rounded-[16px] border border-line bg-paper px-4 text-sm text-ink outline-none transition-colors hover:border-accent focus:border-accent"
                  onClick={() => setDropdownOpen((v) => !v)}
                  type="button"
                >
                  <span className={selectedOwnerId ? "text-ink" : "text-muted"}>
                    {accessibleOwners.find((o) => o.ownerId === selectedOwnerId)?.ownerEmail ?? "Выбрать аккаунт..."}
                  </span>
                  <span className="ml-2 shrink-0 text-muted">∨</span>
                </button>
                {dropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[16px] border border-line bg-paper shadow-paper">
                    {accessibleOwners.map((owner) => (
                      <button
                        key={owner.ownerId}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-canvas"
                        onClick={() => { setSelectedOwnerId(owner.ownerId); setDropdownOpen(false); }}
                        type="button"
                      >
                        {owner.ownerEmail}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className="h-11 shrink-0 rounded-[16px] border border-line bg-paper px-5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedOwnerId}
                onClick={() => handleStartViewingAs()}
                type="button"
              >
                Посмотреть
              </button>
            </div>
          )}
        </Section>
      ) : null}

      <Section title="Доступы">
        <ProfileSupervisionAccess />
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Сессия">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Выйти из аккаунта</p>
              <p className="mt-1 text-sm leading-6 text-muted">Завершить текущую сессию.</p>
            </div>
            <button
              className="rounded-[18px] border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              type="button"
            >
              {isLoggingOut ? "Выходим..." : "Выйти"}
            </button>
          </div>
        </Section>

        <Section title="Опасная зона" tone="danger">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Удалить аккаунт и все данные</p>
              <p className="mt-1 text-sm leading-6 text-muted">Все данные будут удалены безвозвратно.</p>
            </div>
            <button
              className="rounded-[18px] border border-danger px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              onClick={() => {
                setDeleteError("");
                setDeletePassword("");
                setDeleteStep("warning");
              }}
              type="button"
            >
              Удалить аккаунт
            </button>
          </div>
        </Section>
      </div>

      {deleteStep ? (
        <DeleteAccountModal
          deleteError={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            setDeleteStep(null);
            setDeletePassword("");
            setDeleteError("");
          }}
          onConfirmPasswordChange={(value) => {
            setDeletePassword(value);
            if (deleteError) {
              setDeleteError("");
            }
          }}
          onContinue={() => setDeleteStep("confirm")}
          onSubmit={() => {
            void handleDeleteAccount();
          }}
          password={deletePassword}
          step={deleteStep}
        />
      ) : null}

      {showChangePassword ? (
        <ChangePasswordModal
          changeErrors={changeErrors}
          changeNotice={changeNotice}
          confirmPassword={confirmPassword}
          currentPassword={currentPassword}
          isChanging={isChanging}
          newPassword={newPassword}
          onCancel={() => {
            setShowChangePassword(false);
            resetChangePasswordForm();
          }}
          onConfirmPasswordChange={(value) => {
            setConfirmPassword(value);
            if (changeErrors.confirmPassword) {
              setChangeErrors((current) => ({ ...current, confirmPassword: undefined }));
            }
          }}
          onCurrentPasswordChange={(value) => {
            setCurrentPassword(value);
            if (changeErrors.currentPassword) {
              setChangeErrors((current) => ({ ...current, currentPassword: undefined }));
            }
          }}
          onNewPasswordChange={(value) => {
            setNewPassword(value);
            if (changeErrors.newPassword) {
              setChangeErrors((current) => ({ ...current, newPassword: undefined }));
            }
          }}
          onSubmit={handleChangePassword}
          requestError={requestError}
        />
      ) : null}
    </div>
  );
}
