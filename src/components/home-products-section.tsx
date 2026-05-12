"use client";

import { useMemo } from "react";

import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

const HOME_NEW_ARRIVALS_LIMIT = 12;

export function HomeProductsSection() {
  const { hasHydrated, newArrivals } = useCatalogProducts();
  const visibleNewArrivals = useMemo(
    () => newArrivals.slice(0, HOME_NEW_ARRIVALS_LIMIT),
    [newArrivals],
  );

  return (
    <section className="container-shell mt-16">
      <div className="mb-6">
        <p className="section-kicker">Новинки</p>
        <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,7vw,2.25rem)] font-semibold tracking-[-0.06em] text-[#111111] sm:text-4xl">
          Новые модели сезона 2026
        </h2>
      </div>
      <ProductGrid
        variant="showcase"
        layout="carousel"
        products={visibleNewArrivals}
        empty={
          hasHydrated ? (
            <EmptyCatalogState compact />
          ) : (
            <div className="min-h-[20rem] rounded-[1.8rem] border border-[var(--line)] bg-white p-8 text-center text-sm text-[#5f615f]">
              Синхронизируем каталог...
            </div>
          )
        }
      />
    </section>
  );
}
