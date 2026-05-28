import { NextRequest, NextResponse } from "next/server";

import { buildOrderNumber } from "@/lib/account-utils";
import { checkoutPayloadSchema } from "@/lib/validation-schemas";
import { generateGiftCertificateCode } from "@/lib/gift-certificate-utils";
import { calculateBalanceUsage } from "@/lib/balance-utils";
import { calculateCartSummary, toOrderItems, validateCartSelections } from "@/services/cart-service";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { getCurrentUser } from "@/lib/server/auth";
import { orderFromDb } from "@/lib/server/account-mappers";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/server/db";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const [payload, currentUser, products] = await Promise.all([
      request.json().then((json) => checkoutPayloadSchema.parse(json)),
      getCurrentUser(),
      readCatalogProductsFromDb(),
    ]);

    if (payload.userId && payload.userId !== currentUser?.id) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    if (payload.useBalance && !currentUser) {
      return NextResponse.json({ error: "Использовать баланс можно только после входа в аккаунт." }, { status: 401 });
    }

    const productMap = new Map(products.map((product) => [product.id, product] as const));
    const validatedCart = validateCartSelections(payload.selections, productMap);

    if (validatedCart.invalid.length > 0 || validatedCart.valid.length !== payload.selections.length) {
      return NextResponse.json(
        { error: "Корзина содержит недоступные товары. Обновите корзину и попробуйте снова." },
        { status: 400 },
      );
    }

    const items = toOrderItems(payload.selections, productMap);
    const summary = calculateCartSummary(payload.selections, productMap);

    if (summary.requiresShipping && !payload.shippingAddress) {
      return NextResponse.json({ error: "Укажите адрес доставки." }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
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
              total: summary.total,
              availableBalance: balance?.amountCents ?? 0,
              requestedAmount: payload.requestedBalanceAmount,
            })
          : calculateBalanceUsage({
              total: summary.total,
              availableBalance: 0,
              requestedAmount: 0,
            });
      const amountToPay = balanceUsage.amountToPay;
      const status = amountToPay === 0 ? "PAID" : "PENDING";
      const orderNumber = buildOrderNumber();

      for (const item of items) {
        const variant = await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: { value: item.size },
            color: { value: item.color },
            active: true,
          },
        });

        if (!variant) {
          throw new Error(`Вариант товара ${item.name} недоступен.`);
        }

        if (item.requiresShipping && variant.stock < item.quantity) {
          throw new Error(`Недостаточно товара на складе: ${item.name}.`);
        }

        if (item.requiresShipping) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: variant.id,
              type: "SALE",
              quantity: -item.quantity,
              note: orderNumber,
            },
          });
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: currentUser?.id,
          status,
          customerName: payload.customer.name,
          customerEmail: payload.customer.email,
          customerPhone: payload.customer.phone,
          shippingAddressSnapshot:
            summary.requiresShipping && payload.shippingAddress ? payload.shippingAddress : undefined,
          deliveryMethod: summary.requiresShipping ? payload.deliveryMethod ?? "СДЭК" : "Цифровой сертификат",
          paymentMethod:
            amountToPay === 0 && balanceUsage.amountPaidByBalance > 0
              ? "Баланс аккаунта"
              : payload.paymentMethod,
          comment: payload.comment,
          subtotalCents: summary.subtotal,
          shippingCostCents: summary.shippingCost,
          totalCents: summary.total,
          amountPaidByBalanceCents: balanceUsage.amountPaidByBalance,
          amountPaidByExternalCents: amountToPay,
          balanceBeforeCents: balanceUsage.availableBalance,
          balanceAfterCents: balanceUsage.balanceAfter,
          usedBalance: balanceUsage.usedBalance,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productSlug: item.slug,
              productName: item.name,
              productImage: item.image,
              productType: item.productType,
              productKind: item.productKind,
              requiresShipping: item.requiresShipping,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              unitPriceCents: item.unitPrice,
              lineTotalCents: item.lineTotal,
            })),
          },
          payment: {
            create: {
              provider: "mock",
              status: amountToPay === 0 ? "PAID" : "PENDING",
              amountCents: amountToPay,
              metadata: {
                nextProviders: ["YooKassa", "CloudPayments", "T-Bank"],
              },
            },
          },
        },
        include: {
          items: true,
          payment: true,
          giftCards: true,
        },
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

      const giftCertificateItems = items.filter((item) => item.productKind === "gift_certificate");
      if (giftCertificateItems.length > 0) {
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
                purchasedByUserId: currentUser?.id,
                orderId: createdOrder.id,
              },
            });
          }
        }
      }

      if (currentUser) {
        await tx.cartItem.deleteMany({
          where: {
            cart: {
              userId: currentUser.id,
            },
          },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: {
          items: true,
          payment: true,
          giftCards: true,
        },
      });
    });

    return NextResponse.json({ order: orderFromDb(order) });
  } catch (error) {
    return apiError(error, "Не удалось оформить заказ.");
  }
}
