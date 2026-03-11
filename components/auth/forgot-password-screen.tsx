"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthBanner, AuthTextField } from "@/components/auth/auth-fields";
import { AuthShell } from "@/components/auth/auth-shell";
import { api } from "@/lib/api";
import { isValidEmail } from "@/lib/auth-validation";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError("Введите корректный email.");
      return;
    }

    setEmailError("");
    setRequestError("");
    setIsSubmitting(true);

    try {
      await api.post<{ ok: true }>("/auth/forgot-password", { email: email.trim() });
      setIsSent(true);
    } catch {
      setRequestError("Не удалось отправить запрос. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      subtitle="Введите email, на который мы отправим ссылку для сброса пароля."
      title="Восстановление пароля"
    >
      {isSent ? (
        <div className="space-y-5 text-center">
          <div className="text-4xl">✉</div>
          <div>
            <div className="text-base font-medium text-ink">Ссылка отправлена</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Проверьте <span className="font-medium text-ink">{email}</span>. Письмо может попасть в папку Спам.
            </p>
          </div>
          <button
            className="auth-link text-sm font-medium"
            onClick={() => setIsSent(false)}
            type="button"
          >
            Отправить повторно
          </button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <AuthTextField
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            error={emailError}
            id="forgot-email"
            inputMode="email"
            label="Email"
            onChange={(value) => {
              setEmail(value);
              if (emailError) {
                setEmailError("");
              }
            }}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          {requestError ? <AuthBanner>{requestError}</AuthBanner> : null}
          <button className="auth-btn-primary h-11 text-sm font-medium" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Отправляем..." : "Отправить ссылку"}
          </button>
        </form>
      )}
      <div className="mt-6 text-sm text-muted">
        <Link className="auth-link font-medium" href="/login">
          ← Назад к входу
        </Link>
      </div>
    </AuthShell>
  );
}
