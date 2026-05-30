import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME } from "@/lib/security-utils";

const SESSION_COOKIE_NAME = "apex-store-session-v1";
const ROLE_COOKIE_NAME = "apex-store-role-v1";

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "development-only-auth-secret";
}

function createCsrfToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getVerifiedRole(value?: string) {
  if (!value) {
    return null;
  }

  const [role, signature] = value.split(".");

  if (!role || !signature || !["USER", "ADMIN"].includes(role)) {
    return null;
  }

  const expectedSignature = await hmacHex(role);
  return signature === expectedSignature ? role : null;
}

export async function middleware(request: NextRequest) {
  const isAccountRoute = request.nextUrl.pathname.startsWith("/account");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if ((isAccountRoute || isAdminRoute) && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && hasSessionCookie) {
    const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value;
    const role = await getVerifiedRole(roleCookie);

    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
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
