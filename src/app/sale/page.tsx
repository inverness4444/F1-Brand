"use client";

import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

export default function SalePage() {
  const { hasHydrated, saleProducts } = useCatalogProducts();

  return (
    <div className="pb-14">
      <CollectionHero
        eyebrow="Распродажа"
        title="Отобранные позиции со скидкой"
        description="Избранные модели командной одежды и аксессуаров по сниженной цене без потери аккуратной подачи."
      />
      <section className="container-shell mt-10">
        <ProductGrid
          products={saleProducts}
          empty={
            hasHydrated ? (
              <EmptyCatalogState title="В разделе распродажи пока нет товаров" compact />
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
