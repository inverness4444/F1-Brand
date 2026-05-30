"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { favoriteService } from "@/services/favorite-service";
import { balanceService } from "@/services/balance-service";
import { giftCertificateService } from "@/services/gift-certificate-service";
import { orderService } from "@/services/order-service";
import { useAuthStore } from "@/store/auth-store";
import { canAccessAdmin } from "@/lib/security-utils";
import { formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/account-utils";
import type { GiftCertificate, Order } from "@/lib/account-types";

export default function AccountPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [activatedCertificates, setActivatedCertificates] = useState<GiftCertificate[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setFavoritesCount(0);
      setBalanceAmount(0);
      setActivatedCertificates([]);
      return;
    }

    let ignore = false;
    void Promise.all([
      orderService.listByUser(currentUser.id),
      favoriteService.listByUser(currentUser.id),
      balanceService.getByUserIdUnsafe(currentUser.id),
      giftCertificateService.listByActivatedUser(currentUser.id),
    ]).then(([nextOrders, favorites, balance, certificates]) => {
      if (!ignore) {
        setOrders(nextOrders);
        setFavoritesCount(favorites.length);
        setBalanceAmount(balance.amount);
        setActivatedCertificates(certificates);
      }
    });

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const lastOrder = orders[0] ?? null;
  const isAdmin = canAccessAdmin(currentUser);

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <p className="section-kicker">Обзор</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Привет, {currentUser.name}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          Здесь собраны ваши заказы, избранное и быстрые действия по магазину.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-panel p-5">
          <p className="text-sm text-slate-500">Количество заказов</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{orders.length}</p>
        </div>
        <div className="card-panel p-5">
          <p className="text-sm text-slate-500">Товаров в избранном</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{favoritesCount}</p>
        </div>
        <div className="card-panel p-5">
          <p className="text-sm text-slate-500">Последний заказ</p>
          <p className="mt-4 text-lg font-semibold text-slate-900">
            {lastOrder ? lastOrder.orderNumber : "Пока нет"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {lastOrder ? formatDate(lastOrder.createdAt) : "Оформите первый заказ, чтобы увидеть историю."}
          </p>
        </div>
        <div className="card-panel p-5">
          <p className="text-sm text-slate-500">Баланс</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatPrice(balanceAmount)}</p>
          <p className="mt-2 text-sm text-slate-500">
            Активировано сертификатов: {activatedCertificates.length}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card-panel p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Быстрые действия</h3>
          <div className="mt-5 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <Link href="/admin" className="button-base button-primary rounded-2xl">
                  Админка
                </Link>
                <Link href="/admin/products" className="button-base button-secondary rounded-2xl">
                  Редактор каталога
                </Link>
              </>
            ) : null}
            <Link href="/shop" className="button-base button-primary rounded-2xl">
              Перейти в каталог
            </Link>
            <Link href="/account/orders" className="button-base button-secondary rounded-2xl">
              Посмотреть заказы
            </Link>
            <Link href="/account/gift-cards" className="button-base button-secondary rounded-2xl">
              Баланс и сертификаты
            </Link>
            <Link href="/account/profile" className="button-base button-secondary rounded-2xl">
              Редактировать профиль
            </Link>
          </div>
        </div>

        <div className="card-panel p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Последний заказ</h3>
          {lastOrder ? (
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Номер заказа</span>
                <span className="font-semibold text-slate-900">{lastOrder.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Статус</span>
                <span className="font-semibold text-slate-900">{lastOrder.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Сумма</span>
                <span className="font-semibold text-slate-900">{formatPrice(lastOrder.total)}</span>
              </div>
              <div className="pt-2">
                <Link href={`/account/orders/${lastOrder.id}`} className="text-sm font-semibold text-red-600">
                  Открыть детали заказа
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Когда вы оформите первый заказ, здесь появится его статус и краткая сводка.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
