import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { cartSelectionsSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { fetchUserCartSelections, saveUserCartSelections } from "@/lib/server/cart";
import { apiError, noStoreJson } from "@/lib/server/api";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

const updateCartSchema = z.object({
  items: cartSelectionsSchema,
});

async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireApiUser();
    return noStoreJson({ items: await fetchUserCartSelections(user.id) });
  } catch (error) {
    return apiError(error, "Не удалось загрузить корзину.");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "account-cart-save", {
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
    const user = await requireApiUser();
    const input = updateCartSchema.parse(await request.json());
    await saveUserCartSelections(user.id, input.items);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось сохранить корзину.");
  }
}
