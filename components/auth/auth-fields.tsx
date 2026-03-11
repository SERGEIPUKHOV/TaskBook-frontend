"use client";

import { useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type FieldMetaProps = {
  error?: string;
  hint?: string;
  id: string;
};

type AuthTextFieldProps = FieldMetaProps & {
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "password" | "text";
  value: string;
};

function FieldMeta({ error, hint, id }: FieldMetaProps) {
  return (
    <>
      {error ? (
        <p className="mt-2 text-xs text-danger" id={`${id}-message`}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted" id={`${id}-message`}>
          {hint}
        </p>
      ) : null}
    </>
  );
}

export function AuthBanner({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info" | "success";
}) {
  const toneClassName =
    tone === "success"
      ? "border-success/25 bg-success/10 text-success"
      : tone === "info"
        ? "border-accent/20 bg-accent/10 text-accent"
        : "border-danger/20 bg-danger/10 text-danger";

  return <div className={cn("rounded-[16px] border px-4 py-3 text-sm leading-6", toneClassName)}>{children}</div>;
}

export function AuthTextField({
  autoComplete,
  autoFocus,
  disabled,
  error,
  hint,
  id,
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: AuthTextFieldProps) {
  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error || hint ? `${id}-message` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={cn(
          "auth-input px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60",
          error && "auth-input-error",
        )}
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldMeta error={error} hint={hint} id={id} />
    </div>
  );
}

export function AuthPasswordField({
  autoComplete,
  disabled,
  error,
  hint,
  id,
  label,
  onChange,
  placeholder,
  value,
}: Omit<AuthTextFieldProps, "inputMode" | "type">) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-describedby={error || hint ? `${id}-message` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={cn(
            "auth-input px-3 pr-11 text-sm disabled:cursor-not-allowed disabled:opacity-60",
            error && "auth-input-error",
          )}
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-[14px] text-muted transition-colors hover:text-ink"
          disabled={disabled}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      <FieldMeta error={error} hint={hint} id={id} />
    </div>
  );
}
