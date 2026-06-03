"use client";

import Link from "next/link";
import { CheckCircle2, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Order } from "@/lib/account-types";
import { orderService } from "@/services/order-service";
import { useAuthStore } from "@/store/auth-store";
import { giftCertificateStatusLabelRu } from "@/lib/storefront-text";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void orderService.getCheckoutSuccessOrder(orderId).then((nextOrder) => {
      if (ignore) {
        return;
      }

      if (nextOrder && ["FAILED", "CANCELED"].includes(nextOrder.paymentStatus)) {
        router.replace(`/checkout/failure?order=${encodeURIComponent(nextOrder.id)}`);
        return;
      }

      setOrder(nextOrder);
    });

    return () => {
      ignore = true;
    };
  }, [currentUser?.id, orderId, router]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  };

  return (
    <section className="container-shell py-12">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="card-panel px-6 py-10 text-center sm:px-10">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">Заказ успешно оформлен</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {order
              ? `Заказ ${order.orderNumber} принят в работу.`
              : "Мы приняли заказ и отправили его в обработку."}
          </p>

          {order ? (
            <div className="mx-auto mt-6 grid max-w-3xl gap-4 rounded-[24px] bg-slate-50 px-5 py-6 text-left sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Сумма заказа</p>
                <p className="mt-2 font-semibold text-slate-900">{formatPrice(order.total)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Статус</p>
                <p className="mt-2 font-semibold text-slate-900">{order.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Оплата</p>
                <p className="mt-2 font-semibold text-slate-900">{order.paymentMethod}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {order?.paymentStatus === "PENDING" && order.payment?.confirmationUrl ? (
              <a href={order.payment.confirmationUrl} className="button-base button-primary rounded-2xl">
                Продолжить оплату
              </a>
            ) : null}
            <Link href="/shop" className="button-base button-secondary rounded-2xl">
              Вернуться в каталог
            </Link>
            {currentUser ? (
              <Link href="/account/orders" className="button-base button-primary rounded-2xl">
                Перейти к заказам
              </Link>
            ) : (
              <Link href="/register" className="button-base button-primary rounded-2xl">
                Создать аккаунт
              </Link>
            )}
          </div>
        </div>

        {order?.giftCertificatesIssued.length ? (
          <div className="card-panel p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">Цифровые коды</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Ваши подарочные сертификаты</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Передайте этот код получателю. Код можно активировать только один раз.
                </p>
              </div>
              <p className="text-sm leading-7 text-slate-500">
                Код также будет отправлен на email после подключения backend/email service.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {order.giftCertificatesIssued.map((certificate) => (
                <div
                  key={certificate.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="grid gap-4 sm:grid-cols-3">
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
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => void handleCopyCode(certificate.code)}
                      >
                        <Copy className="size-4" />
                        {copiedCode === certificate.code ? "Скопировано" : "Скопировать код"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {order?.usedBalance ? (
          <div className="card-panel p-5 sm:p-6">
            <p className="section-kicker">Баланс</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Оплата балансом</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Списано с баланса</p>
                <p className="mt-2 font-semibold text-slate-900">{formatPrice(order.amountPaidByBalance)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Оплачено другим способом</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatPrice(order.amountPaidByExternalMethod)}
                </p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Остаток баланса</p>
                <p className="mt-2 font-semibold text-slate-900">{formatPrice(order.balanceAfter)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
