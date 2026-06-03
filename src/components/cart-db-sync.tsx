"use client";

import { useEffect, useRef } from "react";

import type { CartSelection } from "@/lib/account-types";
import {
  fetchServerCart,
  MAX_CART_ITEM_QUANTITY,
  readPersistedCart,
  removePersistedCart,
  saveServerCart,
} from "@/services/cart-service";
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
  const setHasHydrated = useCartStore((state) => state.setHasHydrated);
  const syncedScopeRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (!isAuthHydrated) {
      return;
    }

    const scope = currentUser?.id ?? "guest";

    if (syncedScopeRef.current === scope) {
      return;
    }

    syncedScopeRef.current = scope;
    skipNextSaveRef.current = true;
    setHasHydrated(false);
    setItems([]);

    let ignore = false;
    void fetchServerCart()
      .then((serverItems) => {
        if (ignore) {
          return;
        }

        const legacyItems = readPersistedCart();
        const clientItems = useCartStore.getState().items;
        const mergedWithClient = clientItems.length > 0 ? mergeCartItems(clientItems, serverItems) : serverItems;
        const merged = legacyItems.length > 0 ? mergeCartItems(legacyItems, mergedWithClient) : mergedWithClient;

        skipNextSaveRef.current = true;
        setItems(merged);
        setHasHydrated(true);
        removePersistedCart();

        if (legacyItems.length > 0 || clientItems.length > 0) {
          void saveServerCart(merged).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!ignore) {
          setHasHydrated(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUser, isAuthHydrated, setHasHydrated, setItems]);

  useEffect(() => {
    if (!isAuthHydrated || !hasCartHydrated) {
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
