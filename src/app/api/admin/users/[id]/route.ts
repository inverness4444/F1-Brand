import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { normalizeEmail } from "@/lib/account-utils";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/server/api";
import { requireAdminApiUser } from "@/lib/server/admin-auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { adminUserUpdateSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function revalidateAdminUserPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/addresses");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-user-update", {
      maxAttempts: 40,
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

    const [{ id }, admin] = await Promise.all([context.params, requireAdminApiUser()]);
    const input = adminUserUpdateSchema.parse(await request.json());
    const email = normalizeEmail(input.email);
    const [targetUser, duplicateUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      }),
      prisma.user.findFirst({
        where: {
          email,
          id: {
            not: id,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    if (duplicateUser) {
      return NextResponse.json({ error: "Этот email уже используется." }, { status: 409 });
    }

    if (targetUser.id === admin.id && (input.role !== "ADMIN" || input.status !== "ACTIVE")) {
      return NextResponse.json(
        { error: "Нельзя снять свою admin-роль или отключить собственный аккаунт." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const removesActiveAdmin =
        targetUser.role === "ADMIN" &&
        targetUser.status === "ACTIVE" &&
        (input.role !== "ADMIN" || input.status !== "ACTIVE");

      if (removesActiveAdmin) {
        const activeAdminCount = await tx.user.count({
          where: {
            role: "ADMIN",
            status: "ACTIVE",
          },
        });

        if (activeAdminCount <= 1) {
          throw new Error("last-admin");
        }
      }

      await tx.user.update({
        where: { id },
        data: {
          name: input.name,
          email,
          phone: input.phone || null,
          role: input.role,
          status: input.status,
          birthday: input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : null,
          favoriteDriver: input.favoriteDriver,
          favoriteTeam: input.favoriteTeam,
        },
        select: {
          id: true,
        },
      });

      if (input.status === "DISABLED") {
        await tx.session.deleteMany({
          where: {
            userId: id,
          },
        });
      }
    });

    revalidateAdminUserPaths(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "last-admin") {
      return NextResponse.json(
        { error: "Нельзя снять роль или отключить последнего активного администратора." },
        { status: 400 },
      );
    }

    return apiError(error, "Не удалось сохранить пользователя.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-user-disable", {
      maxAttempts: 30,
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

    const [{ id }, admin] = await Promise.all([context.params, requireAdminApiUser()]);

    if (id === admin.id) {
      return NextResponse.json({ error: "Нельзя отключить собственный аккаунт." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      if (targetUser.role === "ADMIN" && targetUser.status === "ACTIVE") {
        const activeAdminCount = await tx.user.count({
          where: {
            role: "ADMIN",
            status: "ACTIVE",
          },
        });

        if (activeAdminCount <= 1) {
          throw new Error("last-admin");
        }
      }

      await tx.user.update({
        where: { id },
        data: {
          status: "DISABLED",
        },
        select: {
          id: true,
        },
      });
      await tx.session.deleteMany({
        where: {
          userId: id,
        },
      });
    });

    revalidateAdminUserPaths(id);

    return NextResponse.json({ ok: true, disabled: true });
  } catch (error) {
    if (error instanceof Error && error.message === "last-admin") {
      return NextResponse.json(
        { error: "Нельзя отключить последнего активного администратора." },
        { status: 400 },
      );
    }

    return apiError(error, "Не удалось отключить пользователя.");
  }
}
