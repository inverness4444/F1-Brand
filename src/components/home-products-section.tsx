"use client";

import { useEffect, useState } from "react";

import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { ProductGrid } from "@/components/product-grid";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import type { Product } from "@/lib/types";

function shuffleProducts(products: Product[]) {
  const shuffledProducts = [...products];

  for (let index = shuffledProducts.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledProducts[index], shuffledProducts[randomIndex]] = [shuffledProducts[randomIndex], shuffledProducts[index]];
  }

  return shuffledProducts;
}

export function HomeProductsSection() {
  const { hasHydrated, products } = useCatalogProducts();
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
  const showcaseProducts = shuffledProducts.length > 0 ? shuffledProducts : products;

  useEffect(() => {
    setShuffledProducts(shuffleProducts(products));
  }, [products]);

  return (
    <section className="container-shell mt-16">
      <div className="mb-6">
        <p className="section-kicker">Вся коллекция</p>
        <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,7vw,2.25rem)] font-semibold tracking-[-0.06em] text-[#111111] sm:text-4xl">
          Все товары сезона 2026
        </h2>
      </div>
      <ProductGrid
        variant="showcase"
        layout="carousel"
        products={showcaseProducts}
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
