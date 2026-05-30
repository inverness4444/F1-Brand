import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminOrderAddressForm,
  AdminOrderCustomerForm,
  AdminOrderStatusForm,
} from "@/components/admin-order-forms";
import { ProductImage } from "@/components/product-image";
import {
  adminFulfillmentStatusLabel,
  adminOrderStatusLabel,
  adminPaymentStatusLabel,
} from "@/lib/admin-constants";
import { createPrivateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { adminOrderFromDb, adminOrderSelect } from "@/lib/server/admin-data";
import { formatDateTime } from "@/lib/account-utils";
import { formatPrice, getProductHref } from "@/lib/utils";

export const metadata: Metadata = createPrivateMetadata("Заказ");
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function addressText(order: ReturnType<typeof adminOrderFromDb>) {
  if (!order.shippingAddress) {
    return ["Доставка не требуется"];
  }

  return [
    order.shippingAddress.recipient,
    order.shippingAddress.recipientPhone,
    order.shippingAddress.country,
    `${order.shippingAddress.city}, ${order.shippingAddress.street}, дом ${order.shippingAddress.house}${
      order.shippingAddress.apartment ? `, ${order.shippingAddress.apartment}` : ""
    }`,
    `Индекс: ${order.shippingAddress.postalCode}`,
    order.shippingAddress.courierComment ? `Комментарий: ${order.shippingAddress.courierComment}` : "",
  ].filter(Boolean);
}

export default async function AdminOrderDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const orderRow = await prisma.order.findUnique({
    where: { id },
    select: adminOrderSelect,
  });

  if (!orderRow) {
    notFound();
  }

  const order = adminOrderFromDb(orderRow);

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-kicker">Заказ</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                {order.orderNumber}
              </h2>
              <p className="mt-3 text-sm text-slate-500">Оформлен {formatDateTime(order.createdAt)}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">{order.id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {order.user ? (
                <Link href={`/admin/users/${order.user.id}`} className="button-base button-secondary rounded-2xl">
                  Карточка пользователя
                </Link>
              ) : null}
              <Link href="/admin/orders" className="button-base button-secondary rounded-2xl">
                Все заказы
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Сумма</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatPrice(order.total)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Заказ</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{adminOrderStatusLabel[order.status]}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Оплата</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{adminPaymentStatusLabel[order.paymentStatus]}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Доставка</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {adminFulfillmentStatusLabel[order.fulfillmentStatus]}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="grid gap-6">
            <div className="surface-card rounded-[32px] p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Состав заказа</h2>
              <div className="mt-5 grid gap-4">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <Link
                        href={getProductHref({ id: item.productId ?? item.productSlug, slug: item.productSlug })}
                        className="relative flex h-28 w-full shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-2 sm:w-28"
                      >
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.productName}
                          width={112}
                          height={112}
                          className="h-full w-full object-contain"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={getProductHref({ id: item.productId ?? item.productSlug, slug: item.productSlug })}
                          className="text-base font-semibold text-slate-900 transition hover:text-red-600"
                        >
                          {item.productName}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span>SKU: {item.sku || "—"}</span>
                          <span>Размер: {item.size}</span>
                          <span>Цвет: {item.color}</span>
                          <span>Количество: {item.quantity}</span>
                        </div>
                        {item.variantName ? <p className="mt-2 text-sm text-slate-500">{item.variantName}</p> : null}
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-slate-500">{formatPrice(item.unitPrice)} за шт.</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AdminOrderStatusForm order={order} />
            <AdminOrderCustomerForm order={order} />
          </div>

          <div className="grid content-start gap-6">
            <div className="card-panel p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Покупатель</h2>
              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                <p className="font-semibold text-slate-900">{order.user?.name ?? order.customer.name}</p>
                <p>{order.customer.email}</p>
                <p>{order.customer.phone}</p>
                {order.user ? (
                  <Link
                    href={`/admin/users/${order.user.id}`}
                    className="inline-flex font-semibold text-slate-900 underline-offset-4 hover:underline"
                  >
                    Перейти в карточку пользователя
                  </Link>
                ) : (
                  <p className="text-slate-500">Гостевой заказ без аккаунта.</p>
                )}
              </div>
            </div>

            <div className="card-panel p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Доставка и оплата</h2>
              <div className="mt-4 space-y-5 text-sm leading-7 text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Адрес доставки</p>
                  <div className="mt-2 space-y-1">
                    {addressText(order).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Способ доставки</p>
                  <p>{order.deliveryMethod}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Способ оплаты</p>
                  <p>{order.paymentMethod}</p>
                </div>
                {order.payment ? (
                  <div>
                    <p className="font-semibold text-slate-900">Платёж</p>
                    <p>
                      {order.payment.provider} · {adminPaymentStatusLabel[order.payment.status]} ·{" "}
                      {formatPrice(order.payment.amount)}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="card-panel p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Итого</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Подытог</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Скидка</span>
                  <span>{formatPrice(order.discount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Доставка</span>
                  <span>{formatPrice(order.shippingCost)}</span>
                </div>
                {order.amountPaidByBalance > 0 ? (
                  <div className="flex items-center justify-between text-[#7b2220]">
                    <span>Баланс</span>
                    <span>− {formatPrice(order.amountPaidByBalance)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                  <span>Итого</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AdminOrderAddressForm order={order} />
      </div>
    </section>
  );
}
