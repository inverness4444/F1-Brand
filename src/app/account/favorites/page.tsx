"use client";

import { useEffect, useMemo, useState } from "react";

import { favoriteService } from "@/services/favorite-service";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useToastStore } from "@/store/toast-store";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import type { Product } from "@/lib/types";
import { FavoritesGrid } from "@/components/favorites-grid";

export default function AccountFavoritesPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const pushToast = useToastStore((state) => state.pushToast);
  const addItem = useCartStore((state) => state.addItem);
  const { productMap } = useCatalogProducts();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setFavoriteIds([]);
      return;
    }

    setFavoriteIds(favoriteService.getProductIds(currentUser.id));
  }, [currentUser]);

  const favoriteProducts = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return favoriteIds
      .map((productId) => productMap.get(productId) ?? null)
      .filter((product): product is Product => Boolean(product));
  }, [currentUser, favoriteIds, productMap]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Избранное</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Товары, которые вы отметили сердечком, собраны здесь для быстрого возврата к покупке.
        </p>
      </div>

      <FavoritesGrid
        products={favoriteProducts}
        onAddToCart={(product) => {
          addItem({
            productId: product.id,
            color: product.colors[0],
            size: product.sizes[0],
            quantity: 1,
          });
        }}
        onRemove={(productId) => {
          favoriteService.remove(currentUser.id, productId);
          setFavoriteIds((current) => current.filter((id) => id !== productId));
          pushToast("Товар удалён из избранного");
        }}
      />
    </div>
  );
}
