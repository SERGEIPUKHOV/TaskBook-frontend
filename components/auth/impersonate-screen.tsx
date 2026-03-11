"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

export function ImpersonateScreen({ code }: { code?: string }) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (!code) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    clearSession();

    fetch(`${API_BASE}/auth/exchange-impersonate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Invalid impersonation link");
        }

        if (!cancelled) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-line bg-paper p-8 text-center shadow-soft">
        {status === "loading" ? (
          <>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">TaskBook</div>
            <h1 className="mt-3 text-2xl font-semibold text-ink">Вход...</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Подготавливаем временную сессию пользователя и перенаправляем в дашборд.
            </p>
          </>
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">TaskBook</div>
            <h1 className="mt-3 text-2xl font-semibold text-ink">Ссылка недействительна</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Ссылка недействительна или устарела.</p>
            <Link
              className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
              href="/"
            >
              На главную
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
