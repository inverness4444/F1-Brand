"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { colorSwatches } from "@/lib/catalog-ui";
import { imageByType } from "@/lib/data/products";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import type { Product } from "@/lib/types";
import { formatPrice, getProductHref } from "@/lib/utils";
import { colorLabelRu, getCollectionLabel, getProductDisplayName, sizeLabelRu } from "@/lib/storefront-text";
import { sanitizePromoCode } from "@/lib/security-utils";
import { promoCodeSchema } from "@/lib/validation-schemas";
import { trackAnalyticsEvent } from "@/services/analytics-service";
import { giftCertificateService } from "@/services/gift-certificate-service";
import { useCartStore } from "@/store/cart-store";
import { Button, buttonClassName } from "@/components/ui/button";

export function CartDrawer() {
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
    giftCertificate: boolean;
  } | null>(null);
  const { productMap } = useCatalogProducts();
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  useBodyScrollLock(isOpen);

  const enrichedItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = productMap.get(item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((entry): entry is (typeof items)[number] & { product: Product } => Boolean(entry)),
    [items, productMap],
  );

  const subtotal = useMemo(
    () => enrichedItems.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0),
    [enrichedItems],
  );
  const discount = appliedPromo.toUpperCase() === "GRID10" ? Math.round(subtotal * 0.1) : 0;
  const shippableSubtotal = useMemo(
    () => enrichedItems.reduce(
    (sum, entry) =>
      entry.product.requiresShipping ? sum + entry.product.price * entry.quantity : sum,
      0,
    ),
    [enrichedItems],
  );
  const shipping = shippableSubtotal >= 4000 || shippableSubtotal === 0 ? 0 : 390;
  const total = Math.max(0, subtotal - discount + shipping);
  const onlyGiftCertificates =
    enrichedItems.length > 0 && enrichedItems.every((entry) => entry.product.productType === "gift_certificate");

  const handleRemoveItem = (entry: (typeof enrichedItems)[number]) => {
    removeItem(entry.product.id, entry.color, entry.size);
    trackAnalyticsEvent({
      eventType: "remove_from_cart",
      entityType: "product",
      entityId: entry.product.id,
      entityName: getProductDisplayName(entry.product),
      metadata: {
        color: entry.color,
        size: entry.size,
        quantity: entry.quantity,
      },
    });
  };

  const handleCheckoutStart = () => {
    trackAnalyticsEvent({
      eventType: "checkout_start",
      entityType: "checkout",
      entityName: "Checkout",
      metadata: {
        source: "cart_drawer",
        itemCount: enrichedItems.reduce((sum, entry) => sum + entry.quantity, 0),
        total,
      },
    });
    closeCart();
  };

  const handleClearCart = () => {
    trackAnalyticsEvent({
      eventType: "remove_from_cart",
      entityType: "cart",
      entityName: "Очистка корзины",
      metadata: {
        source: "cart_drawer",
        itemCount: enrichedItems.reduce((sum, entry) => sum + entry.quantity, 0),
      },
    });
    clearCart();
  };

  const applyPromoCode = () => {
    const parsedPromo = promoCodeSchema.safeParse({ code: promoCode });

    if (!parsedPromo.success) {
      const fieldErrors = getZodFieldErrors<"code">(parsedPromo.error);
      setAppliedPromo("");
      setPromoMessage({
        tone: "error",
        text: fieldErrors.code ?? getErrorMessage(parsedPromo.error, "Некорректный промокод."),
        giftCertificate: false,
      });
      return;
    }

    const normalizedPromo = parsedPromo.data.code;
    const linkedCertificate = giftCertificateService.getByCode(normalizedPromo);

    if (linkedCertificate) {
      setAppliedPromo("");
      setPromoMessage({
        tone: "info",
        text: "Это подарочный сертификат. Активируйте его в личном кабинете, чтобы пополнить баланс.",
        giftCertificate: true,
      });
      return;
    }

    if (normalizedPromo.toUpperCase() === "GRID10") {
      if (onlyGiftCertificates) {
        setAppliedPromo("");
        setPromoMessage({
          tone: "error",
          text: "Промокод не применяется к подарочным сертификатам.",
          giftCertificate: false,
        });
        return;
      }

      setAppliedPromo(normalizedPromo);
      setPromoMessage({
        tone: "success",
        text: "Промокод GRID10 применён.",
        giftCertificate: false,
      });
      return;
    }

    setAppliedPromo("");
    setPromoMessage({
      tone: "error",
      text: "Промокод не найден.",
      giftCertificate: false,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
        <>
          <button
            type="button"
            onClick={closeCart}
            className="animate-overlay-in fixed inset-0 z-50 bg-black/30"
            aria-label="Закрыть корзину"
          />
          <aside
            className="animate-drawer-in fixed right-0 top-0 z-[60] flex h-[100dvh] w-full max-w-[min(calc(100vw-1rem),28rem)] flex-col overflow-hidden border-l border-[var(--line)] bg-[#fbfaf6] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4 sm:px-5">
              <div>
                <p className="section-kicker">Корзина</p>
                <h2 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                  Ваш заказ
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111]"
                aria-label="Закрыть корзину"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {enrichedItems.length > 0 ? (
                <div className="space-y-4">
                  {enrichedItems.map((entry) => (
                    <div
                      key={`${entry.product.id}-${entry.color}-${entry.size}`}
                      className="rounded-[1.4rem] border border-[var(--line)] bg-white p-4"
                    >
                      <div className="flex gap-3 sm:gap-4 max-[359px]:flex-col">
                        <div className="relative flex h-24 w-20 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--surface-soft)] p-1 sm:h-28 sm:w-24 sm:p-2">
                          <ProductImage
                            src={entry.product.colorwayImages?.[entry.color] ?? entry.product.image}
                            fallbackSrc={imageByType[entry.product.type]}
                            alt={entry.product.name}
                            width={96}
                            height={112}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={getProductHref(entry.product)}
                                onClick={closeCart}
                                className="line-clamp-2 text-sm font-semibold leading-6 text-[#111111]"
                              >
                                {getProductDisplayName(entry.product)}
                              </Link>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7b7a75]">
                                {getCollectionLabel(entry.product.collection)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(entry)}
                              className="text-[#7b7a75] transition hover:text-[#111111]"
                              aria-label="Удалить товар"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          {entry.product.productType === "gift_certificate" ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#7b2220]">
                              <span>Digital Gift Card</span>
                              <span>•</span>
                              <span>Без доставки</span>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-2 text-xs text-[#5f615f]">
                              {entry.product.colorways?.length ? (
                                <>
                                  <span
                                    className="size-3 rounded-full border border-[#d8d1c6]"
                                    style={{ backgroundColor: colorSwatches[entry.color] }}
                                  />
                                  <span>{colorLabelRu[entry.color]}</span>
                                  <span>•</span>
                                </>
                              ) : null}
                              <span>{sizeLabelRu(entry.size)}</span>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[#fbfaf6] px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(entry.product.id, entry.color, entry.size, entry.quantity - 1)
                                }
                              >
                                <Minus className="size-4" />
                              </button>
                              <span className="min-w-5 text-center text-sm">{entry.quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(entry.product.id, entry.color, entry.size, entry.quantity + 1)
                                }
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-[#111111]">
                              {formatPrice(entry.product.price * entry.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-[var(--line)] bg-white p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-soft)]">
                    <ShoppingBag className="size-6 text-[#111111]" />
                  </div>
                  <h3 className="mt-4 font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                    Корзина пуста
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-[#5f615f]">
                    Добавьте товары в корзину, чтобы перейти к оформлению заказа.
                  </p>
                  <Button className="mt-5" onClick={closeCart}>
                    Продолжить покупки
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(sanitizePromoCode(event.target.value))}
                  placeholder="Промокод"
                  maxLength={32}
                  className="input-base flex-1"
                />
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={applyPromoCode}
                  disabled={!promoCode.trim()}
                >
                  Применить
                </Button>
              </div>

              {promoMessage ? (
                <div
                  className={`mb-4 rounded-[1.1rem] border px-4 py-3 text-sm ${
                    promoMessage.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : promoMessage.tone === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p>{promoMessage.text}</p>
                  {promoMessage.giftCertificate ? (
                    <Link href="/account/gift-cards" onClick={closeCart} className="mt-2 inline-flex font-semibold underline underline-offset-4">
                      Перейти к активации сертификата
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 text-sm text-[#5f615f]">
                <div className="flex items-center justify-between">
                  <span>Подытог</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Скидка</span>
                  <span>{discount ? `− ${formatPrice(discount)}` : formatPrice(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Доставка</span>
                  <span>
                    {onlyGiftCertificates ? "Не требуется" : shipping === 0 ? "Бесплатно" : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-base font-semibold text-[#111111]">
                  <span>Итого</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={handleCheckoutStart}
                className={buttonClassName({ fullWidth: true, className: "mt-4" })}
              >
                Оформить заказ
              </Link>
              <Button fullWidth variant="secondary" className="mt-3" onClick={handleClearCart}>
                Очистить корзину
              </Button>
            </div>
          </aside>
        </>
  );
}
