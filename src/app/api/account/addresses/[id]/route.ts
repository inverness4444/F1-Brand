import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { addressInputSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { addressFromDb } from "@/lib/server/account-mappers";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const updateAddressSchema = z.object({
  address: addressInputSchema.optional(),
  isDefault: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  return user;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const [{ id }, user] = await Promise.all([context.params, requireApiUser()]);
    const input = updateAddressSchema.parse(await request.json());
    const existing = await prisma.address.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Адрес не найден." }, { status: 404 });
    }

    const shouldBeDefault = input.isDefault || existing.isDefault;
    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: {
            userId: user.id,
            id: {
              not: id,
            },
          },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(input.address ?? {}),
          isDefault: shouldBeDefault,
        },
      });
    });

    return NextResponse.json({ address: addressFromDb(address) });
  } catch (error) {
    return apiError(error, "Не удалось обновить адрес.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const [{ id }, user] = await Promise.all([context.params, requireApiUser()]);
    const existing = await prisma.address.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      if (existing.isDefault) {
        const nextDefault = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (nextDefault) {
          await tx.address.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось удалить адрес.");
  }
}
