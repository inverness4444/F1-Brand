"use client";

import { ChevronDown, Heart, LogOut, MapPinned, Package2, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { AccountIcon } from "@/components/account-icon";

const menuItems = [
  { href: "/account", label: "Личный кабинет", icon: UserRound },
  { href: "/account/orders", label: "Мои заказы", icon: Package2 },
  { href: "/account/favorites", label: "Избранное", icon: Heart },
  { href: "/account/addresses", label: "Адреса доставки", icon: MapPinned },
  { href: "/account/settings", label: "Настройки", icon: Settings },
] as const;

export function UserDropdown() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const logout = useAuthStore((state) => state.logout);
  const pushToast = useToastStore((state) => state.pushToast);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isHydrated || !currentUser) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        <AccountIcon className="h-9 w-9" />
        <span className="hidden xl:inline">Войти</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    pushToast("Выход выполнен");
    router.push("/");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-2.5 pr-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        <AccountIcon name={currentUser.name} className="h-9 w-9" />
        <span className="hidden max-w-28 truncate xl:inline">{currentUser.name}</span>
        <ChevronDown className="size-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
          <div className="rounded-[18px] bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
            <p className="mt-1 text-xs text-slate-500">{currentUser.email}</p>
          </div>
          <div className="mt-2 space-y-1">
            {menuItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <Icon className="size-4.5 text-slate-500" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="size-4.5 text-slate-500" />
              Выйти
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
