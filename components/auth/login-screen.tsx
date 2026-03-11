"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBanner, AuthPasswordField, AuthTextField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import type { ApiError } from "@/lib/auth-types";
import { isValidEmail } from "@/lib/auth-validation";
import { useAuthStore } from "@/store/auth-store";

type LoginErrors = {
  email?: string;
  password?: string;
};

export function LoginScreen({ deleted = false }: { deleted?: boolean }) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};

    if (!isValidEmail(email)) {
      nextErrors.email = "Введите корректный email.";
    }

    if (!password.trim()) {
      nextErrors.password = "Введите пароль.";
    }

    setErrors(nextErrors);
    setRequestError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (error) {
      const typedError = error as ApiError;

      setRequestError(
        typedError.status === 401
          ? "Неверный email или пароль."
          : "Ошибка сети. Проверьте подключение и попробуйте снова.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Вход в аккаунт">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {deleted ? <AuthBanner tone="success">Аккаунт удалён. Можно войти в другой профиль.</AuthBanner> : null}
        <AuthTextField
          autoComplete="email"
          autoFocus
          disabled={isSubmitting}
          error={errors.email}
          id="login-email"
          inputMode="email"
          label="Email"
          onChange={(value) => {
            setEmail(value);
            if (errors.email) {
              setErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <AuthPasswordField
          autoComplete="current-password"
          disabled={isSubmitting}
          error={errors.password}
          id="login-password"
          label="Пароль"
          onChange={(value) => {
            setPassword(value);
            if (errors.password) {
              setErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          placeholder="Введите пароль"
          value={password}
        />
        {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
        <button className="auth-btn-primary h-11 text-sm font-medium" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>
      <div className="mt-6 space-y-3 text-sm text-muted">
        <div>
          Нет аккаунта?{" "}
          <Link className="auth-link font-medium" href="/register">
            Зарегистрироваться
          </Link>
        </div>
        <div>
          <Link className="auth-link font-medium" href="/forgot-password">
            Забыли пароль?
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
