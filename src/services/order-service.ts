import type { GiftCertificate, Order } from "@/lib/account-types";
import { buildOrderNumber, createEntityId } from "@/lib/account-utils";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { authService } from "@/services/auth-service";
import { orderSchema, ordersSchema } from "@/lib/validation-schemas";

function readOrders() {
  return readStorage<Order[]>(storageKeys.orders, [], ordersSchema);
}

function writeOrders(orders: Order[]) {
  writeStorage(storageKeys.orders, orders, ordersSchema);
  emitStorageChange("orders");
}

function writeLatestCheckoutOrder(orderId: string) {
  writeStorage(storageKeys.checkoutOrder, orderId);
  emitStorageChange("checkout");
}

type OrderDraftInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">;

export const orderService = {
  listByUser(userId: string) {
    try {
      authService.assertAuthorizedUserId(userId);
    } catch {
      return [];
    }

    return readOrders()
      .filter((order) => order.userId === userId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  },

  getById(orderId: string) {
    return readOrders().find((order) => order.id === orderId) ?? null;
  },

  getByIdForUser(userId: string, orderId: string) {
    return this.listByUser(userId).find((order) => order.id === orderId) ?? null;
  },

  buildDraft(input: OrderDraftInput) {
    const now = new Date().toISOString();

    return orderSchema.parse({
      ...input,
      id: createEntityId("order"),
      orderNumber: buildOrderNumber(),
      createdAt: now,
      updatedAt: now,
    } satisfies Order);
  },

  save(order: Order) {
    const normalizedOrder = orderSchema.parse(order);
    writeOrders([normalizedOrder, ...readOrders()]);
    writeLatestCheckoutOrder(normalizedOrder.id);
    return normalizedOrder;
  },

  update(orderId: string, updater: (order: Order) => Order) {
    const existingOrder = this.getById(orderId);

    if (!existingOrder) {
      return null;
    }

    const nextOrder = orderSchema.parse({
      ...updater(existingOrder),
      id: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      createdAt: existingOrder.createdAt,
      updatedAt: new Date().toISOString(),
    } satisfies Order);

    writeOrders(readOrders().map((order) => (order.id === orderId ? nextOrder : order)));
    return nextOrder;
  },

  updateGiftCertificateSnapshot(certificate: GiftCertificate) {
    return this.update(certificate.orderId, (order) => ({
      ...order,
      giftCertificatesIssued: order.giftCertificatesIssued.map((entry) =>
        entry.id === certificate.id
          ? {
              ...entry,
              status: certificate.status,
              activatedByUserId: certificate.activatedByUserId,
              activatedAt: certificate.activatedAt,
              expiresAt: certificate.expiresAt,
            }
          : entry,
      ),
    }));
  },

  getLatestCheckoutOrder() {
    const orderId = readStorage<string | null>(storageKeys.checkoutOrder, null);
    return orderId ? this.getById(orderId) : null;
  },

  getCheckoutSuccessOrder(orderId: string | null, currentUserId: string | null) {
    const lastCheckoutOrderId = readStorage<string | null>(storageKeys.checkoutOrder, null);
    const resolvedOrderId = orderId ?? lastCheckoutOrderId;

    if (!resolvedOrderId) {
      return null;
    }

    const order = this.getById(resolvedOrderId);

    if (!order) {
      return null;
    }

    if (currentUserId) {
      return order.userId === currentUserId ? order : null;
    }

    return order.userId === null && resolvedOrderId === lastCheckoutOrderId ? order : null;
  },
};
