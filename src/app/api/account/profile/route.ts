import { NextRequest, NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/account-utils";
import { profilePayloadSchema } from "@/lib/validation-schemas";
import { getCurrentUser, toAuthUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("unauthorized");
    }

    const input = profilePayloadSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    const duplicatedUser = await prisma.user.findFirst({
      where: {
        email,
        id: {
          not: user.id,
        },
      },
    });

    if (duplicatedUser) {
      return NextResponse.json({ error: "Этот email уже используется." }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        email,
        phone: input.phone,
        birthday: input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : null,
        favoriteDriver: input.favoriteDriver,
        favoriteTeam: input.favoriteTeam,
      },
    });

    return NextResponse.json({ user: toAuthUser(updatedUser) });
  } catch (error) {
    return apiError(error, "Не удалось сохранить профиль.");
  }
}
