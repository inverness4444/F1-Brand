import "server-only";

import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const notificationOrderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  paymentStatus: true,
  customerName: true,
  customerEmail: true,
  totalAmount: true,
  currency: true,
  items: {
    select: {
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

type NotificationOrder = Prisma.OrderGetPayload<{ select: typeof notificationOrderSelect }>;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function orderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "PROCESSING":
      return "В обработке";
    case "SHIPPED":
      return "Передан в доставку";
    case "DELIVERED":
      return "Доставлен";
    case "CANCELLED":
      return "Отменён";
    case "REFUNDED":
      return "Возврат";
    case "PENDING":
    default:
      return "Создан";
  }
}

function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "ожидает оплаты";
    case "WAITING_FOR_CAPTURE":
      return "ожидает списания";
    case "SUCCEEDED":
      return "оплачено";
    case "CANCELED":
      return "отменено";
    case "REFUNDED":
      return "возврат";
    case "FAILED":
      return "ошибка оплаты";
    case "NOT_STARTED":
    default:
      return "не начата";
  }
}

function getOrderItemCount(order: NotificationOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

async function upsertNotification(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    orderId?: string | null;
    type: "ORDER_CREATED" | "ORDER_PAID" | "ORDER_STATUS_UPDATED" | "ADMIN_NEW_ORDER";
    title: string;
    message: string;
    dedupeKey: string;
  },
) {
  await tx.siteNotification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: input,
    update: {},
  });
}

function logNotificationFailure(scope: string, orderId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown notification error.";
  console.warn(`Internal notification failed: ${scope}`, { orderId, message });
}

async function getNotificationOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: notificationOrderSelect,
  });
}

export async function notifyOrderCreatedOnSite(orderId: string) {
  try {
    const order = await getNotificationOrder(orderId);

    if (!order) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (order.userId) {
        await upsertNotification(tx, {
          userId: order.userId,
          orderId: order.id,
          type: "ORDER_CREATED",
          title: "Заказ создан",
          message:
            order.paymentStatus === "SUCCEEDED"
              ? `Ваш заказ №${order.orderNumber} создан и оплачен.`
              : `Ваш заказ №${order.orderNumber} создан и ожидает оплаты.`,
          dedupeKey: `user:order-created:${order.id}`,
        });
      }

      const admins = await tx.user.findMany({
        where: {
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      for (const admin of admins) {
        await upsertNotification(tx, {
          userId: admin.id,
          orderId: order.id,
          type: "ADMIN_NEW_ORDER",
          title: "Новый заказ",
          message: [
            `Заказ №${order.orderNumber}`,
            formatAmount(order.totalAmount, order.currency),
            `${order.customerName} (${order.customerEmail})`,
            `${getOrderItemCount(order)} шт.`,
            `Оплата: ${paymentStatusLabel(order.paymentStatus)}`,
          ].join(" · "),
          dedupeKey: `admin:new-order:${order.id}:${admin.id}`,
        });
      }
    });
  } catch (error) {
    logNotificationFailure("order-created", orderId, error);
  }
}

export async function notifyOrderPaidOnSite(orderId: string) {
  try {
    const order = await getNotificationOrder(orderId);

    if (!order?.userId) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await upsertNotification(tx, {
        userId: order.userId!,
        orderId: order.id,
        type: "ORDER_PAID",
        title: "Оплата получена",
        message: `Оплата по заказу №${order.orderNumber} успешно получена.`,
        dedupeKey: `user:order-paid:${order.id}`,
      });
    });
  } catch (error) {
    logNotificationFailure("order-paid", orderId, error);
  }
}

export async function recordOrderStatusChange(
  tx: Prisma.TransactionClient,
  input: {
    order: {
      id: string;
      orderNumber: string;
      userId: string | null;
      status: OrderStatus;
    };
    adminUserId: string;
    newStatus: OrderStatus;
  },
) {
  if (input.order.status === input.newStatus) {
    return null;
  }

  const log = await tx.orderStatusChangeLog.create({
    data: {
      orderId: input.order.id,
      adminUserId: input.adminUserId,
      oldStatus: input.order.status,
      newStatus: input.newStatus,
    },
    select: {
      id: true,
    },
  });

  if (input.order.userId) {
    await upsertNotification(tx, {
      userId: input.order.userId,
      orderId: input.order.id,
      type: "ORDER_STATUS_UPDATED",
      title: "Статус заказа обновлён",
      message: `Ваш заказ №${input.order.orderNumber} получил статус: ${orderStatusLabel(input.newStatus)}.`,
      dedupeKey: `user:order-status:${log.id}`,
    });
  }

  return log;
}
