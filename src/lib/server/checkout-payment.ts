import "server-only";

import crypto from "node:crypto";

import type { Prisma, User } from "@prisma/client";

import type { CheckoutPayload } from "@/lib/account-types";
import { buildOrderNumber } from "@/lib/account-utils";
import { calculateBalanceUsage } from "@/lib/balance-utils";
import {
  buildYooKassaReceipt,
  createYooKassaPayment,
  getYooKassaErrorDetails,
  getYooKassaProviderMode,
} from "@/lib/payments/yookassa";
import { orderFromDb } from "@/lib/server/account-mappers";
import { dbOrderInclude } from "@/lib/server/catalog-db";
import { prisma } from "@/lib/prisma";
import { recordAnalyticsEvent } from "@/lib/server/analytics";
import {
  deductStockForPaidOrder,
  issueGiftCertificatesForPaidOrder,
  refundOrderBalancePayment,
} from "@/lib/server/order-fulfillment";
import {
  notifyOrderCreatedOnSite,
  notifyOrderPaidOnSite,
} from "@/lib/server/notifications";
import { checkoutPayloadSchema } from "@/lib/validation-schemas";

const DEFAULT_CURRENCY = "RUB";
const FREE_DELIVERY_THRESHOLD = 4000;
const STANDARD_DELIVERY_AMOUNT = 390;

type CheckoutVariant = Prisma.ProductVariantGetPayload<{
  include: {
    size: true;
    color: true;
    product: {
      include: {
        images: {
          orderBy: {
            sortOrder: "asc";
          };
          take: 1;
        };
      };
    };
  };
}>;

type CheckoutItem = {
  productId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string;
  productType: string;
  productKind: string;
  requiresShipping: boolean;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

function getAppUrlFromRequest(requestUrl: string) {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(requestUrl).origin
  ).replace(/\/+$/, "");
}

function normalizeSelections(payload: CheckoutPayload) {
  const selectionMap = new Map<string, CheckoutPayload["selections"][number]>();

  for (const selection of payload.selections) {
    const key = `${selection.productId}:${selection.color}:${selection.size}`;
    const current = selectionMap.get(key);

    if (current) {
      selectionMap.set(key, {
        ...current,
        quantity: current.quantity + selection.quantity,
      });
      continue;
    }

    selectionMap.set(key, selection);
  }

  return [...selectionMap.values()];
}

function selectionKey(selection: { productId: string; color: string; size: string }) {
  return `${selection.productId}:${selection.color}:${selection.size}`;
}

function getProductImage(variant: CheckoutVariant) {
  return variant.product.images[0]?.url ?? "/mockups/tshirt.svg";
}

function getProductDisplayName(variant: CheckoutVariant) {
  return variant.product.name;
}

function buildCheckoutItem(variant: CheckoutVariant, quantity: number): CheckoutItem {
  const unitPrice = variant.priceOverrideCents ?? variant.product.priceCents;

  if (unitPrice <= 0) {
    throw new Error(`Некорректная цена товара: ${variant.product.name}.`);
  }

  return {
    productId: variant.productId,
    variantId: variant.id,
    productSlug: variant.product.slug,
    productName: getProductDisplayName(variant),
    variantName: `${variant.size.label} / ${variant.color.label}`,
    sku: variant.sku,
    imageUrl: getProductImage(variant),
    productType: variant.product.type,
    productKind: variant.product.productKind,
    requiresShipping: variant.product.requiresShipping,
    color: variant.color.value,
    size: variant.size.value,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
  };
}

async function buildCheckoutItems(
  tx: Prisma.TransactionClient,
  payload: CheckoutPayload,
) {
  const items: CheckoutItem[] = [];
  const selections = normalizeSelections(payload);

  if (selections.length === 0) {
    return items;
  }

  const variants = await tx.productVariant.findMany({
    where: {
      active: true,
      product: { status: "ACTIVE" },
      OR: selections.map((selection) => ({
        productId: selection.productId,
        size: { value: selection.size },
        color: { value: selection.color },
      })),
    },
    include: {
      size: true,
      color: true,
      product: {
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
      },
    },
  });
  const variantBySelection = new Map(
    variants.map((variant) => [
      selectionKey({
        productId: variant.productId,
        color: variant.color.value,
        size: variant.size.value,
      }),
      variant,
    ]),
  );

  for (const selection of selections) {
    const variant = variantBySelection.get(selectionKey(selection));

    if (!variant) {
      throw new Error("Корзина содержит недоступные товары. Обновите корзину и попробуйте снова.");
    }

    if (variant.product.requiresShipping && variant.stock < selection.quantity) {
      throw new Error(`Недостаточно товара на складе: ${variant.product.name}.`);
    }

    items.push(buildCheckoutItem(variant, selection.quantity));
  }

  return items;
}

function calculateCheckoutSummary(items: CheckoutItem[]) {
  const subtotalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippableSubtotal = items
    .filter((item) => item.requiresShipping)
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const requiresShipping = shippableSubtotal > 0;
  const deliveryAmount = !requiresShipping || shippableSubtotal >= FREE_DELIVERY_THRESHOLD
    ? 0
    : STANDARD_DELIVERY_AMOUNT;

  return {
    subtotalAmount,
    discountAmount: 0,
    deliveryAmount,
    totalAmount: subtotalAmount + deliveryAmount,
    requiresShipping,
  };
}

function buildReturnUrl(requestUrl: string, orderId: string) {
  const configuredReturnUrl = process.env.YOOKASSA_RETURN_URL?.trim();

  if (configuredReturnUrl) {
    const url = new URL(configuredReturnUrl);
    url.searchParams.set("order", orderId);
    return url.toString();
  }

  return `${getAppUrlFromRequest(requestUrl)}/checkout/success?order=${encodeURIComponent(orderId)}`;
}

function shouldSendReceipt() {
  return process.env.YOOKASSA_RECEIPT_ENABLED === "true";
}

async function clearUserCart(userId: string | null | undefined) {
  if (!userId) {
    return;
  }

  await prisma.cartItem.deleteMany({
    where: {
      cart: {
        userId,
      },
    },
  });
}

export async function createCheckoutPayment(payloadInput: unknown, requestUrl: string, currentUser: User | null) {
  const payload = checkoutPayloadSchema.parse(payloadInput);

  if (payload.userId && payload.userId !== currentUser?.id) {
    throw new Error("forbidden");
  }

  if (payload.useBalance && !currentUser) {
    throw new Error("Использовать баланс можно только после входа в аккаунт.");
  }

  const idempotenceKey = crypto.randomUUID();
  const created = await prisma.$transaction(async (tx) => {
    const items = await buildCheckoutItems(tx, payload);
    const summary = calculateCheckoutSummary(items);

    if (items.length === 0) {
      throw new Error("Корзина пуста.");
    }

    if (summary.requiresShipping && !payload.shippingAddress) {
      throw new Error("Укажите адрес доставки.");
    }

    if (summary.requiresShipping && !payload.deliveryMethod) {
      throw new Error("Выберите способ доставки.");
    }

    const balance = currentUser
      ? await tx.userBalance.upsert({
          where: { userId: currentUser.id },
          create: { userId: currentUser.id, amountCents: 0 },
          update: {},
        })
      : null;
    const balanceUsage =
      currentUser && payload.useBalance
        ? calculateBalanceUsage({
            total: summary.totalAmount,
            availableBalance: balance?.amountCents ?? 0,
            requestedAmount: payload.requestedBalanceAmount,
          })
        : calculateBalanceUsage({
            total: summary.totalAmount,
            availableBalance: 0,
            requestedAmount: 0,
          });
    const amountToPay = balanceUsage.amountToPay;
    const isPaidInternally = amountToPay === 0;
    const provider = amountToPay > 0 ? getYooKassaProviderMode() : "MOCK";
    const orderNumber = buildOrderNumber();
    const receiptRequired = shouldSendReceipt() && amountToPay > 0;
    const receipt = receiptRequired
      ? buildYooKassaReceipt({
          customerName: payload.customer.name,
          customerEmail: payload.customer.email,
          customerPhone: payload.customer.phone,
          currency: DEFAULT_CURRENCY,
          items: items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        })
      : null;

    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: currentUser?.id,
        status: isPaidInternally ? "PAID" : "AWAITING_PAYMENT",
        paymentStatus: isPaidInternally ? "SUCCEEDED" : "NOT_STARTED",
        fulfillmentStatus: "NOT_FULFILLED",
        customerName: payload.customer.name,
        customerEmail: payload.customer.email,
        customerPhone: payload.customer.phone,
        deliveryAddressSnapshot:
          summary.requiresShipping && payload.shippingAddress ? payload.shippingAddress : undefined,
        deliveryMethod: summary.requiresShipping ? payload.deliveryMethod ?? "СДЭК" : "Цифровой сертификат",
        paymentMethod:
          isPaidInternally && balanceUsage.amountPaidByBalance > 0
            ? "Баланс аккаунта"
            : payload.paymentMethod,
        comment: payload.comment,
        subtotalAmount: summary.subtotalAmount,
        discountAmount: summary.discountAmount,
        deliveryAmount: summary.deliveryAmount,
        totalAmount: summary.totalAmount,
        currency: DEFAULT_CURRENCY,
        amountPaidByBalanceCents: balanceUsage.amountPaidByBalance,
        amountPaidByExternalCents: amountToPay,
        balanceBeforeCents: balanceUsage.availableBalance,
        balanceAfterCents: balanceUsage.balanceAfter,
        usedBalance: balanceUsage.usedBalance,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productSlug: item.productSlug,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            imageUrl: item.imageUrl,
            productType: item.productType,
            productKind: item.productKind,
            requiresShipping: item.requiresShipping,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        payment: {
          create: {
            provider,
            status: isPaidInternally ? "SUCCEEDED" : "NOT_STARTED",
            idempotenceKey,
            amount: amountToPay,
            currency: DEFAULT_CURRENCY,
            receiptRequired,
            receipt: receipt ? (receipt as unknown as Prisma.InputJsonValue) : undefined,
            metadata: {
              provider,
              receiptPrepared: receiptRequired,
            },
          },
        },
      },
      include: dbOrderInclude,
    });

    if (currentUser && balanceUsage.amountPaidByBalance > 0) {
      await tx.userBalance.update({
        where: { userId: currentUser.id },
        data: { amountCents: balanceUsage.balanceAfter },
      });
      await tx.balanceTransaction.create({
        data: {
          userId: currentUser.id,
          type: "purchase_payment",
          amountCents: -balanceUsage.amountPaidByBalance,
          balanceBeforeCents: balanceUsage.availableBalance,
          balanceAfterCents: balanceUsage.balanceAfter,
          orderId: createdOrder.id,
        },
      });
    }

    if (isPaidInternally) {
      await deductStockForPaidOrder(tx, createdOrder.id);
      await issueGiftCertificatesForPaidOrder(tx, createdOrder.id);
    }

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      paymentId: createdOrder.payment?.id ?? null,
      idempotenceKey,
      amountToPay,
      items,
      receipt,
      receiptRequired,
    };
  });

  if (created.amountToPay <= 0) {
    await clearUserCart(currentUser?.id);
    await notifyOrderCreatedOnSite(created.orderId);
    await notifyOrderPaidOnSite(created.orderId);
    await Promise.all([
      recordAnalyticsEvent({
        eventType: "order_created",
        entityType: "order",
        entityId: created.orderId,
        entityName: created.orderNumber,
        userId: currentUser?.id ?? null,
        path: "/checkout",
        deviceType: "desktop",
        metadata: {
          amountToPay: created.amountToPay,
          itemCount: created.items.reduce((sum, item) => sum + item.quantity, 0),
          paymentStatus: "SUCCEEDED",
          usedInternalBalance: true,
        },
      }),
      recordAnalyticsEvent({
        eventType: "payment_succeeded",
        entityType: "payment",
        entityId: created.orderId,
        entityName: created.orderNumber,
        userId: currentUser?.id ?? null,
        path: "/checkout",
        deviceType: "desktop",
        metadata: {
          provider: "MOCK",
          amountToPay: created.amountToPay,
        },
      }),
    ]);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.orderId },
      include: dbOrderInclude,
    });
    return {
      order: orderFromDb(order),
      confirmationUrl: null,
    };
  }

  if (!created.paymentId) {
    throw new Error("Не удалось подготовить запись платежа.");
  }
  const paymentId = created.paymentId;

  try {
    const paymentResult = await createYooKassaPayment({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      amount: created.amountToPay,
      currency: DEFAULT_CURRENCY,
      customerName: payload.customer.name,
      customerEmail: payload.customer.email,
      customerPhone: payload.customer.phone,
      idempotenceKey: created.idempotenceKey,
      returnUrl: buildReturnUrl(requestUrl, created.orderId),
      receipt: created.receipt,
      receiptRequired: created.receiptRequired,
    });

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          providerPaymentId: paymentResult.providerPaymentId,
          status: paymentResult.status,
          confirmationUrl: paymentResult.confirmationUrl,
          rawRequest: paymentResult.rawRequest,
          rawResponse: paymentResult.rawResponse,
        },
      });
      await tx.order.update({
        where: { id: created.orderId },
        data: {
          status: "AWAITING_PAYMENT",
          paymentStatus: paymentResult.status,
        },
      });
    });

    await clearUserCart(currentUser?.id);
    await notifyOrderCreatedOnSite(created.orderId);
    await recordAnalyticsEvent({
      eventType: "order_created",
      entityType: "order",
      entityId: created.orderId,
      entityName: created.orderNumber,
      userId: currentUser?.id ?? null,
      path: "/checkout",
      deviceType: "desktop",
      metadata: {
        amountToPay: created.amountToPay,
        itemCount: created.items.reduce((sum, item) => sum + item.quantity, 0),
        paymentStatus: paymentResult.status,
        provider: paymentResult.providerPaymentId?.startsWith("mock_") ? "MOCK" : "YOOKASSA",
      },
    });

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.orderId },
      include: dbOrderInclude,
    });

    return {
      order: orderFromDb(order),
      confirmationUrl: paymentResult.confirmationUrl,
    };
  } catch (error) {
    const details = getYooKassaErrorDetails(error);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "FAILED",
          errorCode: details.code,
          errorMessage: details.message,
          rawResponse: details.rawResponse ?? undefined,
        },
      });
      await tx.order.update({
        where: { id: created.orderId },
        data: {
          status: "AWAITING_PAYMENT",
          paymentStatus: "FAILED",
        },
      });
      await refundOrderBalancePayment(tx, created.orderId);
    });

    await notifyOrderCreatedOnSite(created.orderId);
    await Promise.all([
      recordAnalyticsEvent({
        eventType: "order_created",
        entityType: "order",
        entityId: created.orderId,
        entityName: created.orderNumber,
        userId: currentUser?.id ?? null,
        path: "/checkout",
        deviceType: "desktop",
        metadata: {
          amountToPay: created.amountToPay,
          itemCount: created.items.reduce((sum, item) => sum + item.quantity, 0),
          paymentStatus: "FAILED",
        },
      }),
      recordAnalyticsEvent({
        eventType: "payment_failed",
        entityType: "payment",
        entityId: created.orderId,
        entityName: created.orderNumber,
        userId: currentUser?.id ?? null,
        path: "/checkout",
        deviceType: "desktop",
        metadata: {
          code: details.code,
          amountToPay: created.amountToPay,
        },
      }),
    ]);

    throw new Error("Заказ создан, но платеж не удалось подготовить. Попробуйте оформить оплату позже.");
  }
}
