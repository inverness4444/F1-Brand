import type { Metadata } from "next";
import type { NewsletterSubscriberStatus, Prisma } from "@prisma/client";
import Link from "next/link";

import { AdminNewsletterBulkActions, CopySubscriberEmailButton } from "@/components/admin-newsletter-actions";
import { AdminPagination } from "@/components/admin-pagination";
import {
  adminNewsletterSubscriberStatusLabel,
  adminNewsletterSubscriberStatusOptions,
} from "@/lib/admin-constants";
import { formatDateTime } from "@/lib/account-utils";
import { prisma } from "@/lib/prisma";
import { createPrivateMetadata } from "@/lib/seo";
import { sanitizeSearchQuery } from "@/lib/security-utils";

export const metadata: Metadata = createPrivateMetadata("Рассылка");
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const newsletterSubscriberStatusValues = new Set(["ACTIVE", "UNSUBSCRIBED"]);

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

function parseStatus(value: string | string[] | undefined): NewsletterSubscriberStatus | "" {
  const status = firstParam(value);
  return status && newsletterSubscriberStatusValues.has(status) ? (status as NewsletterSubscriberStatus) : "";
}

function queryParams(params: Record<string, string | string[] | undefined>) {
  return {
    q: sanitizeSearchQuery(firstParam(params.q) ?? ""),
    status: parseStatus(params.status),
    page: parsePage(params.page),
  };
}

export default async function AdminNewsletterPage({ searchParams }: PageProps) {
  const rawParams = (await searchParams) ?? {};
  const params = queryParams(rawParams);
  const where: Prisma.NewsletterSubscriberWhereInput = {};

  if (params.q) {
    where.email = {
      contains: params.q,
      mode: "insensitive",
    };
  }

  if (params.status) {
    where.status = params.status;
  }

  const skip = (params.page - 1) * PAGE_SIZE;
  const [subscribers, total, totalSubscribers, activeSubscribers] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
  ]);
  const paginationParams = {
    q: params.q || undefined,
    status: params.status || undefined,
  };

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Рассылка</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                Подписчики на новости
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Email-адреса для ручной рассылки. Автоматическая отправка писем не подключена.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Найдено</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Всего</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{totalSubscribers}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Активны</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{activeSubscribers}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <form className="grid flex-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_auto]" action="/admin/newsletter">
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Поиск по email"
                className="field-base"
                maxLength={80}
              />
              <select name="status" defaultValue={params.status} className="field-base">
                <option value="">Все статусы</option>
                {adminNewsletterSubscriberStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="button-base button-primary rounded-2xl">
                Найти
              </button>
            </form>

            <AdminNewsletterBulkActions activeCount={activeSubscribers} />
          </div>

          {params.q || params.status ? (
            <p className="mt-4 text-sm text-slate-500">
              Фильтры применены.{" "}
              <Link href="/admin/newsletter" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                Сбросить
              </Link>
            </p>
          ) : null}
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Дата подписки</th>
                  <th className="px-5 py-4 font-semibold">Статус</th>
                  <th className="px-5 py-4 font-semibold">Источник</th>
                  <th className="px-5 py-4 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="bg-white align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{subscriber.email}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{subscriber.id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(subscriber.createdAt.toISOString())}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {adminNewsletterSubscriberStatusLabel[subscriber.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{subscriber.source || "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <CopySubscriberEmailButton email={subscriber.email} />
                    </td>
                  </tr>
                ))}
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                      Подписчики не найдены.
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
          basePath="/admin/newsletter"
          searchParams={paginationParams}
        />
      </div>
    </section>
  );
}
