import type { Metadata } from "next";
import Link from "next/link";
import type { FulfillmentStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { AdminPagination } from "@/components/admin-pagination";
import { AdminOrderStatusSelect } from "@/components/admin-order-forms";
import {
  adminFulfillmentStatusLabel,
  adminFulfillmentStatusOptions,
  adminOrderStatusOptions,
  adminPaymentStatusLabel,
  adminPaymentStatusOptions,
} from "@/lib/admin-constants";
import { createPrivateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { adminOrderSelect, adminOrderSummaryFromDb } from "@/lib/server/admin-data";
import { formatDate } from "@/lib/account-utils";
import { sanitizeIdentifier, sanitizeSearchQuery } from "@/lib/security-utils";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = createPrivateMetadata("Заказы");
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const page = Number.parseInt(firstParam(value) ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function queryParams(params: Record<string, string | string[] | undefined>) {
  const status = firstParam(params.status);
  const paymentStatus = firstParam(params.paymentStatus);
  const fulfillmentStatus = firstParam(params.fulfillmentStatus);

  return {
    q: sanitizeSearchQuery(firstParam(params.q) ?? ""),
    userId: sanitizeIdentifier(firstParam(params.userId) ?? "", ""),
    status: adminOrderStatusOptions.some((option) => option.value === status) ? status ?? "" : "",
    paymentStatus: adminPaymentStatusOptions.some((option) => option.value === paymentStatus) ? paymentStatus ?? "" : "",
    fulfillmentStatus: adminFulfillmentStatusOptions.some((option) => option.value === fulfillmentStatus)
      ? fulfillmentStatus ?? ""
      : "",
    dateFrom: firstParam(params.dateFrom) ?? "",
    dateTo: firstParam(params.dateTo) ?? "",
    page: parsePage(params.page),
  };
}

function addressLine(order: ReturnType<typeof adminOrderSummaryFromDb>) {
  if (!order.shippingAddress) {
    return "Доставка не требуется";
  }

  return `${order.shippingAddress.city}, ${order.shippingAddress.street}, дом ${order.shippingAddress.house}`;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const rawParams = (await searchParams) ?? {};
  const params = queryParams(rawParams);
  const createdFrom = parseDate(params.dateFrom);
  const createdTo = parseDate(params.dateTo, true);
  const where: Prisma.OrderWhereInput = {};

  if (params.q) {
    where.OR = [
      { orderNumber: { contains: params.q, mode: "insensitive" } },
      { id: { contains: params.q, mode: "insensitive" } },
      { customerName: { contains: params.q, mode: "insensitive" } },
      { customerEmail: { contains: params.q, mode: "insensitive" } },
      { customerPhone: { contains: params.q, mode: "insensitive" } },
      {
        user: {
          is: {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
              { phone: { contains: params.q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  if (params.userId) {
    where.userId = params.userId;
  }

  if (params.status) {
    where.status = params.status as OrderStatus;
  }

  if (params.paymentStatus) {
    where.paymentStatus = params.paymentStatus as PaymentStatus;
  }

  if (params.fulfillmentStatus) {
    where.fulfillmentStatus = params.fulfillmentStatus as FulfillmentStatus;
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    };
  }

  const skip = (params.page - 1) * PAGE_SIZE;
  const [orders, total, pendingCount, paidCount] = await Promise.all([
    prisma.order.findMany({
      where,
      select: adminOrderSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { status: { in: ["PENDING", "AWAITING_PAYMENT"] } } }),
    prisma.order.count({ where: { paymentStatus: "SUCCEEDED" } }),
  ]);
  const rows = orders.map(adminOrderSummaryFromDb);
  const paginationParams = {
    q: params.q || undefined,
    userId: params.userId || undefined,
    status: params.status || undefined,
    paymentStatus: params.paymentStatus || undefined,
    fulfillmentStatus: params.fulfillmentStatus || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Заказы</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                Все заказы магазина
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Поиск по номеру, покупателю, телефону, статусам и дате оформления.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Найдено</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Новые</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{pendingCount}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Оплачены</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{paidCount}</p>
              </div>
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_170px_190px_190px_160px_160px_auto]"
            action="/admin/orders"
          >
            {params.userId ? <input type="hidden" name="userId" value={params.userId} /> : null}
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Номер, покупатель, email, телефон"
              className="field-base"
              maxLength={80}
            />
            <select name="status" defaultValue={params.status} className="field-base">
              <option value="">Статус заказа</option>
              {adminOrderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="paymentStatus" defaultValue={params.paymentStatus} className="field-base">
              <option value="">Статус оплаты</option>
              {adminPaymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="fulfillmentStatus" defaultValue={params.fulfillmentStatus} className="field-base">
              <option value="">Доставка</option>
              {adminFulfillmentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input name="dateFrom" defaultValue={params.dateFrom} type="date" className="field-base" />
            <input name="dateTo" defaultValue={params.dateTo} type="date" className="field-base" />
            <button type="submit" className="button-base button-primary rounded-2xl">
              Найти
            </button>
          </form>

          {params.userId ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <span>Показаны заказы пользователя {params.userId}</span>
              <Link href="/admin/orders" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                Сбросить
              </Link>
            </div>
          ) : null}
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Заказ</th>
                  <th className="px-5 py-4 font-semibold">Покупатель</th>
                  <th className="px-5 py-4 font-semibold">Товары</th>
                  <th className="px-5 py-4 font-semibold">Сумма</th>
                  <th className="px-5 py-4 font-semibold">Статусы</th>
                  <th className="px-5 py-4 font-semibold">Адрес</th>
                  <th className="px-5 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((order) => (
                  <tr key={order.id} className="bg-white align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                      <p className="mt-1 text-slate-500">{formatDate(order.createdAt)}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{order.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{order.user?.name ?? order.customer.name}</p>
                      <p className="mt-1 text-slate-500">{order.customer.email}</p>
                      <p className="mt-1 text-slate-500">{order.customer.phone}</p>
                      {order.user ? (
                        <Link
                          href={`/admin/users/${order.user.id}`}
                          className="mt-2 inline-flex text-xs font-semibold text-slate-900 underline-offset-4 hover:underline"
                        >
                          Карточка пользователя
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{order.itemCount} шт.</p>
                      <p className="mt-1 max-w-xs">{order.itemNames.join(", ") || "—"}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <AdminOrderStatusSelect orderId={order.id} status={order.status} />
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                          {adminPaymentStatusLabel[order.paymentStatus]}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {adminFulfillmentStatusLabel[order.fulfillmentStatus]}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{addressLine(order)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="button-base button-secondary rounded-2xl">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      Заказы не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <AdminPagination
          page={params.page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/orders"
          searchParams={paginationParams}
        />
      </div>
    </section>
  );
}
