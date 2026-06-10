"use client";

import Link from "next/link";
import { memo, type CSSProperties } from "react";

import { ProductImage } from "@/components/product-image";
import { ProductBadgeTag } from "@/components/product-badge";
import type { Product } from "@/lib/types";
import { imageByType } from "@/lib/data/products";
import { getImageDedupeKey } from "@/lib/image-utils";
import { formatPrice, getProductHref } from "@/lib/utils";
import { getProductCategoryBreadcrumb, getProductDisplayName } from "@/lib/storefront-text";
import { trackAnalyticsEvent } from "@/services/analytics-service";

const catalogImageSizes = "(min-width: 1280px) 30vw, (min-width: 640px) 48vw, 100vw";
const showcaseImageSizes = "(min-width: 1280px) 340px, (min-width: 640px) 320px, 84vw";
const productCardImageOverrides: Partial<Record<string, string>> = {
  "custom-1781052123600":
    "/catalog-assets/3daede55-32d6-433a-9844-2f3a2552ee30-872597056b1d0dbc-square.png",
  "custom-1781053487198":
    "/catalog-assets/205df1aa-7719-45be-b452-040970deab0c-f154019fe41b141e-square.png",
};

function ProductCardComponent({
  product,
  priority = false,
  variant = "catalog",
}: {
  product: Product;
  priority?: boolean;
  variant?: "catalog" | "showcase";
}) {
  const productHref = getProductHref(product);
  const fallbackImage = imageByType[product.type];
  const productCardImage = productCardImageOverrides[product.id] ?? product.image;
  const primaryImageKey = getImageDedupeKey(productCardImage);
  const hoverImage =
    (product.gallery ?? []).find((image) => image && getImageDedupeKey(image) !== primaryImageKey) ?? productCardImage;
  const hasAlternateImage = getImageDedupeKey(hoverImage) !== primaryImageKey;
  const isGiftCertificate = product.productType === "gift_certificate";
  const shouldShrinkProductImage = product.collection === "Teddy Bear x F1";
  const imageAlt = `${getProductDisplayName(product)} — ${getProductCategoryBreadcrumb(product).label}`;
  const imageBaseClassName =
    "absolute inset-0 h-full w-full transition duration-500 transform-gpu [will-change:transform]";
  const handleProductClick = () => {
    trackAnalyticsEvent({
      eventType: "product_click",
      entityType: "product",
      entityId: product.id,
      entityName: getProductDisplayName(product),
      metadata: {
        source: variant,
        category: product.category,
        collection: product.collection,
      },
    });
  };

  if (variant === "catalog") {
    const shouldRaiseCatalogImage = product.id === "custom-1778090477669";
    const imageFitClassName = shouldShrinkProductImage
      ? "object-contain object-center"
      : isGiftCertificate
      ? "object-contain object-center"
      : "object-cover object-center";
    const catalogImageStyle: CSSProperties | undefined = shouldRaiseCatalogImage
      ? { objectPosition: "center 82%" }
      : undefined;
    const imagePlacementClassName = shouldShrinkProductImage
      ? "scale-[0.92]"
      : isGiftCertificate
        ? "translate-y-10 scale-[1.05]"
        : "scale-[1.01]";
    const primaryHoverClassName = shouldShrinkProductImage
      ? hasAlternateImage
        ? "group-hover:scale-[0.95] group-hover:opacity-0"
        : "group-hover:scale-[0.95]"
      : hasAlternateImage
      ? isGiftCertificate
        ? "group-hover:translate-y-11 group-hover:scale-[1.08] group-hover:opacity-0"
        : "group-hover:scale-[1.03] group-hover:opacity-0"
      : isGiftCertificate
        ? "group-hover:translate-y-11 group-hover:scale-[1.08]"
        : "group-hover:scale-[1.03]";
    const secondaryHoverClassName = shouldShrinkProductImage
      ? "group-hover:scale-[0.95] group-hover:opacity-100"
      : isGiftCertificate
      ? "group-hover:translate-y-11 group-hover:scale-[1.08] group-hover:opacity-100"
      : "group-hover:scale-[1.03] group-hover:opacity-100";

    return (
      <article className="group flex h-full min-w-0 flex-col" data-product-card="catalog">
        <Link href={productHref} onClick={handleProductClick} className="flex h-full min-w-0 flex-col gap-2">
          <div
            className={`relative overflow-hidden rounded-[0.95rem] ${
              shouldShrinkProductImage ? "bg-[#f5f3f3]" : "bg-white"
            }`}
          >
            <div
              className={`relative aspect-square overflow-hidden rounded-[0.95rem] ${
                shouldShrinkProductImage ? "bg-[#f5f3f3]" : "bg-white"
              }`}
              data-product-card-image-frame
              style={{ aspectRatio: "1 / 1" }}
            >
              <ProductImage
                src={productCardImage}
                fallbackSrc={fallbackImage}
                alt={imageAlt}
                fill
                priority={priority}
                sizes={catalogImageSizes}
                style={catalogImageStyle}
                data-product-card-image
                className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} ${primaryHoverClassName}`}
              />
              {hasAlternateImage ? (
                <ProductImage
                  src={hoverImage}
                  fallbackSrc={fallbackImage}
                  alt=""
                  fill
                  sizes={catalogImageSizes}
                  style={catalogImageStyle}
                  data-product-card-image
                  className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} opacity-0 ${secondaryHoverClassName}`}
                />
              ) : null}
              <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                <ProductBadgeTag
                  badge={product.badge}
                  className="mobile-product-badge border-[#ebe6de] bg-white text-[#111111]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 px-0.5" data-product-card-copy>
            <p
              className="line-clamp-2 break-words text-[0.97rem] font-semibold leading-[1.4] text-[#111111]"
              data-product-card-title
            >
              {getProductDisplayName(product)}
            </p>
            {isGiftCertificate ? (
              <span aria-hidden="true" className="block h-[1.2rem]" />
            ) : product.shortDescription ? (
              <p className="line-clamp-1 text-[0.86rem] text-[#6a6a66]">{product.shortDescription}</p>
            ) : null}
            <p className="text-[0.96rem] font-medium text-[#111111]" data-product-card-price>
              {formatPrice(product.price)}
            </p>
          </div>
        </Link>
      </article>
    );
  }

  const shouldRaiseShowcaseImage = product.id === "custom-1778090477669";
  const imageFitClassName = shouldShrinkProductImage || isGiftCertificate
    ? "object-contain object-center"
    : "object-cover object-center";
  const showcaseImageStyle: CSSProperties | undefined = shouldRaiseShowcaseImage
    ? { objectPosition: "center 35%" }
    : undefined;
  const imagePlacementClassName = shouldShrinkProductImage
    ? "scale-[0.92]"
    : isGiftCertificate
      ? "scale-[0.92]"
      : "scale-[1.01]";
  const primaryHoverClassName = shouldShrinkProductImage
    ? hasAlternateImage
      ? "group-hover:scale-[0.95] group-hover:opacity-0"
      : "group-hover:scale-[0.95]"
    : hasAlternateImage
    ? isGiftCertificate
      ? "group-hover:scale-[0.95] group-hover:opacity-0"
      : "group-hover:scale-[1.04] group-hover:opacity-0"
    : isGiftCertificate
      ? "group-hover:scale-[0.95]"
      : "group-hover:scale-[1.04]";
  const secondaryHoverClassName = shouldShrinkProductImage
    ? "group-hover:scale-[0.95] group-hover:opacity-100"
    : isGiftCertificate
    ? "group-hover:scale-[0.95] group-hover:opacity-100"
    : "group-hover:scale-[1.04] group-hover:opacity-100";

  return (
    <article className="group flex h-full min-w-0 flex-col" data-product-card="showcase">
      <Link href={productHref} onClick={handleProductClick} className="flex h-full min-w-0 flex-col">
        <div
          className={`relative overflow-hidden rounded-[1.2rem] ${
            shouldShrinkProductImage ? "bg-[#f5f3f3]" : "bg-white"
          }`}
        >
          <div
            className={`relative aspect-square overflow-hidden rounded-[1.2rem] ${
              shouldShrinkProductImage ? "bg-[#f5f3f3]" : "bg-white"
            }`}
            data-product-card-image-frame
            style={{ aspectRatio: "1 / 1" }}
          >
            <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
              <ProductBadgeTag badge={product.badge} className="mobile-product-badge" />
              {isGiftCertificate ? (
                <span className="mobile-product-badge rounded-full border border-[#f0dcc9] bg-[#fff6ef] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#7b2220]">
                  Digital Gift Card
                </span>
              ) : null}
            </div>
            <ProductImage
              src={productCardImage}
              fallbackSrc={fallbackImage}
              alt={imageAlt}
              fill
              priority={priority}
              sizes={showcaseImageSizes}
              style={showcaseImageStyle}
              data-product-card-image
              className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} ${primaryHoverClassName}`}
            />
            {hasAlternateImage ? (
              <ProductImage
                src={hoverImage}
                fallbackSrc={fallbackImage}
                alt=""
                fill
                sizes={showcaseImageSizes}
                style={showcaseImageStyle}
                data-product-card-image
                className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} opacity-0 ${secondaryHoverClassName}`}
              />
            ) : null}
          </div>
        </div>

        <div className="relative z-10 mt-3 flex min-h-[6.2rem] flex-col bg-white pt-0" data-product-card-copy>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className="line-clamp-2 min-h-[2.85rem] break-words text-[0.95rem] font-semibold leading-[1.42] tracking-normal text-[#111111] sm:text-[1.02rem]"
                data-product-card-title
              >
                {getProductDisplayName(product)}
              </span>
              <p className="mt-1 text-[0.95rem] font-medium text-[#111111] sm:text-[1rem]" data-product-card-price>
                {formatPrice(product.price)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export const ProductCard = memo(ProductCardComponent);

ProductCard.displayName = "ProductCard";
