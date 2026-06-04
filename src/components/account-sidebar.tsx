"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { accountNavigation } from "@/lib/account-constants";
import { canAccessAdmin } from "@/lib/security-utils";
import { notificationService } from "@/services/notification-service";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { AccountIcon } from "@/components/account-icon";

function isActive(pathname: string, href: string) {
  if (href === "/account") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.pushToast);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigationItems = canAccessAdmin(currentUser)
    ? [...accountNavigation, { href: "/admin", label: "Админка" }]
    : accountNavigation;

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    let ignore = false;
    void notificationService
      .list()
      .then((result) => {
        if (!ignore) {
          setUnreadCount(result.unreadCount);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUnreadCount(0);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    pushToast("Выход выполнен");
    router.push("/");
  };

  return (
    <>
      <nav className="w-full max-w-full min-w-0 lg:hidden">
        <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3">
          {navigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "account-mobile-nav-item group rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
                  active
                    ? "border-red-200 bg-red-50 !text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center gap-2 text-center",
                    active ? "text-red-700" : "group-hover:text-slate-900",
                  )}
                >
                  {item.label}
                  {item.href === "/account/notifications" && unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="account-mobile-nav-item rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Выйти
          </button>
        </div>
      </nav>

      <aside className="card-panel hidden h-fit p-4 lg:block lg:sticky lg:top-28">
        <div className="rounded-[22px] bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <AccountIcon name={currentUser?.name ?? undefined} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.name}</p>
              <p className="truncate text-xs text-slate-500">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-medium leading-5 transition",
                  active
                    ? "bg-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span
                    className={cn(
                      "truncate",
                      active ? "font-semibold text-white" : "text-slate-600 group-hover:text-slate-900",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.href === "/account/notifications" && unreadCount > 0 ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-5",
                        active ? "bg-white text-slate-900" : "bg-red-600 text-white",
                      )}
                    >
                      {unreadCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="size-4" />
          Выйти
        </button>
      </aside>
    </>
  );
}
