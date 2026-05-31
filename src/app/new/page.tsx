"use client";

import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { StructuredData } from "@/components/structured-data";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";

export default function NewPage() {
  const { hasHydrated, newArrivals } = useCatalogProducts();
  const newProducts = newArrivals;

  return (
    <div className="pb-14">
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Новинки", path: "/new" },
          ]),
          webPageJsonLd({
            name: "Новинки гоночного streetwear 2026",
            description:
              "Свежие дропы одежды и аксессуаров в стиле автоспорта: футболки, худи и streetwear для фанатов гонок.",
            path: "/new",
          }),
        ]}
      />
      <CollectionHero
        eyebrow="Новинки"
        title="Новая одежда в гоночном стиле"
        description="Свежие дропы, коллекции пилотов и базовые модели в подаче современного спортивного магазина."
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
