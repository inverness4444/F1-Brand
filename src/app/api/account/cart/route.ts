import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { cartSelectionsSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { apiError, noStoreJson } from "@/lib/server/api";
import { prisma } from "@/lib/prisma";
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
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return noStoreJson({
      items: cart.items.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
    });
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
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      for (const item of input.items) {
        const variant = await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: { value: item.size },
            color: { value: item.color },
            active: true,
          },
        });

        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            variantId: variant?.id,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось сохранить корзину.");
  }
}
