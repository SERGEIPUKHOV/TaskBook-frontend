import { NextRequest, NextResponse } from "next/server";

import {
  AGREEMENT_PATH,
  LEGACY_AGREEMENT_PATH,
  SESSION_COOKIE_NAME,
  isGuestOnlyAuthPath,
  isPublicAuthPath,
} from "@/lib/auth-constants";

function normalizePathname(pathname: string): string {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicAuthPath(pathname);
  const isGuestOnlyPath = isGuestOnlyAuthPath(pathname);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === LEGACY_AGREEMENT_PATH || normalizedPathname.startsWith(`${LEGACY_AGREEMENT_PATH}/`)) {
    const suffix = normalizedPathname.slice(LEGACY_AGREEMENT_PATH.length);

    return NextResponse.redirect(new URL(`${AGREEMENT_PATH}${suffix}`, request.url));
  }

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isGuestOnlyPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
