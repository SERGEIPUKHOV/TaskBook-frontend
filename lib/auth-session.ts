"use client";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-constants";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (!isBrowser()) {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getStoredAccessToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredSession(accessToken: string, refreshToken: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  setCookie(SESSION_COOKIE_NAME, "1", 60 * 60 * 24 * 30);
}

export function updateStoredAccessToken(accessToken: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  setCookie(SESSION_COOKIE_NAME, "1", 60 * 60 * 24 * 30);
}

export function clearStoredSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  clearCookie(SESSION_COOKIE_NAME);
}
