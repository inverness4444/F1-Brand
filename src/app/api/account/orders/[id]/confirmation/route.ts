import { NextRequest, NextResponse } from "next/server";
import { CHECKOUT_ACCESS_COOKIE_NAME } from "@/lib/cookie-constants";
import { getCurrentUser, verifyCheckoutAccessCookieValue } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/prisma";
import type { ProductCompliance } from "@/lib/product-compliance";
import type { AddressInput } from "@/lib/account-types";
import { formatDeliveryDeadline } from "@/lib/delivery-promise";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return new NextResponse("Заказ не найден", { status: 404 });
    const allowed = order.userId
      ? user?.id === order.userId
      : verifyCheckoutAccessCookieValue(request.cookies.get(CHECKOUT_ACCESS_COOKIE_NAME)?.value, id);
    if (!allowed) throw new Error("forbidden");
    const lines = [
      `Velocity Club — подтверждение заказа ${order.orderNumber}`,
      `Дата: ${order.createdAt.toISOString()}`,
      `Покупатель: ${order.customerName}; ${order.customerEmail}; ${order.customerPhone}`,
      "Товары:",
      ...order.items.flatMap((item) => [
        `${item.productName}; ${item.variantName}; ${item.quantity} шт. × ${item.unitPrice} ₽ = ${item.totalPrice} ₽`,
        ...(item.productInfoSnapshot ? (() => {
          const c = item.productInfoSnapshot as unknown as ProductCompliance;
          return [`Состав / материал: ${c.composition}`, `Изготовитель: ${c.manufacturer}; ${c.manufacturerAddress}`, `Страна производства: ${c.countryOfOrigin}`, `Уход: ${c.careInstructions}`, c.conformityNumber ? `Документ соответствия: ${c.conformityNumber}; ${c.conformityRegistryUrl}` : ""];
        })() : []),
      ]),
      `Стоимость товаров: ${order.subtotalAmount} ₽; доставка: ${order.deliveryAmount} ₽; итого: ${order.totalAmount} ₽`,
      `С баланса: ${order.amountPaidByBalanceCents} ₽; внешняя оплата: ${order.amountPaidByExternalCents} ₽`,
      `Доставка: ${order.deliveryMethod}`,
      order.deliveryAddressSnapshot ? (() => {
        const address = order.deliveryAddressSnapshot as unknown as AddressInput;
        return `Получатель: ${address.recipient}; ${address.recipientPhone}\nАдрес: ${address.country}, ${address.postalCode}, ${address.city}, ${address.street}, дом ${address.house}${address.apartment ? `, квартира ${address.apartment}` : ""}`;
      })() : "Доставка не требуется.",
      order.deliveryDeadline ? `Передача не позднее ${formatDeliveryDeadline(order.deliveryDeadline.toISOString())}.` : "Срок: см. согласованные при оформлении условия.",
      `Версия оферты: ${order.offerVersion ?? "условия на дату покупки"}`,
      "", "Правила возврата:", order.returnInstructions ?? "Сведения для этого заказа запросите у продавца: velocityclub@mail.ru. Отсутствие сохранённой информации не ограничивает права потребителя.",
      "", "Оферта на момент заказа:", order.offerSnapshot ?? "Сведения для этого заказа запросите у продавца: velocityclub@mail.ru.",
      "", "Документ подтверждает условия заказа и не заменяет кассовый чек.",
    ];
    return new NextResponse(`\uFEFF${lines.filter(Boolean).join("\n")}`, { headers: {
      "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="order-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}.txt"`,
    } });
  } catch (error) { return apiError(error, "Не удалось получить подтверждение заказа."); }
}
