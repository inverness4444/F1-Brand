"use client";

import { HeroBanner } from "@/components/hero-banner";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

export default function HomePage() {
  const { hasHydrated, newArrivals } = useCatalogProducts();

  return (
    <div className="pb-14">
      <HeroBanner />

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
          products={newArrivals}
          empty={
            hasHydrated ? (
              <EmptyCatalogState compact />
            ) : (
              <div className="rounded-[1.8rem] border border-[var(--line)] bg-white p-8 text-center text-sm text-[#5f615f]">
                Синхронизируем каталог...
              </div>
            )
          }
        />
      </section>

      <NewsletterSection />
    </div>
  );
}
