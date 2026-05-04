"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatDate } from "@/lib/account-utils";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";

export default function AccountSettingsPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentSession = useAuthStore((state) => state.currentSession);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.pushToast);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Настройки</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Управление сессией и базовой безопасностью аккаунта в mock-инфраструктуре магазина.
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <div className="card-panel min-w-0 p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Аккаунт</h3>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Email</span>
              <span className="break-words text-right font-medium text-slate-900">{currentUser.email}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Телефон</span>
              <span className="break-words text-right font-medium text-slate-900">{currentUser.phone}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Дата регистрации</span>
              <span className="text-right font-medium text-slate-900">{formatDate(currentUser.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="card-panel min-w-0 p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">Сессия</h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Текущая сессия хранится локально. Позже этот слой можно заменить на backend, Supabase или Prisma/PostgreSQL.
          </p>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Запомнить меня</span>
              <span className="text-right font-medium text-slate-900">{currentSession?.rememberMe ? "Да" : "Нет"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Сессия создана</span>
              <span className="font-medium text-slate-900">
                {currentSession ? formatDate(currentSession.createdAt) : "—"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/forgot-password" className="button-base button-secondary w-full rounded-2xl sm:w-auto">
              Сменить пароль
            </Link>
            <Button
              className="w-full rounded-2xl sm:w-auto"
              onClick={async () => {
                await logout();
                pushToast("Выход выполнен");
                router.push("/");
              }}
            >
              Выйти
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
