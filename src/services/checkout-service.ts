import type { CheckoutPayload } from "@/lib/account-types";
import { balancePaymentMethod, digitalDeliveryMethod } from "@/lib/account-constants";
import { calculateBalanceUsage } from "@/lib/balance-utils";
import type { Product } from "@/lib/types";
import { checkoutPayloadSchema } from "@/lib/validation-schemas";
import { authService } from "@/services/auth-service";
import { balanceService } from "@/services/balance-service";
import { calculateCartSummary, toOrderItems, validateCartSelections } from "@/services/cart-service";
import { giftCertificateService } from "@/services/gift-certificate-service";
import { orderService } from "@/services/order-service";
import { runSerializedMutation } from "@/services/storage-service";

export const checkoutService = {
  buildCheckoutPreview({
    userId,
    selections,
    productMap,
    useBalance,
    requestedBalanceAmount,
  }: {
    userId: string | null;
    selections: CheckoutPayload["selections"];
    productMap: Map<string, Product>;
    useBalance: boolean;
    requestedBalanceAmount: number | null;
  }) {
    const summary = calculateCartSummary(selections, productMap);
    const availableBalance = userId ? balanceService.getByUserIdUnsafe(userId).amount : 0;
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

    if (normalizedPayload.userId) {
      authService.assertAuthorizedUserId(normalizedPayload.userId);
    }

    if (normalizedPayload.useBalance && !normalizedPayload.userId) {
      throw new Error("Использовать баланс можно только после входа в аккаунт.");
    }

    const validatedCart = validateCartSelections(normalizedPayload.selections, productMap);

    if (validatedCart.invalid.length > 0 || validatedCart.valid.length !== normalizedPayload.selections.length) {
      throw new Error("Корзина содержит недоступные товары. Обновите корзину и попробуйте снова.");
    }

    const items = toOrderItems(normalizedPayload.selections, productMap);
    const summary = calculateCartSummary(normalizedPayload.selections, productMap);

    if (summary.requiresShipping && !normalizedPayload.shippingAddress) {
      throw new Error("Укажите адрес доставки.");
    }

    if (summary.requiresShipping && !normalizedPayload.deliveryMethod) {
      throw new Error("Выберите способ доставки.");
    }

    return runSerializedMutation("commerce-finance", async () => {
      const availableBalance = normalizedPayload.userId
        ? balanceService.getByUserId(normalizedPayload.userId).amount
        : 0;
      const balanceUsage =
        normalizedPayload.userId && normalizedPayload.useBalance
          ? calculateBalanceUsage({
              total: summary.total,
              availableBalance,
              requestedAmount: normalizedPayload.requestedBalanceAmount,
            })
          : calculateBalanceUsage({
              total: summary.total,
              availableBalance: 0,
              requestedAmount: 0,
            });
      const shippingAddress = summary.requiresShipping ? normalizedPayload.shippingAddress : null;
      const deliveryMethod = summary.requiresShipping
        ? normalizedPayload.deliveryMethod ?? digitalDeliveryMethod
        : digitalDeliveryMethod;
      const paymentMethod =
        balanceUsage.amountToPay === 0 && balanceUsage.amountPaidByBalance > 0
          ? balancePaymentMethod
          : normalizedPayload.paymentMethod;
      const status = balanceUsage.amountToPay === 0 ? "Оплачен" : "Новый";
      const orderDraft = orderService.buildDraft({
        userId: normalizedPayload.userId,
        status,
        items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        customer: normalizedPayload.customer,
        shippingAddress,
        deliveryMethod,
        paymentMethod,
        comment: normalizedPayload.comment,
        subtotal: summary.subtotal,
        shippingCost: summary.shippingCost,
        total: summary.total,
        amountPaidByBalance: balanceUsage.amountPaidByBalance,
        amountPaidByExternalMethod: balanceUsage.amountToPay,
        balanceBefore: availableBalance,
        balanceAfter: balanceUsage.balanceAfter,
        usedBalance: balanceUsage.usedBalance,
        giftCertificatesIssued: [],
      });
      const giftCertificatesIssued = giftCertificateService.createDraftsForOrder({
        orderId: orderDraft.id,
        purchasedByUserId: normalizedPayload.userId,
        items,
      });
      const order = orderService.save({
        ...orderDraft,
        giftCertificatesIssued: giftCertificatesIssued.map((certificate) =>
          giftCertificateService.toIssuedGiftCertificate(certificate),
        ),
      });

      if (balanceUsage.amountPaidByBalance > 0 && normalizedPayload.userId) {
        balanceService.applyTransaction({
          userId: normalizedPayload.userId,
          type: "purchase_payment",
          amount: -balanceUsage.amountPaidByBalance,
          orderId: order.id,
        });
      }

      giftCertificateService.saveAll(giftCertificatesIssued);
      return order;
    });
  },
};
