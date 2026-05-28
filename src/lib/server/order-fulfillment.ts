import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { generateGiftCertificateCode } from "@/lib/gift-certificate-utils";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function deductStockForPaidOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.stockDeducted) {
    return false;
  }

  for (const item of order.items) {
    if (!item.requiresShipping || !item.variantId) {
      continue;
    }

    const updated = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (updated.count !== 1) {
      throw new Error(`Недостаточно товара на складе: ${item.productName}.`);
    }

    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        type: "SALE",
        quantity: -item.quantity,
        note: order.orderNumber,
      },
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      stockDeducted: true,
      stockDeductedAt: new Date(),
    },
  });

  return true;
}

export async function issueGiftCertificatesForPaidOrder(tx: Tx, orderId: string) {
  const existingCount = await tx.giftCard.count({
    where: { orderId },
  });

  if (existingCount > 0) {
    return false;
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return false;
  }

  const giftCertificateItems = order.items.filter((item) => item.productKind === "gift_certificate");

  if (giftCertificateItems.length === 0) {
    return false;
  }

  const existingCodes = new Set((await tx.giftCard.findMany({ select: { code: true } })).map((item) => item.code));

  for (const item of giftCertificateItems) {
    for (let index = 0; index < item.quantity; index += 1) {
      const code = generateGiftCertificateCode(existingCodes);
      existingCodes.add(code);
      await tx.giftCard.create({
        data: {
          code,
          amountCents: item.unitPrice,
          status: "ACTIVE",
          purchasedByUserId: order.userId,
          orderId: order.id,
        },
      });
    }
  }

  return true;
}

export async function refundOrderBalancePayment(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
  });

  if (!order?.userId || order.amountPaidByBalanceCents <= 0) {
    return false;
  }

  const existingRefund = await tx.balanceTransaction.findFirst({
    where: {
      orderId,
      type: "refund",
      amountCents: order.amountPaidByBalanceCents,
    },
  });

  if (existingRefund) {
    return false;
  }

  const balance = await tx.userBalance.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, amountCents: 0 },
    update: {},
  });
  const balanceAfter = balance.amountCents + order.amountPaidByBalanceCents;

  await tx.userBalance.update({
    where: { userId: order.userId },
    data: { amountCents: balanceAfter },
  });
  await tx.balanceTransaction.create({
    data: {
      userId: order.userId,
      type: "refund",
      amountCents: order.amountPaidByBalanceCents,
      balanceBeforeCents: balance.amountCents,
      balanceAfterCents: balanceAfter,
      orderId,
    },
  });

  return true;
}

export type OrderItemSnapshot = Prisma.OrderItemCreateWithoutOrderInput;
