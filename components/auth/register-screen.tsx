"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBanner, AuthPasswordField, AuthTextField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import type { ApiError } from "@/lib/auth-types";
import { isValidEmail, PASSWORD_MIN_LENGTH } from "@/lib/auth-validation";
import { useAuthStore } from "@/store/auth-store";

type RegisterErrors = {
  confirmPassword?: string;
  email?: string;
  password?: string;
};

export function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: RegisterErrors = {};

    if (!isValidEmail(email)) {
      nextErrors.email = "Введите корректный email.";
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Пароль должен быть не менее ${PASSWORD_MIN_LENGTH} символов.`;
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Пароли не совпадают.";
    }

    setErrors(nextErrors);
    setRequestError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email.trim(), password);
      router.replace("/dashboard");
    } catch (error) {
      const typedError = error as ApiError;

      if (typedError.status === 409) {
        setRequestError("Пользователь с таким email уже существует.");
      } else if (typedError.status === 422) {
        setRequestError("Проверьте правильность введённых данных.");
      } else {
        setRequestError("Не удалось создать аккаунт. Попробуйте ещё раз.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Создать аккаунт">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          autoFocus
          disabled={isSubmitting}
          error={errors.email}
          id="register-email"
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
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.password}
          hint={`Минимум ${PASSWORD_MIN_LENGTH} символов`}
          id="register-password"
          label="Пароль"
          onChange={(value) => {
            setPassword(value);
            if (errors.password) {
              setErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          placeholder="Придумайте пароль"
          value={password}
        />
        <AuthPasswordField
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.confirmPassword}
          id="register-confirm-password"
          label="Повторите пароль"
          onChange={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword) {
              setErrors((current) => ({ ...current, confirmPassword: undefined }));
            }
          }}
          placeholder="Повторите пароль"
          value={confirmPassword}
        />
        {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
        <button className="auth-btn-primary h-11 text-sm font-medium" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Создаём аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>
      <div className="mt-6 text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link className="auth-link font-medium" href="/login">
          Войти
        </Link>
      </div>
    </AuthShell>
  );
}
