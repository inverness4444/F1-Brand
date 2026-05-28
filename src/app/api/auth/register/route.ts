import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/account-utils";
import { registerPayloadSchema } from "@/lib/validation-schemas";
import {
  attachSessionCookie,
  createSessionToken,
  getSessionDurationMs,
  hashSessionToken,
  toAuthSession,
  toAuthUser,
} from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

function roleForEmail(email: string) {
  const adminEmails = new Set(
    [process.env.SEED_ADMIN_EMAIL, process.env.ADMIN_EMAILS, process.env.NEXT_PUBLIC_ADMIN_EMAILS]
      .filter(Boolean)
      .flatMap((value) => value!.split(","))
      .map((value) => normalizeEmail(value))
      .filter(Boolean),
  );

  return adminEmails.has(email) ? "ADMIN" : "USER";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const rateLimit = enforceRateLimit(request, "auth-register", {
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток регистрации. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const input = registerPayloadSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + getSessionDurationMs(true));
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: roleForEmail(email),
        sessions: {
          create: {
            tokenHash: hashSessionToken(token),
            remember: true,
            expiresAt,
          },
        },
        carts: {
          create: {},
        },
        balance: {
          create: {
            amountCents: 0,
          },
        },
      },
      include: {
        sessions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const response = NextResponse.json({
      user: toAuthUser(user),
      session: toAuthSession(user.sessions[0]),
    });
    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return apiError(error, "Не удалось создать аккаунт.");
  }
}
