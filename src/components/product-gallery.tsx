"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ProductImage } from "@/components/product-image";
import type { Product } from "@/lib/types";
import { imageByType } from "@/lib/data/products";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const gallery = useMemo(() => {
    const images = product.gallery.length > 0 ? product.gallery : [product.image];
    return [...new Set(images.filter(Boolean))];
  }, [product.gallery, product.image]);
  const activeImage = gallery[activeIndex] ?? gallery[0];
  const viewedCount = Math.max(4, Math.round(product.popularity / 10));
  const isGiftCertificate = product.productType === "gift_certificate";
  const fallbackImage = imageByType[product.type];

  const setActiveImage = (nextIndex: number) => {
    if (gallery.length === 0) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(nextIndex, gallery.length - 1));
    setActiveIndex(boundedIndex);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];

    if (!activeThumb) {
      return;
    }

    activeThumb.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [activeIndex]);

  const thumbnailImageClassName = isGiftCertificate ? "object-contain" : "object-cover";
  const thumbnailImageStyle = {
    display: "block",
    height: "100%",
    width: "100%",
    objectFit: isGiftCertificate ? "contain" : "cover",
    objectPosition: "center",
  } as const;

  return (
    <div className="grid gap-4 lg:grid-cols-[104px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[112px_minmax(0,1fr)] xl:gap-5">
      <div className="order-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:hidden">
        {gallery.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              "shrink-0 overflow-hidden rounded-[0.9rem] border bg-white text-left transition focus-visible:outline-none",
              activeIndex === index
                ? "border-[#111111] shadow-[0_10px_24px_rgba(17,17,17,0.08)]"
                : "border-[var(--line)]",
            )}
          >
            <div className="relative h-24 w-[4.8rem] overflow-hidden rounded-[0.78rem] bg-transparent sm:h-28 sm:w-[5.6rem]">
              <ProductImage
                src={image}
                fallbackSrc={fallbackImage}
                alt={product.name}
                fill
                sizes="90px"
                style={thumbnailImageStyle}
                className={cn("h-full w-full", thumbnailImageClassName)}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="order-1 hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
        <button
          type="button"
          onClick={() => setActiveImage(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Предыдущее фото"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#111111] transition disabled:cursor-default disabled:opacity-30 hover:bg-[#f5f1eb] focus-visible:outline-none"
        >
          <ChevronUp className="size-5" />
        </button>

        <div className="flex max-h-[720px] w-full flex-col gap-3 overflow-y-auto px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              ref={(node) => {
                thumbRefs.current[index] = node;
              }}
              type="button"
              onClick={() => setActiveImage(index)}
              className={cn(
                "group w-full overflow-hidden rounded-[0.9rem] border bg-white text-left transition focus-visible:outline-none",
                activeIndex === index
                  ? "border-[#111111]"
                  : "border-[#e6e1da] hover:border-[#c9c0b4]",
              )}
            >
              <div className="relative h-[144px] w-full overflow-hidden rounded-[0.78rem] bg-transparent xl:h-[158px]">
                <ProductImage
                  src={image}
                  fallbackSrc={fallbackImage}
                  alt={product.name}
                  fill
                  sizes="112px"
                  style={thumbnailImageStyle}
                  className={cn("h-full w-full transition duration-300", thumbnailImageClassName)}
                />
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setActiveImage(activeIndex + 1)}
          disabled={activeIndex === gallery.length - 1}
          aria-label="Следующее фото"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#111111] transition disabled:cursor-default disabled:opacity-30 hover:bg-[#f5f1eb] focus-visible:outline-none"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>

      <div className="order-1">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-white">
          <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex max-w-[calc(100%-2rem)] rounded-full bg-white/96 px-4 py-2 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[#111111] shadow-[0_6px_18px_rgba(17,17,17,0.08)] backdrop-blur-sm sm:left-5 sm:top-5 sm:px-5 sm:text-[0.72rem]">
            Popular {viewedCount} viewed in last 12 hrs
          </div>

          <div
            className="relative flex min-h-[320px] items-center justify-center sm:min-h-[560px] xl:min-h-[660px]"
            style={{ minHeight: 320 }}
          >
            <ProductImage
              src={activeImage}
              fallbackSrc={fallbackImage}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1280px) calc(100vw - 620px), 100vw"
              className="max-h-[72vh] w-full object-contain sm:max-h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
