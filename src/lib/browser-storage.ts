import type { ZodType, ZodTypeDef } from "zod";

import { getItemSafe, isBrowser, removeItemSafe, setItemSafe } from "@/services/storage-service";

export const storageKeys = {
  users: "apex-store-users-v1",
  currentUser: "apex-store-current-user-v1",
  sessions: "apex-store-sessions-v1",
  currentSessionId: "apex-store-current-session-id-v1",
  addresses: "apex-store-addresses-v1",
  favorites: "apex-store-favorites-v1",
  orders: "apex-store-orders-v1",
  giftCertificates: "apex-store-gift-certificates-v1",
  userBalances: "apex-store-user-balances-v1",
  balanceTransactions: "apex-store-balance-transactions-v1",
  cart: "f1-brand-cart-v2-empty",
  checkoutOrder: "apex-store-checkout-order-v1",
  authRateLimit: "apex-store-auth-rate-limit-v1",
} as const;

export type StorageEntity =
  | "auth"
  | "users"
  | "addresses"
  | "favorites"
  | "orders"
  | "giftCertificates"
  | "balances"
  | "cart"
  | "checkout";

export const STORAGE_EVENT_NAME = "apex-store:data-changed";

export function readStorage<T>(key: string, fallback: T, schema?: ZodType<T, ZodTypeDef, unknown>): T {
  return getItemSafe(key, fallback, schema);
}

export function writeStorage<T>(key: string, value: T, schema?: ZodType<T, ZodTypeDef, unknown>) {
  setItemSafe(key, value, schema);
}

export function removeStorage(key: string) {
  removeItemSafe(key);
}

export function emitStorageChange(entity: StorageEntity) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: { entity } }));
}
