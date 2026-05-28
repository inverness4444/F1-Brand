import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { buildCollectionDescription, createPageMetadata } from "@/lib/seo";

type AccessoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();
  const accessoryProducts = products.filter(
    (product) => product.category === "Accessories" || product.category === "Gifts",
  );

  return createPageMetadata({
    title: "Аксессуары",
    path: "/accessories",
    description: buildCollectionDescription({
      title: "Аксессуары и подарки",
      products: accessoryProducts,
      fallback:
        "Аксессуары Apex Store: кепки, шарфы, постеры, календари, брелки, кошельки, картхолдеры и подарочные сертификаты, если они доступны в каталоге.",
    }),
  });
}

export default async function AccessoriesPage({ searchParams }: AccessoriesPageProps) {
  return <ShopShell section="accessories" initialParams={await searchParams} />;
}
