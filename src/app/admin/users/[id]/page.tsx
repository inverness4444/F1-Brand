import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAddressEditor } from "@/components/admin-address-editor";
import { AdminUserForm } from "@/components/admin-user-form";
import {
  adminOrderStatusLabel,
  adminPaymentStatusLabel,
  adminUserRoleLabel,
  adminUserStatusLabel,
} from "@/lib/admin-constants";
import { createPrivateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import {
  adminOrderSelect,
  adminUserDetailFromDb,
  adminUserSelect,
} from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { formatDate, formatDateTime } from "@/lib/account-utils";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = createPrivateMetadata("Карточка пользователя");
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const [{ id }, currentAdmin] = await Promise.all([params, requireAdmin()]);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...adminUserSelect,
      orders: {
        select: adminOrderSelect,
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) {
    notFound();
  }

  const aggregate = await prisma.order.aggregate({
    where: { userId: id },
    _count: {
      _all: true,
    },
    _sum: {
      totalAmount: true,
    },
  });
  const detail = adminUserDetailFromDb(user, {
    orderCount: aggregate._count._all,
    ordersTotal: aggregate._sum.totalAmount ?? 0,
  });

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="section-kicker">Пользователь</p>
              <h2 className="mt-2 break-words font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                {detail.name}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {adminUserRoleLabel[detail.role]}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {adminUserStatusLabel[detail.status]}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  Регистрация: {formatDate(detail.createdAt)}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs text-slate-400">{detail.id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/orders?userId=${detail.id}`} className="button-base button-secondary rounded-2xl">
                Заказы пользователя
              </Link>
              <Link href={`/admin/addresses?userId=${detail.id}`} className="button-base button-secondary rounded-2xl">
                Адреса пользователя
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Заказы</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{detail.orderCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Сумма заказов</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatPrice(detail.ordersTotal)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Адреса</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{detail.addressCount}</p>
            </div>
          </div>
        </div>

        <AdminUserForm user={detail} currentAdminId={currentAdmin.id} />

        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Адреса</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">Редактирование адресов пользователя.</p>
            </div>
            <Link href={`/admin/addresses?userId=${detail.id}`} className="button-base button-secondary rounded-2xl">
              Все адреса
            </Link>
          </div>
          <div className="mt-5">
            <AdminAddressEditor addresses={detail.addresses} emptyText="У пользователя нет сохранённых адресов." />
          </div>
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">История заказов</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">Последние 20 заказов этого пользователя.</p>
            </div>
            <Link href={`/admin/orders?userId=${detail.id}`} className="button-base button-secondary rounded-2xl">
              Все заказы
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Заказ</th>
                  <th className="px-5 py-4 font-semibold">Дата</th>
                  <th className="px-5 py-4 font-semibold">Статус</th>
                  <th className="px-5 py-4 font-semibold">Оплата</th>
                  <th className="px-5 py-4 font-semibold">Сумма</th>
                  <th className="px-5 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.orders.map((order) => (
                  <tr key={order.id} className="bg-white">
                    <td className="px-5 py-4 font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDateTime(order.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{adminOrderStatusLabel[order.status]}</td>
                    <td className="px-5 py-4 text-slate-600">{adminPaymentStatusLabel[order.paymentStatus]}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="button-base button-secondary rounded-2xl">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
                {detail.orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      У пользователя пока нет заказов.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
