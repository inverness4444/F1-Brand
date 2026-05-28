import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { buildCollectionDescription, createPageMetadata } from "@/lib/seo";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();

  return createPageMetadata({
    title: "Каталог",
    path: "/shop",
    description: buildCollectionDescription({
      title: "Каталог Apex Store",
      products,
      fallback:
        "Каталог Apex Store: одежда в эстетике Formula 1, коллекции пилотов, легенд, подарочные сертификаты и спортивные модели сезона 2026.",
    }),
  });
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  return <ShopShell initialParams={await searchParams} />;
}
