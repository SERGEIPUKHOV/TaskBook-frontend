"use client";

import type {
  AuthResponse,
  ChangePasswordRequest,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/lib/auth-types";

type ApiEnvelope<T> = {
  data: T;
};

type RequestBody =
  | ChangePasswordRequest
  | DeleteAccountRequest
  | ForgotPasswordRequest
  | LoginRequest
  | null
  | Record<string, unknown>
  | RegisterRequest
  | ResetPasswordRequest;

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

function shouldAttemptRefresh(path: string): boolean {
  return !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/register") &&
    !path.startsWith("/auth/forgot-password") &&
    !path.startsWith("/auth/logout") &&
    !path.startsWith("/auth/reset-password") &&
    !path.startsWith("/auth/refresh");
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function performRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    const error = new Error("Request failed") as Error & { status?: number };
    error.status = response.status;

    try {
      const json = await response.json();
      error.message = String(json.detail ?? response.statusText ?? "Request failed");
    } catch {
      error.message = response.statusText || "Request failed";
    }

    throw error;
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  return response.json() as Promise<ApiEnvelope<T>>;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    await performRequest<Pick<AuthResponse, "access_token" | "refresh_token">>("/auth/refresh", {
      method: "POST",
    });
    return true;
  } catch {
    return false;
  }
}

async function clearServerSession(): Promise<void> {
  try {
    await performRequest("/auth/logout", {
      body: JSON.stringify({}),
      method: "POST",
    });
  } catch {
    // Ignore cleanup failures and continue redirecting the user to login.
  }
}

async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  try {
    const json = await performRequest<T>(path, init);
    return json.data;
  } catch (error) {
    const typedError = error as Error & { status?: number };

    if (typedError.status === 401 && allowRetry && shouldAttemptRefresh(path)) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        return request<T>(path, init, false);
      }

      await clearServerSession();

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    throw typedError;
  }
}

export const api = {
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  deleteWithBody: <T>(path: string, body: unknown) =>
    request<T>(path, { body: JSON.stringify(body), method: "DELETE" }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { body: JSON.stringify(body), method: "PATCH" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { body: JSON.stringify(body), method: "POST" }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { body: JSON.stringify(body), method: "PUT" }),
};
