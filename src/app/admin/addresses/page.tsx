import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { AdminAddressEditor } from "@/components/admin-address-editor";
import { AdminPagination } from "@/components/admin-pagination";
import { createPrivateMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { adminAddressFromDb, adminAddressSelect } from "@/lib/server/admin-data";
import { sanitizeIdentifier, sanitizeSearchQuery } from "@/lib/security-utils";

export const metadata: Metadata = createPrivateMetadata("Адреса и доставка");
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

function queryParams(params: Record<string, string | string[] | undefined>) {
  return {
    q: sanitizeSearchQuery(firstParam(params.q) ?? ""),
    userId: sanitizeIdentifier(firstParam(params.userId) ?? "", ""),
    page: parsePage(params.page),
  };
}

export default async function AdminAddressesPage({ searchParams }: PageProps) {
  const rawParams = (await searchParams) ?? {};
  const params = queryParams(rawParams);
  const where: Prisma.AddressWhereInput = {};

  if (params.q) {
    where.OR = [
      { recipient: { contains: params.q, mode: "insensitive" } },
      { recipientPhone: { contains: params.q, mode: "insensitive" } },
      { city: { contains: params.q, mode: "insensitive" } },
      { street: { contains: params.q, mode: "insensitive" } },
      { postalCode: { contains: params.q, mode: "insensitive" } },
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

  const skip = (params.page - 1) * PAGE_SIZE;
  const [addresses, total, defaultCount] = await Promise.all([
    prisma.address.findMany({
      where,
      select: adminAddressSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.address.count({ where }),
    prisma.address.count({ where: { isDefault: true } }),
  ]);
  const rows = addresses.map(adminAddressFromDb);
  const paginationParams = {
    q: params.q || undefined,
    userId: params.userId || undefined,
  };

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Адреса/доставка</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                Адреса пользователей
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Поиск адресов, получателей и связанных покупателей. Адрес доставки конкретного заказа редактируется в карточке заказа.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Найдено</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Основных</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{defaultCount}</p>
              </div>
            </div>
          </div>

          <form className="mt-6 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]" action="/admin/addresses">
            {params.userId ? <input type="hidden" name="userId" value={params.userId} /> : null}
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Получатель, телефон, город, улица или пользователь"
              className="field-base"
              maxLength={80}
            />
            <button type="submit" className="button-base button-primary rounded-2xl">
              Найти
            </button>
          </form>

          {params.userId ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <span>Показаны адреса пользователя {params.userId}</span>
              <Link href="/admin/addresses" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                Сбросить
              </Link>
            </div>
          ) : null}
        </div>

        <AdminAddressEditor
          addresses={rows}
          showUserLinks
          emptyText="Адреса по заданным фильтрам не найдены."
        />

        <AdminPagination
          page={params.page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/addresses"
          searchParams={paginationParams}
        />
      </div>
    </section>
  );
}
