"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { canAccessAdmin } from "@/lib/security-utils";
import { useAuthStore } from "@/store/auth-store";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hasAccess = currentUser ? (!requireAdmin || canAccessAdmin(currentUser)) : false;

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!currentUser) {
      const search = searchParams.toString();
      const redirectPath = `${pathname}${search ? `?${search}` : ""}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (!hasAccess) {
      router.replace("/account");
    }
  }, [currentUser, hasAccess, isHydrated, pathname, requireAdmin, router, searchParams]);

  if (!isHydrated || !currentUser) {
    return (
      <section className="container-shell py-14">
        <div className="card-panel flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 text-center">
          <Loader2 className="size-8 animate-spin text-red-600" />
          <div>
            <p className="text-lg font-semibold text-slate-900">Проверяем сессию</p>
            <p className="mt-2 text-sm text-slate-500">
              Подготавливаем доступ к личному кабинету.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasAccess) {
    return (
      <section className="container-shell py-14">
        <div className="card-panel flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-slate-900">Недостаточно прав</p>
            <p className="mt-2 text-sm text-slate-500">
              Эта страница доступна только администраторам.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
