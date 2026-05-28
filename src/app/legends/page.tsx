import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { buildCollectionDescription, createPageMetadata } from "@/lib/seo";

type LegendsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();
  const legendProducts = products.filter((product) => Boolean(product.legendSlug));

  return createPageMetadata({
    title: "Легенды",
    path: "/legends",
    description: buildCollectionDescription({
      title: "Коллекции легенд",
      products: legendProducts,
      fallback:
        "Коллекции легенд Apex Store: архивные капсулы и товары, связанные с наследием Formula 1.",
    }),
  });
}

export default async function LegendsPage({ searchParams }: LegendsPageProps) {
  return <ShopShell section="legends" initialParams={await searchParams} />;
}
