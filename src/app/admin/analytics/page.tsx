import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import {
  analyticsDeviceTypes,
  analyticsEntityLabels,
  analyticsEventLabels,
  type AnalyticsDeviceType,
  type AnalyticsEventType,
} from "@/lib/analytics";
import { formatDateTime } from "@/lib/account-utils";
import { prisma } from "@/lib/prisma";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivateMetadata("Аналитика");
export const dynamic = "force-dynamic";

const periodOptions = [
  { value: "today", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "all", label: "Всё время" },
] as const;

type PeriodValue = (typeof periodOptions)[number]["value"];
type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProductStats = {
  id: string;
  name: string;
  views: number;
  clicks: number;
  adds: number;
};

type TopItem = {
  id: string;
  name: string;
  count: number;
};

const funnelEvents: Array<{ eventType: AnalyticsEventType; label: string }> = [
  { eventType: "product_view", label: "Просмотр товара" },
  { eventType: "add_to_cart", label: "Добавление в корзину" },
  { eventType: "checkout_start", label: "Переход в checkout" },
  { eventType: "order_created", label: "Создание заказа" },
  { eventType: "payment_succeeded", label: "Успешная оплата" },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePeriod(value: string | string[] | undefined): PeriodValue {
  const period = firstParam(value);
  return periodOptions.some((option) => option.value === period) ? (period as PeriodValue) : "30d";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function periodStart(period: PeriodValue) {
  if (period === "today") {
    return startOfToday();
  }

  if (period === "7d") {
    return daysAgo(7);
  }

  if (period === "30d") {
    return daysAgo(30);
  }

  return null;
}

function periodWhere(period: PeriodValue): Prisma.AnalyticsEventWhereInput {
  const start = periodStart(period);
  return start ? { createdAt: { gte: start } } : {};
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function conversionPercent(adds: number, views: number) {
  if (views <= 0) {
    return "0%";
  }

  return `${Math.round((adds / views) * 1000) / 10}%`;
}

function eventCount(counts: Array<{ eventType: string; _count: { _all: number } }>, eventType: AnalyticsEventType) {
  return counts.find((entry) => entry.eventType === eventType)?._count._all ?? 0;
}

function pushProductStat(map: Map<string, ProductStats>, eventType: string, id: string | null, name: string | null, count: number) {
  if (!id && !name) {
    return;
  }

  const key = id ?? name ?? "unknown";
  const current = map.get(key) ?? {
    id: id ?? key,
    name: name ?? id ?? "Товар",
    views: 0,
    clicks: 0,
    adds: 0,
  };

  if (eventType === "product_view") {
    current.views += count;
  } else if (eventType === "product_click") {
    current.clicks += count;
  } else if (eventType === "add_to_cart") {
    current.adds += count;
  }

  map.set(key, current);
}

function topProducts(products: ProductStats[], key: keyof Pick<ProductStats, "views" | "clicks" | "adds">) {
  return [...products]
    .filter((product) => product[key] > 0)
    .sort((left, right) => right[key] - left[key])
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      name: product.name,
      count: product[key],
    }));
}

function topGroupItems(
  rows: Array<{ entityId: string | null; entityName: string | null; _count: { _all: number } }>,
  limit = 8,
) {
  return rows
    .map((row) => ({
      id: row.entityId ?? row.entityName ?? "unknown",
      name: row.entityName ?? row.entityId ?? "Без названия",
      count: row._count._all,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(value)}</p>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: TopItem[] }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.id}-${item.name}`} className="flex items-start justify-between gap-4 text-sm">
            <span className="min-w-0 break-words text-slate-600">{item.name}</span>
            <span className="shrink-0 font-semibold text-slate-900">{formatNumber(item.count)}</span>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">Пока нет событий.</p> : null}
      </div>
    </div>
  );
}

function deviceLabel(deviceType: string) {
  if (!analyticsDeviceTypes.includes(deviceType as AnalyticsDeviceType)) {
    return "Неизвестно";
  }

  return deviceType === "mobile" ? "Mobile" : deviceType === "tablet" ? "Tablet" : "Desktop";
}

function shortSessionId(sessionId: string | null) {
  if (!sessionId) {
    return "без session";
  }

  return `session ${sessionId.slice(0, 8)}`;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const period = parsePeriod(params.period);
  const where = periodWhere(period);
  const eventTypeWhere = (eventTypes: AnalyticsEventType[]): Prisma.AnalyticsEventWhereInput => ({
    ...where,
    eventType: { in: eventTypes },
  });

  const [
    totalEvents,
    todayEvents,
    weekEvents,
    monthEvents,
    periodCounts,
    productGroups,
    sectionGroups,
    categoryGroups,
    filterGroups,
    latestEvents,
  ] = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: startOfToday() } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: eventTypeWhere(funnelEvents.map((entry) => entry.eventType)),
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventType", "entityId", "entityName"],
      where: eventTypeWhere(["product_view", "product_click", "add_to_cart"]),
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId", "entityName"],
      where: { ...where, eventType: "section_click", entityType: "section" },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId", "entityName"],
      where: { ...where, eventType: "category_open", entityType: "category" },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["eventType", "entityId", "entityName"],
      where: eventTypeWhere(["filter_click", "search_query"]),
      _count: { _all: true },
    }),
    prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        eventType: true,
        entityType: true,
        entityId: true,
        entityName: true,
        path: true,
        deviceType: true,
        sessionId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const productStatsMap = new Map<string, ProductStats>();

  productGroups.forEach((row) => {
    pushProductStat(productStatsMap, row.eventType, row.entityId, row.entityName, row._count._all);
  });

  const productStats = [...productStatsMap.values()];
  const topByViews = topProducts(productStats, "views");
  const topByClicks = topProducts(productStats, "clicks");
  const topByAdds = topProducts(productStats, "adds");
  const conversionRows = [...productStats]
    .filter((product) => product.views > 0 || product.adds > 0)
    .sort((left, right) => right.views - left.views)
    .slice(0, 12);
  const selectedPeriodLabel = periodOptions.find((option) => option.value === period)?.label ?? "30 дней";
  const totalInPeriod = await prisma.analyticsEvent.count({ where });

  return (
    <section className="container-shell py-8">
      <div className="grid gap-6">
        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Аналитика</p>
              <h2 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
                Внутренняя аналитика сайта
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                События кликов, просмотров, корзины, checkout, подписки и оплаты хранятся только в базе проекта.
              </p>
            </div>
            <form className="grid gap-3 sm:grid-cols-[180px_auto]" action="/admin/analytics">
              <select name="period" defaultValue={period} className="field-base">
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="button-base button-primary rounded-2xl">
                Показать
              </button>
            </form>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Всего событий" value={totalEvents} />
            <MetricCard label="Сегодня" value={todayEvents} />
            <MetricCard label="7 дней" value={weekEvents} />
            <MetricCard label="30 дней" value={monthEvents} />
          </div>
        </div>

        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Период</p>
              <h3 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900">
                {selectedPeriodLabel}
              </h3>
            </div>
            <Link href="/admin/analytics?period=all" className="text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
              Всё время
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="События периода" value={totalInPeriod} />
            <MetricCard label="Просмотры товаров" value={eventCount(periodCounts, "product_view")} />
            <MetricCard label="Добавления в корзину" value={eventCount(periodCounts, "add_to_cart")} />
            <MetricCard label="Переходы в checkout" value={eventCount(periodCounts, "checkout_start")} />
            <MetricCard label="Создано заказов" value={eventCount(periodCounts, "order_created")} />
            <MetricCard label="Успешные оплаты" value={eventCount(periodCounts, "payment_succeeded")} />
            <MetricCard label="Ошибки оплаты" value={eventCount(periodCounts, "payment_failed")} />
            <MetricCard label="Отмены оплаты" value={eventCount(periodCounts, "payment_canceled")} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <TopList title="Топ товаров по просмотрам" items={topByViews} />
          <TopList title="Топ товаров по кликам" items={topByClicks} />
          <TopList title="Топ товаров по добавлениям" items={topByAdds} />
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h3 className="font-[var(--font-heading)] text-xl font-bold text-slate-900">Конверсия товаров</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Товар</th>
                  <th className="px-5 py-4 font-semibold">Просмотры</th>
                  <th className="px-5 py-4 font-semibold">Клики</th>
                  <th className="px-5 py-4 font-semibold">Добавления</th>
                  <th className="px-5 py-4 font-semibold">Просмотр → корзина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversionRows.map((product) => (
                  <tr key={product.id} className="bg-white">
                    <td className="px-5 py-4 font-semibold text-slate-900">{product.name}</td>
                    <td className="px-5 py-4 text-slate-600">{formatNumber(product.views)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatNumber(product.clicks)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatNumber(product.adds)}</td>
                    <td className="px-5 py-4 text-slate-900">{conversionPercent(product.adds, product.views)}</td>
                  </tr>
                ))}
                {conversionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                      По товарам пока нет событий.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="grid gap-6">
            <TopList title="Популярные секции главной/навигации" items={topGroupItems(sectionGroups)} />
            <TopList title="Популярные категории" items={topGroupItems(categoryGroups)} />
          </div>
          <div className="rounded-[32px] border border-slate-200 bg-white p-5">
            <h3 className="font-[var(--font-heading)] text-xl font-bold text-slate-900">Фильтры и поиск</h3>
            <div className="mt-4 space-y-3">
              {filterGroups
                .map((row) => ({
                  id: `${row.eventType}-${row.entityId ?? row.entityName}`,
                  name: row.entityName ?? row.entityId ?? analyticsEventLabels[row.eventType as AnalyticsEventType],
                  count: row._count._all,
                  eventType: row.eventType as AnalyticsEventType,
                }))
                .sort((left, right) => right.count - left.count)
                .slice(0, 12)
                .map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                    <span className="min-w-0 break-words text-slate-600">
                      {analyticsEventLabels[item.eventType]} · {item.name}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-900">{formatNumber(item.count)}</span>
                  </div>
                ))}
              {filterGroups.length === 0 ? <p className="text-sm text-slate-500">Пока нет событий.</p> : null}
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[32px] p-5 sm:p-6">
          <div className="mb-5">
            <p className="section-kicker">Воронка</p>
            <h3 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900">
              Product view → payment
            </h3>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {funnelEvents.map((entry, index) => {
              const count = eventCount(periodCounts, entry.eventType);
              const previousCount = index > 0 ? eventCount(periodCounts, funnelEvents[index - 1].eventType) : count;

              return (
                <div key={entry.eventType} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{entry.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(count)}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {index === 0 ? "Старт" : `${conversionPercent(count, previousCount)} от предыдущего шага`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card overflow-hidden rounded-[32px]">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h3 className="font-[var(--font-heading)] text-xl font-bold text-slate-900">Последние события</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Дата</th>
                  <th className="px-5 py-4 font-semibold">Пользователь</th>
                  <th className="px-5 py-4 font-semibold">Тип события</th>
                  <th className="px-5 py-4 font-semibold">Объект</th>
                  <th className="px-5 py-4 font-semibold">Страница</th>
                  <th className="px-5 py-4 font-semibold">Устройство</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestEvents.map((event) => (
                  <tr key={event.id} className="bg-white align-top">
                    <td className="px-5 py-4 text-slate-600">{formatDateTime(event.createdAt.toISOString())}</td>
                    <td className="px-5 py-4">
                      {event.user ? (
                        <>
                          <Link
                            href={`/admin/users/${event.user.id}`}
                            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                          >
                            {event.user.name}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{event.user.email}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-900">Гость</p>
                          <p className="mt-1 font-mono text-xs text-slate-400">{shortSessionId(event.sessionId)}</p>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {analyticsEventLabels[event.eventType as AnalyticsEventType] ?? event.eventType}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {analyticsEntityLabels[event.entityType as keyof typeof analyticsEntityLabels] ?? event.entityType}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{event.entityName ?? event.entityId ?? "—"}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{event.path}</td>
                    <td className="px-5 py-4 text-slate-600">{deviceLabel(event.deviceType)}</td>
                  </tr>
                ))}
                {latestEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      Событий пока нет.
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
