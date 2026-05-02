import { NextRequest, NextResponse } from "next/server";

import {
  AGREEMENT_INTERNAL_PATH,
  AGREEMENT_PATH,
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

  if (normalizedPathname === AGREEMENT_PATH || normalizedPathname.startsWith(`${AGREEMENT_PATH}/`)) {
    const suffix = normalizedPathname.slice(AGREEMENT_PATH.length);

    return NextResponse.rewrite(new URL(`${AGREEMENT_INTERNAL_PATH}${suffix}`, request.url));
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
