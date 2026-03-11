import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, isGuestOnlyAuthPath, isPublicAuthPath } from "@/lib/auth-constants";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicAuthPath(pathname);
  const isGuestOnlyPath = isGuestOnlyAuthPath(pathname);

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
