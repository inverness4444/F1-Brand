"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { safeRedirectPath } from "@/lib/security-utils";
import { cn } from "@/lib/utils";
import { favoriteService } from "@/services/favorite-service";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";

export function WishlistButton({
  productId,
  className,
  iconClassName,
}: {
  productId: string;
  className?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const pushToast = useToastStore((state) => state.pushToast);
  const [isFavorite, setIsFavorite] = useState(false);

  const redirectPath = useMemo(() => {
    const search = searchParams.toString();
    return safeRedirectPath(`${pathname}${search ? `?${search}` : ""}`);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!currentUser) {
      setIsFavorite(false);
      return;
    }

    let ignore = false;
    void favoriteService.isFavorite(currentUser.id, productId).then((active) => {
      if (!ignore) {
        setIsFavorite(active);
      }
    });

    return () => {
      ignore = true;
    };
  }, [currentUser, productId]);

  const handleClick = async () => {
    if (!isHydrated) {
      return;
    }

    if (!currentUser) {
      pushToast("Войдите, чтобы сохранить товар в избранном", "info");
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    try {
      const result = await favoriteService.toggle(currentUser.id, productId);
      setIsFavorite(result.active);
      pushToast(result.active ? "Товар добавлен в избранное" : "Товар удалён из избранного");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Не удалось обновить избранное", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-[#111111] transition hover:border-[#111111]",
        isFavorite && "border-[#111111] bg-[#111111] text-white",
        className,
      )}
    >
      <Heart className={cn("size-4.5", isFavorite && "fill-current", iconClassName)} />
    </button>
  );
}
