import type { CartSelection, OrderItem } from "@/lib/account-types";
import { readStorage, removeStorage, storageKeys } from "@/lib/browser-storage";
import { getProductDisplayName } from "@/lib/storefront-text";
import { buildCsrfHeaders, SECURITY_LIMITS } from "@/lib/security-utils";
import { cartSelectionSchema, persistedCartStateSchema } from "@/lib/validation-schemas";
import type { Product } from "@/lib/types";

type PersistedCartSnapshot = {
  state?: {
    items?: CartSelection[];
  };
};

export const CART_STORAGE_KEY = storageKeys.cart;
export const MAX_CART_ITEM_QUANTITY = SECURITY_LIMITS.maxCartItemQuantity;

type ValidatedCartEntry = {
  selection: CartSelection;
  product: Product;
};

export function readPersistedCart() {
  const snapshot = readStorage<PersistedCartSnapshot | null>(
    CART_STORAGE_KEY,
    null,
    persistedCartStateSchema.nullable(),
  );
  return snapshot?.state?.items ?? [];
}

export function removePersistedCart() {
  removeStorage(CART_STORAGE_KEY);
}

export async function fetchServerCart() {
  const response = await fetch("/api/cart", {
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401) {
    return [];
  }

  const payload = (await response.json().catch(() => null)) as { items?: unknown; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить корзину.");
  }

  return cartSelectionSchema.array().parse(payload?.items ?? []);
}

export async function saveServerCart(items: CartSelection[]) {
  const response = await fetch("/api/cart", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось сохранить корзину.");
  }
}

export async function clearServerCart() {
  const response = await fetch("/api/cart", {
    method: "DELETE",
    headers: buildCsrfHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось очистить корзину.");
  }
}

export function validateCartSelections(
  selections: CartSelection[],
  productMap: Map<string, Product>,
) {
  return selections.reduce<{
    valid: ValidatedCartEntry[];
    invalid: Array<{ productId?: string; reason: string }>;
  }>(
    (result, selection) => {
      const parsedSelection = cartSelectionSchema.safeParse(selection);

      if (!parsedSelection.success) {
        result.invalid.push({
          productId: selection?.productId,
          reason: "Некорректный формат позиции корзины.",
        });
        return result;
      }

      const normalizedSelection = parsedSelection.data;
      const product = productMap.get(normalizedSelection.productId);

      if (!product) {
        result.invalid.push({
          productId: normalizedSelection.productId,
          reason: "Товар больше не доступен.",
        });
        return result;
      }

      const purchasableColors =
        product.colorways && product.colorways.length > 0
          ? product.colorways
          : product.variants?.map((variant) => variant.color) ?? product.colors;

      if (!purchasableColors.includes(normalizedSelection.color)) {
        result.invalid.push({
          productId: normalizedSelection.productId,
          reason: "Выбрана недоступная расцветка.",
        });
        return result;
      }

      if (!product.sizes.includes(normalizedSelection.size)) {
        result.invalid.push({
          productId: normalizedSelection.productId,
          reason: "Выбран недоступный размер.",
        });
        return result;
      }

      result.valid.push({
        selection: normalizedSelection,
        product,
      });
      return result;
    },
    {
      valid: [],
      invalid: [],
    },
  );
}

export function buildCartItems(
  selections: CartSelection[],
  productMap: Map<string, Product>,
) {
  return validateCartSelections(selections, productMap).valid;
}

export function calculateCartSummary(
  selections: CartSelection[],
  productMap: Map<string, Product>,
) {
  const items = buildCartItems(selections, productMap);
  const shippableItems = items.filter((entry) => entry.product.requiresShipping);
  const subtotal = items.reduce(
    (sum, entry) => sum + entry.product.price * entry.selection.quantity,
    0,
  );
  const shippableSubtotal = shippableItems.reduce(
    (sum, entry) => sum + entry.product.price * entry.selection.quantity,
    0,
  );
  const requiresShipping = shippableItems.length > 0;
  const shippingCost = !requiresShipping || shippableSubtotal >= 4000 || shippableSubtotal === 0 ? 0 : 390;
  const containsGiftCertificates = items.some((entry) => entry.product.productType === "gift_certificate");
  const onlyGiftCertificates = items.length > 0 && items.every((entry) => entry.product.productType === "gift_certificate");

  return {
    items,
    subtotal,
    shippableSubtotal,
    shippingCost,
    total: subtotal + shippingCost,
    requiresShipping,
    containsGiftCertificates,
    onlyGiftCertificates,
  };
}

export function toOrderItems(
  selections: CartSelection[],
  productMap: Map<string, Product>,
): OrderItem[] {
  return buildCartItems(selections, productMap).map(({ selection, product }) => ({
    productId: product.id,
    variantId:
      product.variants?.find((variant) => variant.color === selection.color && variant.size === selection.size)?.id ??
      null,
    slug: product.slug,
    name: getProductDisplayName(product),
    variantName: `${selection.size} / ${selection.color}`,
    sku:
      product.variants?.find((variant) => variant.color === selection.color && variant.size === selection.size)?.sku ??
      null,
    image: product.image,
    productType: product.type,
    productKind: product.productType,
    requiresShipping: product.requiresShipping,
    color: selection.color,
    size: selection.size,
    quantity: selection.quantity,
    unitPrice: product.price,
    lineTotal: product.price * selection.quantity,
  }));
}
