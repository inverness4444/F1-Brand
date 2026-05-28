import "server-only";

import crypto from "node:crypto";

import type { Session, User, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

import type { AuthSession, AuthUser } from "@/lib/account-types";
import { prisma } from "@/lib/server/db";

export const SESSION_COOKIE_NAME = "apex-store-session-v1";

const DAY_MS = 24 * 60 * 60 * 1000;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return "development-only-auth-secret";
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function getSessionDurationMs(rememberMe: boolean) {
  return rememberMe ? 30 * DAY_MS : DAY_MS;
}

export function toAuthRole(role: UserRole): AuthUser["role"] {
  return role === "ADMIN" ? "admin" : "customer";
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    role: toAuthRole(user.role),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
    favoriteDriver: user.favoriteDriver,
    favoriteTeam: user.favoriteTeam,
    acceptedLegalAt: user.acceptedLegalAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAuthSession(session: Session): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    rememberMe: session.remember,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function getSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentSession(token?: string | null) {
  const sessionToken = token ?? (await getSessionTokenFromCookies());

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    redirect("/account");
  }

  return user;
}
