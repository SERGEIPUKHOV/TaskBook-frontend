"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthBanner, AuthPasswordField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { api } from "@/lib/api";
import type { ApiError } from "@/lib/auth-types";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-validation";

type ResetStatus = "invalid" | "loading" | "ready" | "success";
type ResetErrors = {
  confirmPassword?: string;
  newPassword?: string;
};

export function ResetPasswordScreen({ token = "" }: { token?: string }) {
  const [status, setStatus] = useState<ResetStatus>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStatus("loading");

    if (!token) {
      setStatus("invalid");
      return;
    }

    const timer = window.setTimeout(() => {
      api
        .get<{ valid: boolean }>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
        .then((response) => {
          setStatus(response.valid ? "ready" : "invalid");
        })
        .catch(() => {
          setStatus("invalid");
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ResetErrors = {};

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      nextErrors.newPassword = `Пароль должен быть не менее ${PASSWORD_MIN_LENGTH} символов.`;
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Пароли не совпадают.";
    }

    setErrors(nextErrors);
    setRequestError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post<{ ok: true }>("/auth/reset-password", {
        new_password: newPassword,
        token,
      });
      setStatus("success");
    } catch (error) {
      const typedError = error as ApiError;

      if (typedError.status === 400) {
        setStatus("invalid");
      } else {
        setRequestError("Не удалось изменить пароль. Попробуйте ещё раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <AuthShell title="Новый пароль">
        <div className="space-y-4">
          <div className="h-11 animate-pulse rounded-[16px] bg-line/60" />
          <div className="h-11 animate-pulse rounded-[16px] bg-line/40" />
          <div className="h-11 animate-pulse rounded-[16px] bg-line/30" />
        </div>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell title="Ссылка недействительна">
        <div className="space-y-5">
          <AuthBanner>Ссылка для сброса пароля недействительна или уже истекла.</AuthBanner>
          <Link
            className="auth-btn-primary h-11 text-center text-sm font-medium leading-[44px]"
            href="/forgot-password"
          >
            Запросить новую ссылку
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title="Пароль изменён">
        <div className="space-y-5 text-center">
          <p className="text-sm leading-6 text-muted">Пароль успешно изменён. Войдите с новым паролем.</p>
          <Link className="auth-btn-primary h-11 text-center text-sm font-medium leading-[44px]" href="/login">
            Перейти ко входу
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Новый пароль">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthPasswordField
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.newPassword}
          hint={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
          id="reset-new-password"
          label="Новый пароль"
          onChange={(value) => {
            setNewPassword(value);
            if (errors.newPassword) {
              setErrors((current) => ({ ...current, newPassword: undefined }));
            }
          }}
          placeholder="Введите новый пароль"
          value={newPassword}
        />
        <AuthPasswordField
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.confirmPassword}
          id="reset-confirm-password"
          label="Повторите пароль"
          onChange={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword) {
              setErrors((current) => ({ ...current, confirmPassword: undefined }));
            }
          }}
          placeholder="Повторите новый пароль"
          value={confirmPassword}
        />
        {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
        <button className="auth-btn-primary h-11 text-sm font-medium" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Сохраняем..." : "Сменить пароль"}
        </button>
      </form>
    </AuthShell>
  );
}
