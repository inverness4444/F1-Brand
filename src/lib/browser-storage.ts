import type { ZodType, ZodTypeDef } from "zod";

import { getItemSafe, isBrowser, removeItemSafe, setItemSafe } from "@/services/storage-service";

export const storageKeys = {
  users: "velocity-club-users-v1",
  currentUser: "velocity-club-current-user-v1",
  sessions: "velocity-club-sessions-v1",
  currentSessionId: "velocity-club-current-session-id-v1",
  addresses: "velocity-club-addresses-v1",
  favorites: "velocity-club-favorites-v1",
  orders: "velocity-club-orders-v1",
  giftCertificates: "velocity-club-gift-certificates-v1",
  userBalances: "velocity-club-user-balances-v1",
  balanceTransactions: "velocity-club-balance-transactions-v1",
  cart: "f1-brand-cart-v2-empty",
  checkoutOrder: "velocity-club-checkout-order-v1",
  authRateLimit: "velocity-club-auth-rate-limit-v1",
  analyticsSession: "velocity-club-analytics-session-v1",
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

export const STORAGE_EVENT_NAME = "velocity-club:data-changed";

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
