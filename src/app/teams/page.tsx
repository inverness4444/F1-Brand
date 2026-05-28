import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { buildCollectionDescription, createPageMetadata } from "@/lib/seo";

type TeamsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();
  const teamProducts = products.filter((product) => Boolean(product.teamSlug));

  return createPageMetadata({
    title: "Команды",
    path: "/teams",
    description: buildCollectionDescription({
      title: "Командные коллекции",
      products: teamProducts,
      fallback:
        "Командные коллекции Apex Store: товары, связанные с командами Formula 1, в чистой спортивной подаче.",
    }),
  });
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  return <ShopShell section="teams" initialParams={await searchParams} />;
}
