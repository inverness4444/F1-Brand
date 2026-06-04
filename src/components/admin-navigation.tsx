"use client";

import { BarChart3, Mail, Package, MapPinned, ReceiptText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation } from "@/lib/admin-constants";
import { cn } from "@/lib/utils";

const iconMap = {
  "/admin/products": Package,
  "/admin/users": Users,
  "/admin/orders": ReceiptText,
  "/admin/addresses": MapPinned,
  "/admin/newsletter": Mail,
  "/admin/analytics": BarChart3,
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <section className="container-shell pt-8">
      <div className="surface-card rounded-[32px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-kicker">Админ-панель</p>
            <h1 className="mt-2 font-[var(--font-heading)] text-2xl font-bold text-slate-900 sm:text-3xl">
              Управление магазином
            </h1>
          </div>
          <nav className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            {adminNavigation.map((item) => {
              const Icon = iconMap[item.href];
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                    active
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
