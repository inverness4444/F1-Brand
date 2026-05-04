"use client";

import { useAuthStore } from "@/store/auth-store";
import { AccountSidebar } from "@/components/account-sidebar";

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore((state) => state.currentUser);

  return (
    <section className="container-shell py-8 sm:py-10">
      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)] sm:px-8 sm:py-8">
        <div className="rounded-[24px] bg-slate-50 px-4 py-5 subtle-grid sm:px-6 sm:py-6">
          <p className="section-kicker">Личный кабинет</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-slate-900 sm:text-4xl">
            Аккаунт Apex Store
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Управляйте профилем, адресами доставки, избранным и заказами в одном месте.
            {currentUser ? ` Сейчас вы вошли как ${currentUser.name}.` : ""}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-w-0">
            <AccountSidebar />
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </section>
  );
}
