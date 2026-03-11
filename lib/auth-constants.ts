export const SESSION_COOKIE_NAME = "taskbook_session";
export const ACCESS_TOKEN_STORAGE_KEY = "taskbook_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "taskbook_refresh_token";

export const GUEST_ONLY_AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"] as const;
export const PUBLIC_AUTH_PATHS = [...GUEST_ONLY_AUTH_PATHS, "/auth/impersonate"] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
}

export function isGuestOnlyAuthPath(pathname: string): boolean {
  return GUEST_ONLY_AUTH_PATHS.some((path) => pathname.startsWith(path));
}
