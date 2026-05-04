"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";

export function ProductGrid({
  products,
  empty,
  className,
  variant = "catalog",
  layout = "grid",
}: {
  products: Product[];
  empty?: ReactNode;
  className?: string;
  variant?: "catalog" | "showcase";
  layout?: "grid" | "carousel";
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const carouselStep = useCallback(() => {
    const node = railRef.current;

    if (!node) {
      return;
    }

    const firstCard = node.querySelector<HTMLElement>("[data-carousel-card]");
    return firstCard ? firstCard.offsetWidth + 16 : node.clientWidth * 0.88;
  }, []);

  const scrollCarousel = (direction: -1 | 1) => {
    const node = railRef.current;

    if (!node) {
      return;
    }

    const scrollAmount = carouselStep();

    if (!scrollAmount) {
      return;
    }
    const maxOffset = node.scrollWidth - node.clientWidth;

    if (direction === 1 && node.scrollLeft >= maxOffset - scrollAmount * 0.6) {
      node.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    if (direction === -1 && node.scrollLeft <= 4) {
      node.scrollTo({ left: maxOffset, behavior: "smooth" });
      return;
    }

    node.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (layout !== "carousel" || products.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const node = railRef.current;

      if (!node || document.visibilityState !== "visible") {
        return;
      }

      if (node.matches(":hover") || node.contains(document.activeElement)) {
        return;
      }

      const scrollAmount = carouselStep();

      if (!scrollAmount) {
        return;
      }

      const maxOffset = node.scrollWidth - node.clientWidth;
      const nextOffset = node.scrollLeft + scrollAmount;

      if (nextOffset >= maxOffset - 4) {
        node.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      node.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [carouselStep, layout, products.length]);

  const layoutClassName =
    variant === "showcase"
      ? "grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-8 [@media(min-width:390px)]:grid-cols-2 sm:gap-x-6 sm:gap-y-10 xl:grid-cols-4"
      : "grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-8 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3";

  if (products.length === 0) {
    return <>{empty}</>;
  }

  if (layout === "carousel") {
    const controlsEnabled = products.length > 1;

    return (
      <div className={cn("space-y-5", className)}>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            disabled={!controlsEnabled}
            aria-label="Предыдущие товары"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111] transition disabled:cursor-default disabled:opacity-35 enabled:hover:border-[#111111]"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            disabled={!controlsEnabled}
            aria-label="Следующие товары"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111] transition disabled:cursor-default disabled:opacity-35 enabled:hover:border-[#111111]"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div
              key={product.id}
              data-carousel-card
              className="w-[min(84vw,320px)] shrink-0 sm:w-[320px] xl:w-[340px]"
            >
              <ProductCard product={product} variant={variant} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(layoutClassName, className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </div>
  );
}
