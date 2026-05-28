import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { buildCollectionDescription, createPageMetadata } from "@/lib/seo";

type PilotsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();
  const pilotProducts = products.filter((product) => Boolean(product.driverSlug));

  return createPageMetadata({
    title: "Пилоты",
    path: "/pilots",
    description: buildCollectionDescription({
      title: "Коллекции пилотов",
      products: pilotProducts,
      fallback:
        "Коллекции пилотов Apex Store: товары, связанные с пилотами Formula 1, в эстетике спортивного магазина.",
    }),
  });
}

export default async function PilotsPage({ searchParams }: PilotsPageProps) {
  return <ShopShell section="pilots" initialParams={await searchParams} />;
}
