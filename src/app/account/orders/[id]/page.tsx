"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Order } from "@/lib/account-types";
import { orderService } from "@/services/order-service";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useToastStore } from "@/store/toast-store";
import { OrderDetails } from "@/components/order-details";

export default function AccountOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const addItem = useCartStore((state) => state.addItem);
  const pushToast = useToastStore((state) => state.pushToast);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!currentUser) {
      setOrder(undefined);
      return;
    }

    let ignore = false;
    void orderService.getByIdForUser(currentUser.id, params.id).then((nextOrder) => {
      if (!ignore) {
        setOrder(nextOrder);
      }
    });

    return () => {
      ignore = true;
    };
  }, [currentUser, params.id]);

  if (!currentUser) {
    return null;
  }

  if (order === undefined) {
    return (
      <div className="card-panel px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Загружаем заказ</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">Подготавливаем детали заказа.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card-panel px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Заказ не найден</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Возможно, заказ был удалён или вы открыли неверную ссылку.
        </p>
      </div>
    );
  }

  return (
    <OrderDetails
      order={order}
      onRepeatOrder={() => {
        order.items.forEach((item) => {
          addItem({
            productId: item.productId,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
          });
        });
        pushToast("Товары добавлены в корзину");
        router.push("/checkout");
      }}
    />
  );
}
