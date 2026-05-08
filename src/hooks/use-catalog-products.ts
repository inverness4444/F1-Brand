"use client";

import { useEffect, useMemo } from "react";

import type { Product } from "@/lib/types";
import { useCatalogStore } from "@/store/catalog-store";

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function getRecommendedProducts(products: Product[], product: Product) {
  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.driverName === product.driverName ||
          candidate.teamName === product.teamName ||
          candidate.legendName === product.legendName ||
          (Boolean(product.collection) && candidate.collection === product.collection) ||
          candidate.type === product.type),
    )
    .sort((left, right) => right.popularity - left.popularity)
    .slice(0, 8);
}

export function useCatalogProducts() {
  const products = useCatalogStore((state) => state.products);
  const collections = useCatalogStore((state) => state.collections);
  const hasHydrated = useCatalogStore((state) => state.hasHydrated);
  const initializeCatalog = useCatalogStore((state) => state.initializeCatalog);

  useEffect(() => {
    void initializeCatalog();
  }, [initializeCatalog]);

  return useMemo(() => {
    const sortedByDate = [...products].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    const sortedByPopularity = [...products].sort((left, right) => right.popularity - left.popularity);

    return {
      products,
      collections,
      hasHydrated,
      productMap: new Map(products.map((product) => [product.id, product] as const)),
      newArrivals: sortedByDate.filter(
        (product) => product.badge === "New" || product.collectionTags.includes("New Arrivals"),
      ),
      bestsellers: sortedByPopularity.slice(0, 16),
      teamwearProducts: products.filter((product) => product.category === "Teams"),
      driverCollectionProducts: products.filter((product) => product.category === "Pilots"),
      legendsProducts: products.filter((product) => product.category === "Legends"),
      essentialsProducts: products.filter((product) => product.category === "Accessories" || product.category === "Gifts"),
      saleProducts: products.filter((product) => product.badge === "Sale" || product.collectionTags.includes("Sale")),
      teamOptions: uniqueSorted(products.map((product) => product.teamName)),
      driverOptions: uniqueSorted(products.map((product) => product.driverName)),
      legendOptions: uniqueSorted(products.map((product) => product.legendName)),
    };
  }, [collections, hasHydrated, products]);
}
