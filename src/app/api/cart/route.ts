import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { cartSelectionsSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { apiError, noStoreJson } from "@/lib/server/api";
import {
  attachGuestCartCookie,
  clearGuestCart,
  clearGuestCartCookie,
  fetchGuestCartSelections,
  fetchUserCartSelections,
  getGuestCartTokenFromRequest,
  saveGuestCartSelections,
  saveUserCartSelections,
} from "@/lib/server/cart";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

const updateCartSchema = z.object({
  items: cartSelectionsSchema,
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      return noStoreJson({ items: await fetchUserCartSelections(user.id) });
    }

    return noStoreJson({
      items: await fetchGuestCartSelections(getGuestCartTokenFromRequest(request)),
    });
  } catch (error) {
    return apiError(error, "Не удалось загрузить корзину.");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "cart-save", {
      maxAttempts: 120,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertProtectedMutation(request);
    const input = updateCartSchema.parse(await request.json());
    const user = await getCurrentUser();

    if (user) {
      await saveUserCartSelections(user.id, input.items);
      return NextResponse.json({ ok: true });
    }

    const result = await saveGuestCartSelections(getGuestCartTokenFromRequest(request), input.items);
    const response = NextResponse.json({ ok: true });

    if (result.token && result.expiresAt) {
      attachGuestCartCookie(response, result.token, result.expiresAt);
    } else {
      clearGuestCartCookie(response);
    }

    return response;
  } catch (error) {
    return apiError(error, "Не удалось сохранить корзину.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "cart-clear", {
      maxAttempts: 60,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertProtectedMutation(request);
    const user = await getCurrentUser();

    if (user) {
      await saveUserCartSelections(user.id, []);
      return NextResponse.json({ ok: true });
    }

    await clearGuestCart(getGuestCartTokenFromRequest(request));
    const response = NextResponse.json({ ok: true });
    clearGuestCartCookie(response);
    return response;
  } catch (error) {
    return apiError(error, "Не удалось очистить корзину.");
  }
}
