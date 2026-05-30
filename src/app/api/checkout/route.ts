import { NextRequest, NextResponse } from "next/server";

import { createCheckoutPayment } from "@/lib/server/checkout-payment";
import { attachCheckoutAccessCookie, getCurrentUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "checkout-create-order", {
      maxAttempts: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток оформления. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertProtectedMutation(request);
    const [payload, currentUser] = await Promise.all([request.json(), getCurrentUser()]);
    const result = await createCheckoutPayment(payload, request.url, currentUser);
    const response = NextResponse.json(result);

    attachCheckoutAccessCookie(response, result.order.id);
    return response;
  } catch (error) {
    return apiError(error, "Не удалось оформить заказ.");
  }
}
