import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { handleYooKassaWebhook } from "@/lib/payments/yookassa";
import { apiError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function assertWebhookSecret(request: NextRequest) {
  const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("forbidden");
    }

    return;
  }

  const providedSecret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-yookassa-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    throw new Error("forbidden");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "yookassa-webhook", {
      maxAttempts: 120,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertWebhookSecret(request);
    const payload = await request.json();
    const result = await handleYooKassaWebhook(payload);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, "Не удалось обработать webhook ЮKassa.");
  }
}
