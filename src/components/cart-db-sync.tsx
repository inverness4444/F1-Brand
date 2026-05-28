"use client";

import { useEffect, useRef } from "react";

import type { CartSelection } from "@/lib/account-types";
import { fetchServerCart, MAX_CART_ITEM_QUANTITY, saveServerCart } from "@/services/cart-service";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

function cartKey(item: CartSelection) {
  return `${item.productId}:${item.color}:${item.size}`;
}

function mergeCartItems(localItems: CartSelection[], serverItems: CartSelection[]) {
  const merged = new Map<string, CartSelection>();

  for (const item of [...serverItems, ...localItems]) {
    const key = cartKey(item);
    const existing = merged.get(key);
    merged.set(key, {
      ...item,
      quantity: Math.min((existing?.quantity ?? 0) + item.quantity, MAX_CART_ITEM_QUANTITY),
    });
  }

  return [...merged.values()];
}

export function CartDbSync() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthHydrated = useAuthStore((state) => state.isHydrated);
  const items = useCartStore((state) => state.items);
  const hasCartHydrated = useCartStore((state) => state.hasHydrated);
  const setItems = useCartStore((state) => state.setItems);
  const syncedUserRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (!isAuthHydrated || !hasCartHydrated || !currentUser) {
      syncedUserRef.current = null;
      return;
    }

    if (syncedUserRef.current === currentUser.id) {
      return;
    }

    syncedUserRef.current = currentUser.id;
    void fetchServerCart()
      .then((serverItems) => {
        const merged = mergeCartItems(items, serverItems);
        skipNextSaveRef.current = true;
        setItems(merged);
        return saveServerCart(merged);
      })
      .catch(() => undefined);
  }, [currentUser, hasCartHydrated, isAuthHydrated, items, setItems]);

  useEffect(() => {
    if (!isAuthHydrated || !hasCartHydrated || !currentUser) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void saveServerCart(items).catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [currentUser, hasCartHydrated, isAuthHydrated, items]);

  return null;
}
