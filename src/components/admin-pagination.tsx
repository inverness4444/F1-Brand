import Link from "next/link";

import { cn } from "@/lib/utils";

type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

function pageHref(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function AdminPagination({ page, pageSize, total, basePath, searchParams }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const items = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => {
    return item === 1 || item === totalPages || Math.abs(item - page) <= 1;
  });

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Страница {page} из {totalPages}. Всего записей: {total}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={pageHref(basePath, searchParams, Math.max(1, page - 1))}
          className={cn(
            "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
            page <= 1
              ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
          )}
        >
          Назад
        </Link>
        {items.map((item, index) => {
          const previous = items[index - 1];
          const showGap = previous && item - previous > 1;

          return (
            <span key={item} className="flex items-center gap-2">
              {showGap ? <span className="px-1 text-sm text-slate-400">...</span> : null}
              <Link
                href={pageHref(basePath, searchParams, item)}
                className={cn(
                  "inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition",
                  item === page
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                {item}
              </Link>
            </span>
          );
        })}
        <Link
          href={pageHref(basePath, searchParams, Math.min(totalPages, page + 1))}
          className={cn(
            "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
            page >= totalPages
              ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
          )}
        >
          Вперёд
        </Link>
      </div>
    </div>
  );
}
