"use client";

import Link from "next/link";

import { formatDate } from "@/lib/account-utils";
import type { Order } from "@/lib/account-types";
import { formatPrice } from "@/lib/utils";

const statusClassMap: Record<Order["status"], string> = {
  Новый: "bg-slate-100 text-slate-700",
  Оплачен: "bg-emerald-100 text-emerald-800",
  "В производстве": "bg-amber-100 text-amber-800",
  Отправлен: "bg-blue-100 text-blue-800",
  Доставлен: "bg-green-100 text-green-800",
  Отменён: "bg-red-100 text-red-700",
};

export function OrdersList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="card-panel flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Заказов пока нет</h2>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          После оформления первого заказа он появится здесь вместе со статусом и деталями доставки.
        </p>
        <Link href="/shop" className="button-base button-primary mt-5 rounded-2xl">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="card-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Заказ {order.orderNumber}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{formatDate(order.createdAt)}</p>
            </div>

            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3 lg:min-w-0 lg:max-w-[360px]">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Сумма</p>
                <p className="mt-1 font-semibold text-slate-900">{formatPrice(order.total)}</p>
                {order.amountPaidByBalance > 0 ? (
                  <p className="mt-1 text-xs text-[#7b2220]">Баланс: − {formatPrice(order.amountPaidByBalance)}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Товаров</p>
                <p className="mt-1 font-semibold text-slate-900">{order.itemCount}</p>
              </div>
              <div className="flex items-end sm:justify-end">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="button-base button-secondary rounded-2xl"
                >
                  Подробнее
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
