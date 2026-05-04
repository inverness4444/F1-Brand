"use client";

import { orderService } from "@/services/order-service";
import { useAuthStore } from "@/store/auth-store";
import { OrdersList } from "@/components/orders-list";

export default function AccountOrdersPage() {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!currentUser) {
    return null;
  }

  const orders = orderService.listByUser(currentUser.id);

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Мои заказы</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Следите за статусом, суммой и деталями каждого заказа в одном списке.
        </p>
      </div>

      <OrdersList orders={orders} />
    </div>
  );
}
