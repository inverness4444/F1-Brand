import "server-only";

import type { GiftCard, Order, OrderItem, Payment } from "@prisma/client";

import type {
  BalanceTransaction,
  GiftCertificate,
  IssuedGiftCertificate,
  Order as AccountOrder,
  OrderAddressSnapshot,
  OrderItem as AccountOrderItem,
  UserAddress,
  UserBalance,
} from "@/lib/account-types";

type DbOrder = Order & {
  items: OrderItem[];
  payment: Payment | null;
  giftCards: GiftCard[];
};

function toIso(value: Date) {
  return value.toISOString();
}

function orderStatusRu(status: Order["status"]) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Ожидает оплаты";
    case "PAID":
      return "Оплачен";
    case "PROCESSING":
      return "В производстве";
    case "SHIPPED":
      return "Отправлен";
    case "DELIVERED":
      return "Доставлен";
    case "CANCELLED":
      return "Отменён";
    case "REFUNDED":
      return "Возвращён";
    case "PENDING":
    default:
      return "Новый";
  }
}

function giftCardStatus(status: GiftCard["status"]): GiftCertificate["status"] {
  switch (status) {
    case "REDEEMED":
      return "activated";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "ACTIVE":
    default:
      return "purchased";
  }
}

export function addressFromDb(address: {
  id: string;
  userId: string;
  country: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  recipient: string;
  recipientPhone: string;
  courierComment: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserAddress {
  return {
    id: address.id,
    userId: address.userId,
    country: address.country,
    city: address.city,
    street: address.street,
    house: address.house,
    apartment: address.apartment,
    postalCode: address.postalCode,
    recipient: address.recipient,
    recipientPhone: address.recipientPhone,
    courierComment: address.courierComment,
    isDefault: address.isDefault,
    createdAt: toIso(address.createdAt),
    updatedAt: toIso(address.updatedAt),
  };
}

export function orderItemFromDb(item: OrderItem): AccountOrderItem {
  return {
    productId: item.productId ?? item.productSlug,
    variantId: item.variantId,
    slug: item.productSlug,
    name: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    image: item.imageUrl,
    productType: item.productType as AccountOrderItem["productType"],
    productKind: item.productKind as AccountOrderItem["productKind"],
    requiresShipping: item.requiresShipping,
    color: item.color as AccountOrderItem["color"],
    size: item.size as AccountOrderItem["size"],
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.totalPrice,
  };
}

export function giftCardFromDb(card: GiftCard): GiftCertificate {
  return {
    id: card.id,
    amount: card.amountCents,
    code: card.code,
    status: giftCardStatus(card.status),
    purchasedByUserId: card.purchasedByUserId,
    activatedByUserId: card.redeemedByUserId,
    orderId: card.orderId ?? "",
    createdAt: toIso(card.createdAt),
    activatedAt: card.redeemedAt ? toIso(card.redeemedAt) : null,
    expiresAt: card.expiresAt ? toIso(card.expiresAt) : null,
  };
}

export function issuedGiftCardFromDb(card: GiftCard): IssuedGiftCertificate {
  return {
    id: card.id,
    amount: card.amountCents,
    code: card.code,
    status: giftCardStatus(card.status),
    orderId: card.orderId ?? "",
    purchasedByUserId: card.purchasedByUserId,
    activatedByUserId: card.redeemedByUserId,
    createdAt: toIso(card.createdAt),
    activatedAt: card.redeemedAt ? toIso(card.redeemedAt) : null,
    expiresAt: card.expiresAt ? toIso(card.expiresAt) : null,
  };
}

function shippingAddressSnapshot(order: Order): OrderAddressSnapshot | null {
  if (!order.deliveryAddressSnapshot || typeof order.deliveryAddressSnapshot !== "object") {
    return null;
  }

  return order.deliveryAddressSnapshot as OrderAddressSnapshot;
}

export function orderFromDb(order: DbOrder): AccountOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    status: orderStatusRu(order.status),
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          amount: order.payment.amount,
          currency: order.payment.currency,
          confirmationUrl: order.payment.confirmationUrl,
        }
      : null,
    items: order.items.map(orderItemFromDb),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
    },
    shippingAddress: shippingAddressSnapshot(order),
    deliveryMethod: order.deliveryMethod as AccountOrder["deliveryMethod"],
    paymentMethod: order.paymentMethod as AccountOrder["paymentMethod"],
    comment: order.comment,
    subtotal: order.subtotalAmount,
    shippingCost: order.deliveryAmount,
    total: order.totalAmount,
    amountPaidByBalance: order.amountPaidByBalanceCents,
    amountPaidByExternalMethod: order.amountPaidByExternalCents,
    balanceBefore: order.balanceBeforeCents,
    balanceAfter: order.balanceAfterCents,
    usedBalance: order.usedBalance,
    giftCertificatesIssued: order.giftCards.map(issuedGiftCardFromDb),
  };
}

export function balanceFromDb(balance: { userId: string; amountCents: number; updatedAt: Date }): UserBalance {
  return {
    userId: balance.userId,
    amount: balance.amountCents,
    updatedAt: toIso(balance.updatedAt),
  };
}

export function balanceTransactionFromDb(transaction: {
  id: string;
  userId: string;
  type: string;
  amountCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  certificateCode: string | null;
  orderId: string | null;
  createdAt: Date;
}): BalanceTransaction {
  return {
    id: transaction.id,
    userId: transaction.userId,
    type: transaction.type as BalanceTransaction["type"],
    amount: transaction.amountCents,
    balanceBefore: transaction.balanceBeforeCents,
    balanceAfter: transaction.balanceAfterCents,
    certificateCode: transaction.certificateCode,
    orderId: transaction.orderId,
    createdAt: toIso(transaction.createdAt),
  };
}
