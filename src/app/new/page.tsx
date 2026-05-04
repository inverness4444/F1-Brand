"use client";

import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

export default function NewPage() {
  const { hasHydrated, newArrivals } = useCatalogProducts();
  const newProducts = newArrivals;

  return (
    <div className="pb-14">
      <CollectionHero
        eyebrow="Новинки"
        title="Новая одежда сезона 2026"
        description="Свежие командные дропы, коллекции пилотов и базовые модели в подаче современного спортивного магазина."
      />
      <section className="container-shell mt-10">
        <ProductGrid
          products={newProducts}
          empty={
            hasHydrated ? (
              <EmptyCatalogState title="В разделе новинок пока нет товаров" compact />
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
