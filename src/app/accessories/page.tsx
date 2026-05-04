"use client";

import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

export default function AccessoriesPage() {
  const { hasHydrated, products } = useCatalogProducts();
  const accessories = products.filter((product) => product.type === "Cap" || product.type === "Accessory");

  return (
    <div className="pb-14">
      <CollectionHero
        eyebrow="Аксессуары"
        title="Аксессуары для коллекции"
        description="Кепки, дорожные дополнения и утилитарные вещи, собранные в духе официального магазина спортивной одежды."
      />
      <section className="container-shell mt-10">
        <ProductGrid
          products={accessories}
          empty={
            hasHydrated ? (
              <EmptyCatalogState title="В разделе аксессуаров пока нет товаров" compact />
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
