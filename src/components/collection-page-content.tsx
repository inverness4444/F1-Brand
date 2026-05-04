"use client";

import { useMemo } from "react";

import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";

type MatchField = "teamSlug" | "driverSlug" | "legendSlug";

export function CollectionPageContent({
  eyebrow,
  title,
  description,
  matchField,
  matchValue,
}: {
  eyebrow: string;
  title: string;
  description: string;
  matchField: MatchField;
  matchValue: string;
}) {
  const { hasHydrated, products } = useCatalogProducts();
  const collectionProducts = useMemo(
    () => products.filter((product) => product[matchField] === matchValue),
    [matchField, matchValue, products],
  );

  return (
    <div className="pb-14">
      <CollectionHero
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <section className="container-shell mt-10">
        <ProductGrid
          products={collectionProducts}
          empty={
            hasHydrated ? (
              <EmptyCatalogState title="В этой коллекции пока нет товаров" compact />
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
