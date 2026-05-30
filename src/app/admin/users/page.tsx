import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";

import { AdminPagination } from "@/components/admin-pagination";
import {
  adminUserRoleLabel,
  adminUserRoleOptions,
  adminUserStatusLabel,
  adminUserStatusOptions,
} from "@/lib/admin-constants";
import { createPrivateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { adminUserSelect, adminUserSummaryFromDb } from "@/lib/server/admin-data";
import { formatDate } from "@/lib/account-utils";
import { formatPrice } from "@/lib/utils";
import { sanitizeSearchQuery } from "@/lib/security-utils";

export const metadata: Metadata = createPrivateMetadata("Пользователи");
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
  return {
    q: sanitizeSearchQuery(firstParam(params.q) ?? ""),
    role: firstParam(params.role) === "USER" || firstParam(params.role) === "ADMIN" ? firstParam(params.role) : "",
    status:
      firstParam(params.status) === "ACTIVE" || firstParam(params.status) === "DISABLED"
        ? firstParam(params.status)
        : "",
    dateFrom: firstParam(params.dateFrom) ?? "",
    dateTo: firstParam(params.dateTo) ?? "",
    page: parsePage(params.page),
  };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const rawParams = (await searchParams) ?? {};
  const params = queryParams(rawParams);
  const createdFrom = parseDate(params.dateFrom);
  const createdTo = parseDate(params.dateTo, true);
  const where: Prisma.UserWhereInput = {};

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
      { id: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.role) {
    where.role = params.role as UserRole;
  }

  if (params.status) {
    where.status = params.status as UserStatus;
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    };
  }

  const skip = (params.page - 1) * PAGE_SIZE;
  const [users, total, activeUsers, disabledUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "DISABLED" } }),
  ]);
  const userIds = users.map((user) => user.id);
  const orderStatsRows = userIds.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: {
            in: userIds,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
        },
      })
    : [];
  const orderStats = new Map(
    orderStatsRows
      .filter((row) => row.userId)
      .map((row) => [
        row.userId!,
        {
          orderCount: row._count._all,
          ordersTotal: row._sum.totalAmount ?? 0,
        },
      ]),
  );
  const rows = users.map((user) => adminUserSummaryFromDb(user, orderStats.get(user.id)));
  const paginationParams = {
    q: params.q || undefined,
    role: params.role || undefined,
    status: params.status || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Пользователи</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                Аккаунты и покупатели
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Поиск и управление ролями, статусами, адресами и историей заказов.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Найдено</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Активны</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{activeUsers}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Отключены</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{disabledUsers}</p>
              </div>
            </div>
          </div>

          <form className="mt-6 grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_180px_180px_160px_160px_auto]" action="/admin/users">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Имя, email, телефон или ID"
              className="field-base"
              maxLength={80}
            />
            <select name="role" defaultValue={params.role} className="field-base">
              <option value="">Все роли</option>
              {adminUserRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={params.status} className="field-base">
              <option value="">Все статусы</option>
              {adminUserStatusOptions.map((option) => (
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
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Пользователь</th>
                  <th className="px-5 py-4 font-semibold">Телефон</th>
                  <th className="px-5 py-4 font-semibold">Роль</th>
                  <th className="px-5 py-4 font-semibold">Статус</th>
                  <th className="px-5 py-4 font-semibold">Регистрация</th>
                  <th className="px-5 py-4 font-semibold">Заказы</th>
                  <th className="px-5 py-4 font-semibold">Сумма</th>
                  <th className="px-5 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => (
                  <tr key={user.id} className="bg-white align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="mt-1 text-slate-500">{user.email}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{user.id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{user.phone || "—"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {adminUserRoleLabel[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {adminUserStatusLabel[user.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{user.orderCount}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{formatPrice(user.ordersTotal)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/users/${user.id}`} className="button-base button-secondary rounded-2xl">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                      Пользователи не найдены.
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
          basePath="/admin/users"
          searchParams={paginationParams}
        />
      </div>
    </section>
  );
}
