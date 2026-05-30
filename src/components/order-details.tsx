"use client";

import { Headset, RotateCcw } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/lib/account-utils";
import type { Order } from "@/lib/account-types";
import {
  colorLabelRu,
  giftCertificateStatusLabelRu,
  sizeLabelRu,
} from "@/lib/storefront-text";
import { formatPrice, getProductHref } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";

const statusClassMap: Record<Order["status"], string> = {
  Новый: "bg-slate-100 text-slate-700",
  "Ожидает оплаты": "bg-amber-100 text-amber-800",
  Оплачен: "bg-emerald-100 text-emerald-800",
  "В производстве": "bg-amber-100 text-amber-800",
  Отправлен: "bg-blue-100 text-blue-800",
  Доставлен: "bg-green-100 text-green-800",
  Отменён: "bg-red-100 text-red-700",
  Возвращён: "bg-slate-100 text-slate-700",
};

const paymentStatusLabel: Record<Order["paymentStatus"], string> = {
  NOT_STARTED: "Не начата",
  PENDING: "Ожидает оплаты",
  WAITING_FOR_CAPTURE: "Ожидает списания",
  SUCCEEDED: "Оплачено",
  CANCELED: "Отменена",
  REFUNDED: "Возврат",
  FAILED: "Ошибка оплаты",
};

export function OrderDetails({
  order,
  onRepeatOrder,
}: {
  order: Order;
  onRepeatOrder: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">Заказ {order.orderNumber}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Оформлен {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {order.paymentStatus === "PENDING" && order.payment?.confirmationUrl ? (
              <a href={order.payment.confirmationUrl} className="button-base button-primary rounded-2xl">
                Продолжить оплату
              </a>
            ) : null}
            <Button variant="secondary" className="rounded-2xl" onClick={onRepeatOrder}>
              <RotateCcw className="size-4" />
              Повторить заказ
            </Button>
            <a href="mailto:support@f1merch.store" className="button-base button-primary rounded-2xl">
              <Headset className="size-4" />
              Связаться с поддержкой
            </a>
          </div>
        </div>
      </div>

      <div className="card-panel p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900">Товары</h2>
        <div className="mt-5 space-y-4">
          {order.items.map((item) => (
            <div
              key={`${item.productId}-${item.color}-${item.size}`}
              className="flex flex-col gap-4 rounded-[20px] border border-slate-200 p-4 sm:flex-row"
            >
              <Link
                href={getProductHref({ id: item.productId, slug: item.slug })}
                className="relative flex h-28 w-full shrink-0 items-center justify-center rounded-[18px] bg-slate-50 p-2 sm:w-28"
              >
                <ProductImage src={item.image} alt={item.name} width={112} height={112} className="h-full w-full object-contain" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div>
                  <Link
                    href={getProductHref({ id: item.productId, slug: item.slug })}
                    className="text-base font-semibold text-slate-900 transition hover:text-red-600"
                  >
                    {item.name}
                  </Link>
                  {item.productKind === "gift_certificate" ? (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7b2220]">
                      <span>Digital Gift Card</span>
                      <span>Без доставки</span>
                      <span>Количество: {item.quantity}</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span>Размер: {sizeLabelRu(item.size)}</span>
                      <span>Расцветка: {colorLabelRu[item.color]}</span>
                      <span>Количество: {item.quantity}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatPrice(item.lineTotal)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Доставка и оплата</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Адрес доставки</p>
              {order.shippingAddress ? (
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  <p>{order.shippingAddress.recipient}</p>
                  <p>{order.shippingAddress.recipientPhone}</p>
                  <p>{order.shippingAddress.country}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.street}, дом {order.shippingAddress.house}
                    {order.shippingAddress.apartment ? `, ${order.shippingAddress.apartment}` : ""}
                  </p>
                  <p>Индекс: {order.shippingAddress.postalCode}</p>
                  {order.shippingAddress.courierComment ? (
                    <p>Комментарий: {order.shippingAddress.courierComment}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Доставка не требуется: заказ содержит только цифровые сертификаты.
                </p>
              )}
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Способ доставки</p>
                <p className="mt-2">{order.deliveryMethod}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Способ оплаты</p>
                <p className="mt-2">{order.paymentMethod}</p>
                <p className="mt-1 text-slate-500">{paymentStatusLabel[order.paymentStatus]}</p>
              </div>
              {order.usedBalance ? (
                <div className="rounded-[18px] bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">Баланс аккаунта</p>
                  <p className="mt-2">Списано: {formatPrice(order.amountPaidByBalance)}</p>
                  <p className="mt-1">Остаток после заказа: {formatPrice(order.balanceAfter)}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Сумма заказа</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Подытог</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Доставка</span>
              <span>
                {order.deliveryMethod === "Цифровой сертификат"
                  ? "Не требуется"
                  : order.shippingCost === 0
                    ? "Бесплатно"
                    : formatPrice(order.shippingCost)}
              </span>
            </div>
            {order.amountPaidByBalance > 0 ? (
              <div className="flex items-center justify-between text-[#7b2220]">
                <span>Списано с баланса</span>
                <span>− {formatPrice(order.amountPaidByBalance)}</span>
              </div>
            ) : null}
            {order.amountPaidByExternalMethod > 0 ? (
              <div className="flex items-center justify-between">
                <span>Оплачено другим способом</span>
                <span>{formatPrice(order.amountPaidByExternalMethod)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
              <span>Итого</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {order.giftCertificatesIssued.length > 0 ? (
        <div className="card-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Выданные сертификаты</h2>
          <div className="mt-5 grid gap-4">
            {order.giftCertificatesIssued.map((certificate) => (
              <div key={certificate.id} className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Номинал</p>
                    <p className="mt-2 font-semibold text-slate-900">{formatPrice(certificate.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Промокод</p>
                    <p className="mt-2 font-mono text-lg font-semibold tracking-[0.18em] text-slate-900">
                      {certificate.code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Статус</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {giftCertificateStatusLabelRu[certificate.status]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
