import "server-only";

import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";

import type { CartSelection } from "@/lib/account-types";
import { GUEST_CART_COOKIE_NAME } from "@/lib/cookie-constants";
import { shouldUseSecureCookies } from "@/lib/cookie-utils";
import { prisma } from "@/lib/prisma";
import { SECURITY_LIMITS } from "@/lib/security-utils";
import { hashSessionToken } from "@/lib/server/auth";
import { cartSelectionSchema } from "@/lib/validation-schemas";

const GUEST_CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const GUEST_CART_TOKEN_REGEX = /^[a-z0-9_-]{32,128}$/i;

type CartItemLike = {
  productId: string;
  color: string;
  size: string;
  quantity: number;
};

function createGuestCartToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeGuestCartToken(token: string | null | undefined) {
  if (!token || !GUEST_CART_TOKEN_REGEX.test(token)) {
    return null;
  }

  return token;
}

function hashGuestCartToken(token: string) {
  return hashSessionToken(`guest-cart:${token}`);
}

function getGuestCartExpiresAt() {
  return new Date(Date.now() + GUEST_CART_MAX_AGE_SECONDS * 1000);
}

function toCartSelections(items: CartItemLike[]): CartSelection[] {
  return items
    .map((item) =>
      cartSelectionSchema.safeParse({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      }),
    )
    .filter((result): result is { success: true; data: CartSelection } => result.success)
    .map((result) => result.data);
}

function normalizeCartSelections(items: CartSelection[]) {
  const merged = new Map<string, CartSelection>();

  for (const item of items) {
    const key = `${item.productId}:${item.color}:${item.size}`;
    const current = merged.get(key);
    const quantity = Math.max(
      1,
      Math.min(
        (current?.quantity ?? 0) + item.quantity,
        SECURITY_LIMITS.maxCartItemQuantity,
      ),
    );

    merged.set(key, {
      ...item,
      quantity,
    });
  }

  return [...merged.values()];
}

async function resolveAvailableCartItem(tx: Prisma.TransactionClient, item: CartSelection) {
  const variant = await tx.productVariant.findFirst({
    where: {
      productId: item.productId,
      active: true,
      size: { value: item.size },
      color: { value: item.color },
      product: { status: "ACTIVE" },
    },
    select: {
      id: true,
      stock: true,
      product: {
        select: {
          requiresShipping: true,
        },
      },
    },
  });

  if (!variant) {
    return null;
  }

  if (variant.product.requiresShipping && variant.stock <= 0) {
    return null;
  }

  return {
    ...item,
    variantId: variant.id,
    stockLimit: variant.product.requiresShipping
      ? Math.min(variant.stock, SECURITY_LIMITS.maxCartItemQuantity)
      : SECURITY_LIMITS.maxCartItemQuantity,
    quantity: variant.product.requiresShipping ? Math.min(item.quantity, variant.stock) : item.quantity,
  };
}

async function replaceCartItems(
  tx: Prisma.TransactionClient,
  cartId: string,
  items: CartSelection[],
  target: "user" | "guest",
) {
  if (target === "user") {
    await tx.cartItem.deleteMany({ where: { cartId } });
  } else {
    await tx.guestCartItem.deleteMany({ where: { cartId } });
  }

  for (const item of normalizeCartSelections(items)) {
    const resolvedItem = await resolveAvailableCartItem(tx, item);

    if (!resolvedItem) {
      continue;
    }

    if (target === "user") {
      await tx.cartItem.create({
        data: {
          cartId,
          productId: resolvedItem.productId,
          variantId: resolvedItem.variantId,
          color: resolvedItem.color,
          size: resolvedItem.size,
          quantity: resolvedItem.quantity,
        },
      });
      continue;
    }

    await tx.guestCartItem.create({
      data: {
        cartId,
        productId: resolvedItem.productId,
        variantId: resolvedItem.variantId,
        color: resolvedItem.color,
        size: resolvedItem.size,
        quantity: resolvedItem.quantity,
      },
    });
  }
}

export function getGuestCartTokenFromRequest(request: NextRequest) {
  return normalizeGuestCartToken(request.cookies.get(GUEST_CART_COOKIE_NAME)?.value);
}

export function attachGuestCartCookie(response: NextResponse, token: string, expiresAt = getGuestCartExpiresAt()) {
  response.cookies.set({
    name: GUEST_CART_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: expiresAt,
    maxAge: GUEST_CART_MAX_AGE_SECONDS,
  });
}

export function clearGuestCartCookie(response: NextResponse) {
  response.cookies.set({
    name: GUEST_CART_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  });
}

export async function fetchUserCartSelections(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return toCartSelections(cart.items);
}

export async function saveUserCartSelections(userId: string, items: CartSelection[]) {
  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await replaceCartItems(tx, cart.id, items, "user");
  });
}

export async function fetchGuestCartSelections(token: string | null | undefined) {
  const normalizedToken = normalizeGuestCartToken(token);

  if (!normalizedToken) {
    return [];
  }

  const tokenHash = hashGuestCartToken(normalizedToken);
  const cart = await prisma.guestCart.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    return [];
  }

  if (cart.expiresAt.getTime() <= Date.now()) {
    await prisma.guestCart.delete({ where: { id: cart.id } }).catch(() => undefined);
    return [];
  }

  return toCartSelections(cart.items);
}

export async function saveGuestCartSelections(token: string | null | undefined, items: CartSelection[]) {
  const normalizedItems = normalizeCartSelections(items);
  const existingToken = normalizeGuestCartToken(token);

  if (normalizedItems.length === 0) {
    if (existingToken) {
      await clearGuestCart(existingToken);
    }

    return { token: null, expiresAt: null };
  }

  const nextToken = existingToken ?? createGuestCartToken();
  const expiresAt = getGuestCartExpiresAt();
  const tokenHash = hashGuestCartToken(nextToken);

  await prisma.$transaction(async (tx) => {
    await tx.guestCart.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    const cart = await tx.guestCart.upsert({
      where: { sessionTokenHash: tokenHash },
      create: {
        sessionTokenHash: tokenHash,
        expiresAt,
      },
      update: {
        expiresAt,
      },
    });

    await replaceCartItems(tx, cart.id, normalizedItems, "guest");
  });

  return { token: nextToken, expiresAt };
}

export async function clearGuestCart(token: string | null | undefined) {
  const normalizedToken = normalizeGuestCartToken(token);

  if (!normalizedToken) {
    return;
  }

  await prisma.guestCart
    .delete({
      where: { sessionTokenHash: hashGuestCartToken(normalizedToken) },
    })
    .catch(() => undefined);
}

export async function mergeGuestCartIntoUserCart(token: string | null | undefined, userId: string) {
  const normalizedToken = normalizeGuestCartToken(token);

  if (!normalizedToken) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const guestCart = await tx.guestCart.findUnique({
      where: { sessionTokenHash: hashGuestCartToken(normalizedToken) },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!guestCart) {
      return;
    }

    if (guestCart.expiresAt.getTime() <= Date.now()) {
      await tx.guestCart.delete({ where: { id: guestCart.id } });
      return;
    }

    const userCart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const item of guestCart.items) {
      const parsedItem = cartSelectionSchema.safeParse(item);

      if (!parsedItem.success) {
        continue;
      }

      const resolvedItem = await resolveAvailableCartItem(tx, parsedItem.data);

      if (!resolvedItem) {
        continue;
      }

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_productId_color_size: {
            cartId: userCart.id,
            productId: resolvedItem.productId,
            color: resolvedItem.color,
            size: resolvedItem.size,
          },
        },
      });

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(
              existing.quantity + resolvedItem.quantity,
              resolvedItem.stockLimit,
            ),
          },
        });
        continue;
      }

      await tx.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: resolvedItem.productId,
          variantId: resolvedItem.variantId,
          color: resolvedItem.color,
          size: resolvedItem.size,
          quantity: Math.min(resolvedItem.quantity, resolvedItem.stockLimit),
        },
      });
    }

    await tx.guestCart.delete({ where: { id: guestCart.id } });
  });
}
