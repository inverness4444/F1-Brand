import { NextRequest, NextResponse } from "next/server";

import { createCheckoutPayment } from "@/lib/server/checkout-payment";
import { attachCheckoutAccessCookie, getCurrentUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import {
  clearGuestCart,
  clearGuestCartCookie,
  fetchGuestCartSelections,
  fetchUserCartSelections,
  getGuestCartTokenFromRequest,
} from "@/lib/server/cart";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";
import type { CartSelection } from "@/lib/account-types";

export const runtime = "nodejs";

function withServerCartSelections(payload: unknown, selections: CartSelection[]) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  return {
    ...payload,
    selections,
  };
}

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
    const guestCartToken = getGuestCartTokenFromRequest(request);
    const cartSelections = currentUser
      ? await fetchUserCartSelections(currentUser.id)
      : await fetchGuestCartSelections(guestCartToken);
    const result = await createCheckoutPayment(
      withServerCartSelections(payload, cartSelections),
      request.url,
      currentUser,
    );
    const response = NextResponse.json(result);

    attachCheckoutAccessCookie(response, result.order.id);

    if (!currentUser) {
      await clearGuestCart(guestCartToken);
      clearGuestCartCookie(response);
    }

    return response;
  } catch (error) {
    return apiError(error, "Не удалось оформить заказ.");
  }
}
