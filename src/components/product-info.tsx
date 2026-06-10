"use client";

import { RotateCcw, Ruler, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { productTypeLabels } from "@/lib/catalog-ui";
import type { Product, ProductColor, ProductSize } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import {
  colorLabelRu,
  getCollectionLabel,
  getProductDescription,
  getProductDisplayName,
  getProductShortDescription,
  sizeLabelRu,
} from "@/lib/storefront-text";
import { useCartStore } from "@/store/cart-store";
import { ProductBadgeTag } from "@/components/product-badge";
import { WishlistButton } from "@/components/wishlist-button";
import { trackAnalyticsEvent } from "@/services/analytics-service";

function sizeGuideRows(product: Product) {
  if (product.sizes.includes("One Size")) {
    return [["Один размер", "Универсальная посадка"]];
  }

  return [
    ["XS", "86–90 см"],
    ["S", "91–96 см"],
    ["M", "97–102 см"],
    ["L", "103–108 см"],
    ["XL", "109–114 см"],
    ["XXL", "115–120 см"],
  ];
}

export function ProductInfo({
  product,
  selectedColor,
  onSelectedColorChange,
}: {
  product: Product;
  selectedColor: ProductColor;
  onSelectedColorChange: (color: ProductColor) => void;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const colorways = product.colorways ?? [];
  const hasColorways = colorways.length > 0;
  const [selectedSize, setSelectedSize] = useState<ProductSize>(product.sizes[0]);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const guide = useMemo(() => sizeGuideRows(product), [product]);
  const isGiftCertificate = product.productType === "gift_certificate";
  const isOutOfStock = product.badge === "OutOfStock";
  const isPreorder = product.badge === "Preorder";
  const selectedVariant = product.variants?.find(
    (variant) => variant.size === selectedSize && variant.color === selectedColor,
  );
  const selectedStock = selectedVariant?.stock ?? (isOutOfStock ? 0 : 10);
  const selectedVariantIsOut = !isGiftCertificate && selectedStock <= 0;

  useEffect(() => {
    setSelectedSize(product.sizes[0]);
    setIsSizeGuideOpen(false);
  }, [product]);

  const addCurrentItem = () => {
    addItem({
      productId: product.id,
      color: selectedColor,
      size: selectedSize,
      quantity: 1,
    });
    trackAnalyticsEvent({
      eventType: "add_to_cart",
      entityType: "product",
      entityId: product.id,
      entityName: getProductDisplayName(product),
      metadata: {
        color: selectedColor,
        size: selectedSize,
        source: "product_page",
      },
    });
  };

  return (
    <aside className="min-w-0 h-fit lg:sticky lg:top-28">
      <p className="section-kicker">{getCollectionLabel(product.collection)}</p>
      <h1 className="mt-4 max-w-full break-words font-[var(--font-heading)] text-[clamp(2rem,9vw,3.4rem)] font-semibold leading-[0.96] tracking-normal text-[#111111] sm:max-w-[12ch]">
        {getProductDisplayName(product)}
      </h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <ProductBadgeTag badge={product.badge} className="px-3 py-1.5 text-[0.72rem]" />
        {isGiftCertificate ? (
          <div className="inline-flex rounded-full border border-[#f0dcc9] bg-[#fff6ef] px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#7b2220]">
            Digital Gift Card
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-[1.7rem] font-semibold tracking-normal text-[#111111] sm:text-[2.05rem]">{formatPrice(product.price)}</p>

      <p className="mt-5 max-w-full text-[0.95rem] leading-7 text-[#5f615f] sm:max-w-[44ch] sm:text-[0.98rem] sm:leading-8">
        {getProductShortDescription(product)}
      </p>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        {isGiftCertificate ? (
          <div className="rounded-[1.3rem] border border-[var(--line)] bg-white p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-[#111111]">Формат</p>
                <p className="mt-2 text-sm leading-7 text-[#5f615f]">Цифровой сертификат без размера и доставки.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111111]">Как использовать</p>
                <p className="mt-2 text-sm leading-7 text-[#5f615f]">
                  После покупки получите код, активируйте его в личном кабинете и оплачивайте любые товары балансом частями.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm font-semibold text-[#111111]">
                  Размер: <span className="font-normal text-[#5f615f]">{sizeLabelRu(selectedSize)}</span>
                </span>
                <button
                  type="button"
                  aria-expanded={isSizeGuideOpen}
                  onClick={() => setIsSizeGuideOpen((current) => !current)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#5f615f] underline underline-offset-4"
                >
                  <Ruler className="size-4" />
                  {isSizeGuideOpen ? "Скрыть таблицу" : "Таблица размеров"}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {product.sizes.map((size) => {
                  const active = selectedSize === size;
                  const variant = product.variants?.find(
                    (entry) => entry.size === size && entry.color === selectedColor,
                  );
                  const disabled = Boolean(variant && variant.stock <= 0);

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      disabled={disabled}
                      className={cn(
                        "rounded-[0.85rem] border px-3 py-3 text-sm font-semibold transition",
                        active ? "border-[#111111] bg-[#111111] text-white" : "border-[var(--line)] text-[#111111]",
                        disabled && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300",
                      )}
                    >
                      {sizeLabelRu(size)}
                    </button>
                  );
                })}
              </div>
              {isSizeGuideOpen ? (
                <div className="mt-4 rounded-[1.1rem] border border-[var(--line)] bg-[#faf9f7] p-4">
                  <p className="text-sm font-semibold text-[#111111]">Размер и обхват груди</p>
                  <div className="mt-3 grid gap-2 text-sm leading-7 text-[#5f615f]">
                    {guide.map(([size, value]) => (
                      <div
                        key={size}
                        className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-b-0 last:pb-0"
                      >
                        <span>{size}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {product.colors.length > 0 ? (
              <div className="mt-6">
                <span className="text-sm font-semibold text-[#111111]">
                  Цвета на товаре:{" "}
                  <span className="font-normal text-[#5f615f]">
                    {product.colors.map((color) => colorLabelRu[color]).join(", ")}
                  </span>
                </span>
              </div>
            ) : null}

            {hasColorways ? (
              <div className="mt-6">
                <span className="text-sm font-semibold text-[#111111]">
                  Расцветка: <span className="font-normal text-[#5f615f]">{colorLabelRu[selectedColor]}</span>
                </span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {colorways.map((color) => {
                    const active = selectedColor === color;
                    const variant = product.variants?.find(
                      (entry) => entry.size === selectedSize && entry.color === color,
                    );
                    const disabled = Boolean(variant && variant.stock <= 0);

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onSelectedColorChange(color)}
                        disabled={disabled}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          active ? "border-[#111111] bg-[#111111] text-white" : "border-[var(--line)] text-[#111111]",
                          disabled && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300",
                        )}
                      >
                        {colorLabelRu[color]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {typeof product.stock === "number" ? (
              <p className="mt-3 text-sm text-[#5f615f]">
                {selectedVariantIsOut ? "Нет в наличии" : `На складе: ${product.stock} шт.`}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={addCurrentItem}
            disabled={isOutOfStock || selectedVariantIsOut}
            className={cn(
              "flex h-14 flex-1 items-center justify-center rounded-full px-6 text-[0.95rem] font-semibold tracking-[0.01em] transition",
              isOutOfStock
                ? "cursor-not-allowed bg-[#d9d7d1] text-[#6d6d68]"
                : "bg-[#111111] text-white hover:bg-[#242424]",
            )}
          >
            {isOutOfStock || selectedVariantIsOut
              ? "Временно нет в наличии"
              : isGiftCertificate
                ? "Купить сертификат"
                : isPreorder
                  ? "Оформить предзаказ"
                  : "В корзину"}
          </button>
          <WishlistButton
            productId={product.id}
            className="h-14 w-14 rounded-full border-[var(--line)] bg-white"
            iconClassName="size-5"
          />
        </div>

        <div className="mt-8 space-y-4 border-t border-[var(--line)] pt-5 text-sm text-[#4f504d]">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 size-4.5 text-[#111111]" />
            <p>{isGiftCertificate ? "Доставка не требуется: сертификат приходит как цифровой код." : "Бесплатная доставка при заказе от 4000 ₽."}</p>
          </div>
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 size-4.5 text-[#111111]" />
            <p>{isGiftCertificate ? "Остаток баланса сохраняется и доступен для частичной оплаты следующих заказов." : "Простой возврат в течение 14 дней после получения."}</p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4.5 text-[#111111]" />
            <p>{isGiftCertificate ? "Код можно активировать только один раз и только на один аккаунт." : "Безопасная оплата и аккуратная упаковка заказа."}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-1 border-t border-[var(--line)] pt-2">
        <details className="border-b border-[var(--line)] py-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-[#111111]">Описание</summary>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">{getProductDescription(product)}</p>
        </details>
        <details className="border-b border-[var(--line)] py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#111111]">Детали товара</summary>
          <div className="mt-3 space-y-2 text-sm leading-7 text-[#5f615f]">
            <p>{productTypeLabels[product.type]}</p>
            <p>{getCollectionLabel(product.collection)}</p>
            <p>Чистая спортивная подача</p>
            <p>Коммерческая подача в стиле премиального спортивного ритейла</p>
          </div>
        </details>
        <details className="border-b border-[var(--line)] py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#111111]">Доставка и возврат</summary>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">
            Бесплатная доставка от 4000 ₽, безопасная оплата и простой возврат в течение 14 дней.
          </p>
        </details>
        <details className="border-b border-[var(--line)] py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#111111]">Уход</summary>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">
            Стирать при 30°C, не отбеливать и сушить на ровной поверхности, чтобы сохранить форму и внешний вид.
          </p>
        </details>
      </div>
    </aside>
  );
}
