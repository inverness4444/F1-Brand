"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { useMounted } from "@/hooks/use-mounted";

const CAROUSEL_COPY_INDICES = [0, 1, 2] as const;
const CAROUSEL_SSR_PRODUCT_LIMIT = 12;
const CAROUSEL_AUTO_SCROLL_PX_PER_SECOND = 110;
const CAROUSEL_MANUAL_SCROLL_DURATION = 520;
const CAROUSEL_MAX_FRAME_DELTA = 80;
const CAROUSEL_INTERACTION_PAUSE_MS = 1400;

export function ProductGrid({
  products,
  empty,
  className,
  variant = "catalog",
  layout = "grid",
  priorityFirstImage,
}: {
  products: Product[];
  empty?: ReactNode;
  className?: string;
  variant?: "catalog" | "showcase";
  layout?: "grid" | "carousel";
  priorityFirstImage?: boolean;
}) {
  const hasMounted = useMounted();
  const railRef = useRef<HTMLDivElement>(null);
  const firstLoopRef = useRef<HTMLDivElement>(null);
  const pauseAutoplayUntilRef = useRef(0);

  const getLoopWidth = useCallback(() => firstLoopRef.current?.scrollWidth ?? 0, []);

  const pauseCarouselAutoplay = useCallback((duration = CAROUSEL_INTERACTION_PAUSE_MS) => {
    pauseAutoplayUntilRef.current = performance.now() + duration;
  }, []);

  const normalizeCarouselOffset = useCallback(
    (node: HTMLDivElement) => {
      const loopWidth = getLoopWidth();

      if (!loopWidth) {
        return;
      }

      while (node.scrollLeft >= loopWidth * 2) {
        node.scrollLeft -= loopWidth;
      }

      while (node.scrollLeft < loopWidth) {
        node.scrollLeft += loopWidth;
      }
    },
    [getLoopWidth],
  );

  const carouselStep = useCallback(() => {
    const node = railRef.current;

    if (!node) {
      return;
    }

    const firstCard = node.querySelector<HTMLElement>("[data-carousel-card]");
    const firstLoop = firstCard?.parentElement;
    const gap = firstLoop ? Number.parseFloat(window.getComputedStyle(firstLoop).columnGap) : 16;

    return firstCard ? firstCard.offsetWidth + (Number.isFinite(gap) ? gap : 16) : node.clientWidth * 0.88;
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

    pauseCarouselAutoplay(CAROUSEL_MANUAL_SCROLL_DURATION + CAROUSEL_INTERACTION_PAUSE_MS);
    normalizeCarouselOffset(node);
    node.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
    window.setTimeout(() => normalizeCarouselOffset(node), CAROUSEL_MANUAL_SCROLL_DURATION);
  };

  useEffect(() => {
    if (!hasMounted || layout !== "carousel" || products.length < 2) {
      return;
    }

    const node = railRef.current;

    if (!node) {
      return;
    }

    const setInitialOffset = () => {
      const loopWidth = getLoopWidth();

      if (!loopWidth) {
        return;
      }

      node.scrollLeft = loopWidth;
    };

    let frameId = 0;
    let previousTimestamp = 0;

    const step = (timestamp: number) => {
      const loopWidth = getLoopWidth();

      if (!loopWidth) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      if (!previousTimestamp) {
        previousTimestamp = timestamp;
        setInitialOffset();
      }

      const delta = Math.min(timestamp - previousTimestamp, CAROUSEL_MAX_FRAME_DELTA);
      previousTimestamp = timestamp;

      if (timestamp < pauseAutoplayUntilRef.current) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      node.scrollLeft += (CAROUSEL_AUTO_SCROLL_PX_PER_SECOND * delta) / 1000;
      normalizeCarouselOffset(node);

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [getLoopWidth, hasMounted, layout, normalizeCarouselOffset, products.length]);

  const layoutClassName =
    variant === "showcase"
      ? "grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-8 [@media(min-width:390px)]:grid-cols-2 sm:gap-x-6 sm:gap-y-10 xl:grid-cols-4"
      : "grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-8 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3";

  if (products.length === 0) {
    return <>{empty}</>;
  }

  const shouldPrioritizeFirstImage = priorityFirstImage ?? layout === "grid";

  if (layout === "carousel") {
    const renderedProducts = hasMounted ? products : products.slice(0, CAROUSEL_SSR_PRODUCT_LIMIT);
    const controlsEnabled = hasMounted && products.length > 1;
    const copyIndices = controlsEnabled ? CAROUSEL_COPY_INDICES : ([0] as const);

    return (
      <div className={cn("space-y-5", className)}>
        <div className="product-carousel-controls flex items-center justify-end gap-2">
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
          data-product-carousel-rail
          onScroll={(event) => normalizeCarouselOffset(event.currentTarget)}
          onPointerDown={() => pauseCarouselAutoplay()}
          onPointerUp={() => pauseCarouselAutoplay()}
          onPointerCancel={() => pauseCarouselAutoplay()}
          onWheel={() => pauseCarouselAutoplay()}
          className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max">
            {copyIndices.map((copyIndex) => (
              <div
                key={copyIndex}
                ref={copyIndex === 0 ? firstLoopRef : undefined}
                aria-hidden={copyIndex === 1 || !controlsEnabled ? undefined : true}
                inert={copyIndex === 1 || !controlsEnabled ? undefined : true}
                data-carousel-loop
                className="flex shrink-0 gap-4 pr-4"
              >
                {renderedProducts.map((product, index) => (
                  <div
                    key={`${copyIndex}-${product.id}`}
                    data-carousel-card
                    className="w-[min(84vw,320px)] shrink-0 sm:w-[320px] xl:w-[340px]"
                  >
                    <ProductCard
                      product={product}
                      priority={shouldPrioritizeFirstImage && copyIndex === 1 && index === 0}
                      variant={variant}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(layoutClassName, className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={shouldPrioritizeFirstImage && index === 0} variant={variant} />
      ))}
    </div>
  );
}
