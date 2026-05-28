import type { CheckoutPayload } from "@/lib/account-types";
import { calculateBalanceUsage } from "@/lib/balance-utils";
import type { Product } from "@/lib/types";
import { checkoutPayloadSchema } from "@/lib/validation-schemas";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { calculateCartSummary } from "@/services/cart-service";
import { orderSchema } from "@/lib/validation-schemas";

export const checkoutService = {
  buildCheckoutPreview({
    userId,
    selections,
    productMap,
    useBalance,
    requestedBalanceAmount,
    availableBalance = 0,
  }: {
    userId: string | null;
    selections: CheckoutPayload["selections"];
    productMap: Map<string, Product>;
    useBalance: boolean;
    requestedBalanceAmount: number | null;
    availableBalance?: number;
  }) {
    const summary = calculateCartSummary(selections, productMap);
    const balanceUsage =
      userId && useBalance
        ? calculateBalanceUsage({
            total: summary.total,
            availableBalance,
            requestedAmount: requestedBalanceAmount,
          })
        : calculateBalanceUsage({
            total: summary.total,
            availableBalance: 0,
            requestedAmount: 0,
          });

    return {
      ...summary,
      balanceUsage,
    };
  },

  async placeOrder(payload: CheckoutPayload, productMap: Map<string, Product>) {
    const normalizedPayload = checkoutPayloadSchema.parse(payload);
    const summary = calculateCartSummary(normalizedPayload.selections, productMap);

    if (summary.requiresShipping && !normalizedPayload.shippingAddress) {
      throw new Error("Укажите адрес доставки.");
    }

    if (summary.requiresShipping && !normalizedPayload.deliveryMethod) {
      throw new Error("Выберите способ доставки.");
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(normalizedPayload),
    });

    const responsePayload = (await response.json().catch(() => null)) as { order?: unknown; error?: string } | null;

    if (!response.ok) {
      throw new Error(responsePayload?.error ?? "Не удалось оформить заказ.");
    }

    return orderSchema.parse(responsePayload?.order);
  },
};
