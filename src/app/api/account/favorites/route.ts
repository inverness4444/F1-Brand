import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/auth";
import { apiError, noStoreJson } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const favoritePayloadSchema = z.object({
  productId: z.string().min(1),
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
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return noStoreJson({
      favorites: favorites.map((favorite) => ({
        id: favorite.id,
        userId: favorite.userId,
        productId: favorite.productId,
        createdAt: favorite.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error, "Не удалось загрузить избранное.");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const input = favoritePayloadSchema.parse(await request.json());
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: input.productId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ active: false });
    }

    await prisma.favorite.create({
      data: {
        userId: user.id,
        productId: input.productId,
      },
    });

    return NextResponse.json({ active: true });
  } catch (error) {
    return apiError(error, "Не удалось обновить избранное.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const input = favoritePayloadSchema.parse(await request.json());

    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        productId: input.productId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось удалить товар из избранного.");
  }
}
