import { NextRequest, NextResponse } from "next/server";

import { handleYooKassaWebhook } from "@/lib/payments/yookassa";
import { apiError } from "@/lib/server/api";

export const runtime = "nodejs";

function assertWebhookSecret(request: NextRequest) {
  const expectedSecret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    return;
  }

  const providedSecret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-yookassa-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (providedSecret !== expectedSecret) {
    throw new Error("forbidden");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertWebhookSecret(request);
    const payload = await request.json();
    const result = await handleYooKassaWebhook(payload);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, "Не удалось обработать webhook ЮKassa.");
  }
}
