"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CartSelection } from "@/lib/account-types";
import { createSafeStateStorage } from "@/services/storage-service";
import { CART_STORAGE_KEY } from "@/services/cart-service";
import { MAX_CART_ITEM_QUANTITY } from "@/services/cart-service";
import { cartSelectionSchema, persistedCartStateSchema } from "@/lib/validation-schemas";

type CartState = {
  items: CartSelection[];
  isOpen: boolean;
  hasHydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: CartSelection) => void;
  removeItem: (productId: string, color: CartSelection["color"], size: CartSelection["size"]) => void;
  updateQuantity: (
    productId: string,
    color: CartSelection["color"],
    size: CartSelection["size"],
    quantity: number,
  ) => void;
  clearCart: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      hasHydrated: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      addItem: (item) =>
        set((state) => {
          const normalizedItem = cartSelectionSchema.safeParse({
            ...item,
            quantity: Math.max(1, Math.min(Math.trunc(item.quantity), MAX_CART_ITEM_QUANTITY)),
          });

          if (!normalizedItem.success) {
            return state;
          }

          const existing = state.items.find(
            (entry) =>
              entry.productId === normalizedItem.data.productId &&
              entry.color === normalizedItem.data.color &&
              entry.size === normalizedItem.data.size,
          );

          if (existing) {
            return {
              items: state.items.map((entry) =>
                entry === existing
                  ? {
                      ...entry,
                      quantity: Math.min(entry.quantity + normalizedItem.data.quantity, MAX_CART_ITEM_QUANTITY),
                    }
                  : entry,
              ),
              isOpen: true,
            };
          }

          return {
            items: [...state.items, normalizedItem.data],
            isOpen: true,
          };
        }),
      removeItem: (productId, color, size) =>
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.color === color && item.size === size),
          ),
        })),
      updateQuantity: (productId, color, size, quantity) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.productId === productId && item.color === color && item.size === size
                ? { ...item, quantity: Math.max(1, Math.min(Math.trunc(quantity), MAX_CART_ITEM_QUANTITY)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => createSafeStateStorage(persistedCartStateSchema)),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
