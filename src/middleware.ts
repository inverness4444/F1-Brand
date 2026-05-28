import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME } from "@/lib/security-utils";

const SESSION_COOKIE_NAME = "apex-store-session-v1";

function createCsrfToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function middleware(request: NextRequest) {
  const isAccountRoute = request.nextUrl.pathname.startsWith("/account");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if ((isAccountRoute || isAdminRoute) && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: createCsrfToken(),
      httpOnly: false,
      sameSite: "lax",
      secure: !isDevelopment,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"],
};
