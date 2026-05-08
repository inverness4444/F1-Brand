"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Link from "next/link";
import type { SyntheticEvent } from "react";

import type { Product } from "@/lib/types";
import { imageByType } from "@/lib/data/products";
import { formatPrice, getProductHref } from "@/lib/utils";
import { getProductDisplayName } from "@/lib/storefront-text";
import { ProductBadgeTag } from "@/components/product-badge";

export function ProductCard({
  product,
  variant = "catalog",
}: {
  product: Product;
  variant?: "catalog" | "showcase";
}) {
  const productHref = getProductHref(product);
  const fallbackImage = imageByType[product.type];
  const hoverImage = (product.gallery ?? []).find((image) => image && image !== product.image) ?? product.image;
  const hasAlternateImage = hoverImage !== product.image;
  const rating = Math.max(4, Math.min(5, Math.round(product.popularity / 16)));
  const isGiftCertificate = product.productType === "gift_certificate";
  const imageBaseClassName =
    "absolute inset-0 h-full w-full transition duration-500 transform-gpu [will-change:transform]";
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = fallbackImage;
  };

  if (variant === "catalog") {
    const shouldRaiseCatalogImage = product.id === "custom-1778090477669";
    const imageFitClassName = isGiftCertificate
      ? "object-contain object-center"
      : "object-cover object-center";
    const catalogImageStyle = shouldRaiseCatalogImage ? { objectPosition: "center 82%" } : undefined;
    const imagePlacementClassName = isGiftCertificate ? "translate-y-10 scale-[1.05]" : "scale-[1.01]";
    const primaryHoverClassName = hasAlternateImage
      ? isGiftCertificate
        ? "group-hover:translate-y-11 group-hover:scale-[1.08] group-hover:opacity-0"
        : "group-hover:scale-[1.03] group-hover:opacity-0"
      : isGiftCertificate
        ? "group-hover:translate-y-11 group-hover:scale-[1.08]"
        : "group-hover:scale-[1.03]";
    const secondaryHoverClassName = isGiftCertificate
      ? "group-hover:translate-y-11 group-hover:scale-[1.08] group-hover:opacity-100"
      : "group-hover:scale-[1.03] group-hover:opacity-100";

    return (
      <motion.article layout className="group flex h-full min-w-0 flex-col">
        <Link href={productHref} className="flex h-full min-w-0 flex-col gap-2">
          <div className="relative overflow-hidden rounded-[0.95rem] bg-white">
            <div className="relative aspect-square overflow-hidden rounded-[0.95rem] bg-white">
              <img
                src={product.image}
                alt={product.name}
                onError={handleImageError}
                style={catalogImageStyle}
                className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} ${primaryHoverClassName}`}
              />
              {hasAlternateImage ? (
                <img
                  src={hoverImage}
                  alt=""
                  onError={handleImageError}
                  style={catalogImageStyle}
                  className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} opacity-0 ${secondaryHoverClassName}`}
                />
              ) : null}
              <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                <ProductBadgeTag badge={product.badge} className="border-[#ebe6de] bg-white text-[#111111]" />
              </div>
            </div>
          </div>

          <div className="space-y-1 px-0.5">
            <p className="line-clamp-2 break-words text-[0.97rem] font-semibold leading-[1.4] text-[#111111]">
              {getProductDisplayName(product)}
            </p>
            {isGiftCertificate ? (
              <span aria-hidden="true" className="block h-[1.2rem]" />
            ) : product.shortDescription ? (
              <p className="line-clamp-1 text-[0.86rem] text-[#6a6a66]">{product.shortDescription}</p>
            ) : null}
            <p className="text-[0.96rem] font-medium text-[#111111]">{formatPrice(product.price)}</p>
          </div>
        </Link>
      </motion.article>
    );
  }

  const shouldRaiseShowcaseImage = product.id === "custom-1778090477669";
  const imageFitClassName = isGiftCertificate ? "object-cover object-bottom" : "object-cover object-center";
  const showcaseImageStyle = shouldRaiseShowcaseImage ? { objectPosition: "center 35%" } : undefined;
  const imagePlacementClassName = isGiftCertificate ? "translate-y-32 scale-[1.42]" : "scale-[1.01]";
  const primaryHoverClassName = hasAlternateImage
    ? isGiftCertificate
      ? "group-hover:translate-y-32 group-hover:scale-[1.45] group-hover:opacity-0"
      : "group-hover:scale-[1.04] group-hover:opacity-0"
    : isGiftCertificate
      ? "group-hover:translate-y-32 group-hover:scale-[1.45]"
      : "group-hover:scale-[1.04]";
  const secondaryHoverClassName = isGiftCertificate
    ? "group-hover:translate-y-32 group-hover:scale-[1.45] group-hover:opacity-100"
    : "group-hover:scale-[1.04] group-hover:opacity-100";

  return (
    <motion.article layout className="group flex h-full min-w-0 flex-col">
      <Link href={productHref} className="flex h-full min-w-0 flex-col">
        <div className="relative overflow-hidden rounded-[1.2rem] bg-white">
          <div className="relative aspect-square overflow-hidden bg-white">
            <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
              <ProductBadgeTag badge={product.badge} />
              {isGiftCertificate ? (
                <span className="rounded-full border border-[#f0dcc9] bg-[#fff6ef] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#7b2220]">
                  Digital Gift Card
                </span>
              ) : null}
            </div>
            <img
              src={product.image}
              alt={product.name}
              onError={handleImageError}
              style={showcaseImageStyle}
              className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} ${primaryHoverClassName}`}
            />
            {hasAlternateImage ? (
              <img
                src={hoverImage}
                alt=""
                onError={handleImageError}
                style={showcaseImageStyle}
                className={`${imageBaseClassName} ${imageFitClassName} ${imagePlacementClassName} opacity-0 ${secondaryHoverClassName}`}
              />
            ) : null}
          </div>
        </div>

        <div className="relative z-10 mt-3 flex min-h-[6.2rem] flex-col bg-white pt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="line-clamp-2 min-h-[2.85rem] break-words text-[0.95rem] font-semibold leading-[1.42] tracking-[-0.025em] text-[#111111] sm:text-[1.02rem]">
                {getProductDisplayName(product)}
              </span>
              <p className="mt-1 text-[0.95rem] font-medium text-[#111111] sm:text-[1rem]">{formatPrice(product.price)}</p>
            </div>
            <div className="mt-0.5 flex shrink-0 items-center gap-1 text-[0.84rem] font-medium text-[#111111] sm:text-[0.96rem]">
              <Star className="size-3.5 fill-current text-[#111111] sm:size-4" />
              <span>{rating}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
