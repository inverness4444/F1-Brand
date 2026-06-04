import { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/server/api";
import { requireAdminApiUser } from "@/lib/server/admin-auth";
import {
  notifyOrderPaidOnSite,
  recordOrderStatusChange,
} from "@/lib/server/notifications";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { adminOrderUpdateSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function paymentDateUpdates(status: PaymentStatus) {
  const now = new Date();

  return {
    ...(status === "SUCCEEDED" ? { paidAt: now, capturedAt: now } : {}),
    ...(status === "CANCELED" ? { canceledAt: now } : {}),
    ...(status === "REFUNDED" ? { refundedAt: now } : {}),
  };
}

function revalidateAdminOrderPaths(orderId: string, userId?: string | null) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/addresses");

  if (userId) {
    revalidatePath(`/admin/users/${userId}`);
  }

  revalidatePath("/account/notifications");
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-order-update", {
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
    const admin = await requireAdminApiUser();

    const { id } = await context.params;
    const input = adminOrderUpdateSchema.parse(await request.json());
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
        ...(input.fulfillmentStatus ? { fulfillmentStatus: input.fulfillmentStatus } : {}),
        ...(input.customer
          ? {
              customerName: input.customer.name,
              customerEmail: input.customer.email,
              customerPhone: input.customer.phone,
            }
          : {}),
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        ...("shippingAddress" in input
          ? {
              deliveryAddressSnapshot:
                input.shippingAddress === null
                  ? Prisma.DbNull
                  : (input.shippingAddress as Prisma.InputJsonValue),
            }
          : {}),
      };

      await tx.order.update({
        where: { id },
        data,
        select: {
          id: true,
        },
      });

      if (input.status) {
        await recordOrderStatusChange(tx, {
          order: existingOrder,
          adminUserId: admin.id,
          newStatus: input.status,
        });
      }

      if (input.paymentStatus) {
        await tx.payment.updateMany({
          where: { orderId: id },
          data: {
            status: input.paymentStatus,
            ...paymentDateUpdates(input.paymentStatus),
          },
        });
      }
    });

    revalidateAdminOrderPaths(id, existingOrder.userId);

    if (input.paymentStatus === "SUCCEEDED") {
      await notifyOrderPaidOnSite(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Не удалось сохранить заказ.");
  }
}
