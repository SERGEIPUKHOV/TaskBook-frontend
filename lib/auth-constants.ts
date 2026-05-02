export const SESSION_COOKIE_NAME = "taskbook_session";
export const ACCESS_TOKEN_STORAGE_KEY = "taskbook_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "taskbook_refresh_token";

export const AGREEMENT_PATH = "/соглашение";
export const AGREEMENT_INTERNAL_PATH = "/agreement";
export const GUEST_ONLY_AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"] as const;
export const PUBLIC_AUTH_PATHS = [
  ...GUEST_ONLY_AUTH_PATHS,
  "/auth/impersonate",
  AGREEMENT_PATH,
  AGREEMENT_INTERNAL_PATH,
] as const;

function normalizePathname(pathname: string): string {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

export function isPublicAuthPath(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path) || normalizedPathname.startsWith(path));
}

export function isGuestOnlyAuthPath(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return GUEST_ONLY_AUTH_PATHS.some((path) => pathname.startsWith(path) || normalizedPathname.startsWith(path));
}
