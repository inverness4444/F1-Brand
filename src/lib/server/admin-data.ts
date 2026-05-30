import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  AdminAddressRecord,
  AdminOrderDetail,
  AdminOrderItem,
  AdminOrderSummary,
  AdminUserDetail,
  AdminUserSummary,
} from "@/lib/admin-types";
import { addressInputSchema } from "@/lib/validation-schemas";
import { addressFromDb } from "@/lib/server/account-mappers";

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  birthday: true,
  favoriteDriver: true,
  favoriteTeam: true,
  createdAt: true,
  updatedAt: true,
  addresses: {
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  },
  _count: {
    select: {
      orders: true,
      addresses: true,
    },
  },
} satisfies Prisma.UserSelect;

export const adminOrderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  status: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  deliveryAddressSnapshot: true,
  deliveryMethod: true,
  paymentMethod: true,
  comment: true,
  subtotalAmount: true,
  discountAmount: true,
  deliveryAmount: true,
  totalAmount: true,
  currency: true,
  amountPaidByBalanceCents: true,
  amountPaidByExternalCents: true,
  balanceBeforeCents: true,
  balanceAfterCents: true,
  usedBalance: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      productId: true,
      variantId: true,
      productSlug: true,
      productName: true,
      variantName: true,
      sku: true,
      imageUrl: true,
      productType: true,
      productKind: true,
      requiresShipping: true,
      color: true,
      size: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
    },
  },
  payment: {
    select: {
      provider: true,
      status: true,
      amount: true,
      currency: true,
      confirmationUrl: true,
      paidAt: true,
      capturedAt: true,
      canceledAt: true,
      refundedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export const adminAddressSelect = {
  id: true,
  userId: true,
  country: true,
  city: true,
  street: true,
  house: true,
  apartment: true,
  postalCode: true,
  recipient: true,
  recipientPhone: true,
  courierComment: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  _count: {
    select: {
      shippingOrders: true,
    },
  },
} satisfies Prisma.AddressSelect;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;
type AdminOrderRow = Prisma.OrderGetPayload<{ select: typeof adminOrderSelect }>;
type AdminAddressRow = Prisma.AddressGetPayload<{ select: typeof adminAddressSelect }>;

function toIso(value: Date) {
  return value.toISOString();
}

function toDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function addressSnapshotFromJson(value: Prisma.JsonValue | null) {
  const parsed = addressInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function mapOrderItem(item: AdminOrderRow["items"][number]): AdminOrderItem {
  return {
    id: item.id,
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
  };
}

function mapOrderBase(order: AdminOrderRow): AdminOrderSummary {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemNames = [...new Set(order.items.map((item) => item.productName))].slice(0, 4);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    user: order.user,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
    },
    shippingAddress: addressSnapshotFromJson(order.deliveryAddressSnapshot),
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    comment: order.comment,
    itemCount,
    itemNames,
    subtotal: order.subtotalAmount,
    discount: order.discountAmount,
    shippingCost: order.deliveryAmount,
    total: order.totalAmount,
    currency: order.currency,
  };
}

export function adminOrderFromDb(order: AdminOrderRow): AdminOrderDetail {
  return {
    ...mapOrderBase(order),
    items: order.items.map(mapOrderItem),
    amountPaidByBalance: order.amountPaidByBalanceCents,
    amountPaidByExternalMethod: order.amountPaidByExternalCents,
    balanceBefore: order.balanceBeforeCents,
    balanceAfter: order.balanceAfterCents,
    usedBalance: order.usedBalance,
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          amount: order.payment.amount,
          currency: order.payment.currency,
          confirmationUrl: order.payment.confirmationUrl,
          paidAt: order.payment.paidAt ? toIso(order.payment.paidAt) : null,
          capturedAt: order.payment.capturedAt ? toIso(order.payment.capturedAt) : null,
          canceledAt: order.payment.canceledAt ? toIso(order.payment.canceledAt) : null,
          refundedAt: order.payment.refundedAt ? toIso(order.payment.refundedAt) : null,
        }
      : null,
  };
}

export function adminOrderSummaryFromDb(order: AdminOrderRow): AdminOrderSummary {
  return mapOrderBase(order);
}

export function adminUserSummaryFromDb(
  user: AdminUserRow,
  orderStats?: { orderCount: number; ordersTotal: number },
): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
    orderCount: orderStats?.orderCount ?? user._count.orders,
    ordersTotal: orderStats?.ordersTotal ?? 0,
    addressCount: user._count.addresses,
  };
}

export function adminUserDetailFromDb(
  user: AdminUserRow & { orders?: AdminOrderRow[] },
  orderStats?: { orderCount: number; ordersTotal: number },
): AdminUserDetail {
  return {
    ...adminUserSummaryFromDb(user, orderStats),
    birthday: toDateInput(user.birthday),
    favoriteDriver: user.favoriteDriver,
    favoriteTeam: user.favoriteTeam,
    addresses: user.addresses.map(addressFromDb),
    orders: (user.orders ?? []).map(adminOrderSummaryFromDb),
  };
}

export function adminAddressFromDb(address: AdminAddressRow): AdminAddressRecord {
  return {
    ...addressFromDb(address),
    user: address.user,
    shippingOrderCount: address._count.shippingOrders,
  };
}
