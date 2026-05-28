import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { addressInputSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { addressFromDb } from "@/lib/server/account-mappers";
import { apiError, noStoreJson } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const createAddressSchema = z.object({
  address: addressInputSchema,
  isDefault: z.boolean().default(false),
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
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return noStoreJson({ addresses: addresses.map(addressFromDb) });
  } catch (error) {
    return apiError(error, "Не удалось загрузить адреса.");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const input = createAddressSchema.parse(await request.json());
    const addressCount = await prisma.address.count({ where: { userId: user.id } });
    const shouldBeDefault = input.isDefault || addressCount === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId: user.id,
          ...input.address,
          isDefault: shouldBeDefault,
        },
      });
    });

    return NextResponse.json({ address: addressFromDb(address) });
  } catch (error) {
    return apiError(error, "Не удалось сохранить адрес.");
  }
}
