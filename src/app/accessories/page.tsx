import type { Metadata } from "next";

import { ShopShell } from "@/components/shop-shell";
import { StructuredData } from "@/components/structured-data";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import {
  breadcrumbJsonLd,
  buildCollectionDescription,
  createPageMetadata,
  hasNonCanonicalSearchParams,
  webPageJsonLd,
} from "@/lib/seo";

type AccessoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export async function generateMetadata({ searchParams }: AccessoriesPageProps): Promise<Metadata> {
  const [products, params] = await Promise.all([readCatalogProductsFromDb(), searchParams]);
  const accessoryProducts = products.filter(
    (product) => product.category === "Accessories" || product.category === "Gifts",
  );
  const description = buildCollectionDescription({
    title: "Аксессуары и подарки",
    products: accessoryProducts,
    fallback:
      "Аксессуары Velocity Club в стиле автоспорта: кепки, шарфы, постеры, календари, брелки, кошельки, картхолдеры и подарочные сертификаты.",
  });

  return createPageMetadata({
    title: "Аксессуары для фанатов гонок",
    path: "/accessories",
    description,
    index: accessoryProducts.length > 0 && !hasNonCanonicalSearchParams(params),
  });
}

export default async function AccessoriesPage({ searchParams }: AccessoriesPageProps) {
  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Аксессуары", path: "/accessories" },
          ]),
          webPageJsonLd({
            name: "Аксессуары для фанатов гонок",
            description:
              "Кепки, шарфы, постеры, брелки и подарочные сертификаты в стиле автоспорта.",
            path: "/accessories",
          }),
        ]}
      />
      <ShopShell section="accessories" initialParams={await searchParams} />
    </>
  );
}
