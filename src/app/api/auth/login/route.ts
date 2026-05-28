import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/account-utils";
import { loginPayloadSchema } from "@/lib/validation-schemas";
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

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const rateLimit = enforceRateLimit(request, "auth-login", {
      maxAttempts: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток входа. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const input = loginPayloadSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }

    await prisma.session.deleteMany({
      where: {
        OR: [
          {
            userId: user.id,
            expiresAt: {
              lte: new Date(),
            },
          },
        ],
      },
    });

    await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    await prisma.userBalance.upsert({
      where: { userId: user.id },
      create: { userId: user.id, amountCents: 0 },
      update: {},
    });

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + getSessionDurationMs(input.rememberMe));
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        remember: input.rememberMe,
        expiresAt,
      },
    });
    const response = NextResponse.json({
      user: toAuthUser(user),
      session: toAuthSession(session),
    });
    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return apiError(error, "Не удалось выполнить вход.");
  }
}
