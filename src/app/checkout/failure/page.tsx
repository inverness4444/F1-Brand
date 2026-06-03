"use client";

import Link from "next/link";
import { CreditCard, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { Order } from "@/lib/account-types";
import { orderService } from "@/services/order-service";
import { formatPrice } from "@/lib/utils";

export default function CheckoutFailurePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let ignore = false;

    void orderService.getCheckoutSuccessOrder(orderId).then((nextOrder) => {
      if (!ignore) {
        setOrder(nextOrder);
      }
    });

    return () => {
      ignore = true;
    };
  }, [orderId]);

  return (
    <section className="container-shell py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="card-panel px-6 py-10 text-center sm:px-10">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <XCircle className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">Оплата не завершена</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Проверьте статус платежа и попробуйте оплатить заказ ещё раз. Если деньги уже списались, напишите в поддержку
            и укажите номер заказа.
          </p>

          {order ? (
            <div className="mx-auto mt-6 grid max-w-2xl gap-4 rounded-[24px] bg-slate-50 px-5 py-6 text-left sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Заказ</p>
                <p className="mt-2 font-semibold text-slate-900">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Сумма</p>
                <p className="mt-2 font-semibold text-slate-900">{formatPrice(order.total)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Статус оплаты</p>
                <p className="mt-2 font-semibold text-slate-900">{order.paymentStatus}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {order?.payment?.confirmationUrl ? (
              <a href={order.payment.confirmationUrl} className="button-base button-primary rounded-2xl">
                <CreditCard className="size-4" />
                Повторить оплату
              </a>
            ) : null}
            <Link href="/checkout" className="button-base button-secondary rounded-2xl">
              <RotateCcw className="size-4" />
              Вернуться к checkout
            </Link>
            <Link href="/contacts" className="button-base button-secondary rounded-2xl">
              Связаться с поддержкой
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
