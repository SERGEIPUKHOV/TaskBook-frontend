"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBanner, AuthPasswordField } from "@/components/auth/auth-fields";
import { api } from "@/lib/api";
import type { ApiError, AuthUser } from "@/lib/auth-types";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type ChangePasswordErrors = {
  confirmPassword?: string;
  currentPassword?: string;
  newPassword?: string;
};

type DeleteStep = "confirm" | "warning" | null;

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
    <div className="mx-auto max-w-[720px] space-y-4">
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

export function ProfileScreen() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const logout = useAuthStore((state) => state.logout);
  const initialUser = useAuthStore((state) => state.user);
  const syncUser = useAuthStore((state) => state.syncUser);
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [clearSession, initialUser, router, syncUser]);

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

  if (isLoading && !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4">
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
        <form className="space-y-5" onSubmit={handleChangePassword}>
          <AuthPasswordField
            autoComplete="current-password"
            disabled={isChanging}
            error={changeErrors.currentPassword}
            id="profile-current-password"
            label="Текущий пароль"
            onChange={(value) => {
              setCurrentPassword(value);
              if (changeErrors.currentPassword) {
                setChangeErrors((current) => ({ ...current, currentPassword: undefined }));
              }
            }}
            placeholder="Текущий пароль"
            value={currentPassword}
          />
          <AuthPasswordField
            autoComplete="new-password"
            disabled={isChanging}
            error={changeErrors.newPassword}
            hint={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
            id="profile-new-password"
            label="Новый пароль"
            onChange={(value) => {
              setNewPassword(value);
              if (changeErrors.newPassword) {
                setChangeErrors((current) => ({ ...current, newPassword: undefined }));
              }
            }}
            placeholder="Новый пароль"
            value={newPassword}
          />
          <AuthPasswordField
            autoComplete="new-password"
            disabled={isChanging}
            error={changeErrors.confirmPassword}
            id="profile-confirm-password"
            label="Повторите новый пароль"
            onChange={(value) => {
              setConfirmPassword(value);
              if (changeErrors.confirmPassword) {
                setChangeErrors((current) => ({ ...current, confirmPassword: undefined }));
              }
            }}
            placeholder="Повторите новый пароль"
            value={confirmPassword}
          />
          {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
          {changeNotice ? <AuthBanner tone="success">{changeNotice}</AuthBanner> : null}
          <div>
            <button className="auth-btn-primary h-11 px-5 text-sm font-medium sm:w-auto" disabled={isChanging} type="submit">
              {isChanging ? "Сохраняем..." : "Сменить пароль"}
            </button>
          </div>
        </form>
      </Section>

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
    </div>
  );
}
