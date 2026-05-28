import type { GiftCertificate, Order } from "@/lib/account-types";
import { orderSchema, ordersSchema } from "@/lib/validation-schemas";

async function parseOrders(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { orders?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить заказы.");
  }

  return ordersSchema.parse(payload?.orders ?? []);
}

async function parseOrder(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { order?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить заказ.");
  }

  return payload?.order ? orderSchema.parse(payload.order) : null;
}

export const orderService = {
  async listByUser(_userId: string) {
    void _userId;
    const response = await fetch("/api/account/orders", {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 401) {
      return [];
    }

    return parseOrders(response);
  },

  async getById(orderId: string) {
    const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}?checkout=1`, {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 404) {
      return null;
    }

    return parseOrder(response);
  },

  async getByIdForUser(_userId: string, orderId: string) {
    void _userId;
    return this.getById(orderId);
  },

  buildDraft(input: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">) {
    return orderSchema.parse({
      ...input,
      id: "",
      orderNumber: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  save(order: Order) {
    return orderSchema.parse(order);
  },

  updateGiftCertificateSnapshot(_certificate: GiftCertificate) {
    void _certificate;
    return null;
  },

  async getLatestCheckoutOrder() {
    return null;
  },

  async getCheckoutSuccessOrder(orderId: string | null) {
    return orderId ? this.getById(orderId) : null;
  },
};
