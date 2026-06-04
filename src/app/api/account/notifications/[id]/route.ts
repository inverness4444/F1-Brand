import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await enforceRateLimit(request, "account-notification-read", {
      maxAttempts: 120,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertSameOrigin(request);
    assertCsrfToken(request);

    const user = await getCurrentUser();
    if (!user) {
      throw new Error("unauthorized");
    }

    const { id } = await context.params;
    const updated = await prisma.siteNotification.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Уведомление не найдено." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось обновить уведомление.");
  }
}
