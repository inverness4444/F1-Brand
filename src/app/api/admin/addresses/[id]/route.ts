import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/server/api";
import { addressFromDb } from "@/lib/server/account-mappers";
import { requireAdminApiUser } from "@/lib/server/admin-auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { adminAddressUpdateSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function revalidateAdminAddressPaths(userId: string) {
  revalidatePath("/admin/addresses");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-address-update", {
      maxAttempts: 50,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertSameOrigin(request);
    assertCsrfToken(request);
    await requireAdminApiUser();

    const { id } = await context.params;
    const input = adminAddressUpdateSchema.parse(await request.json());
    const existingAddress = await prisma.address.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existingAddress) {
      return NextResponse.json({ error: "Адрес не найден." }, { status: 404 });
    }

    const address = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({
          where: {
            userId: existingAddress.userId,
            id: {
              not: id,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...input.address,
          isDefault: input.isDefault,
        },
      });
    });

    revalidateAdminAddressPaths(existingAddress.userId);

    return NextResponse.json({ address: addressFromDb(address) });
  } catch (error) {
    return apiError(error, "Не удалось сохранить адрес.");
  }
}
