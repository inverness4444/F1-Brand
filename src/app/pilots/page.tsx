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

type PilotsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export async function generateMetadata({ searchParams }: PilotsPageProps): Promise<Metadata> {
  const [products, params] = await Promise.all([readCatalogProductsFromDb(), searchParams]);
  const pilotProducts = products.filter((product) => Boolean(product.driverSlug));
  const description = buildCollectionDescription({
    title: "Коллекции пилотов",
    products: pilotProducts,
    fallback:
      "Коллекции пилотов Velocity Club: racing-inspired одежда, футболки, худи и streetwear для фанатов автоспорта.",
  });

  return createPageMetadata({
    title: "Коллекции пилотов и racing-inspired мерч",
    path: "/pilots",
    description,
    index: pilotProducts.length > 0 && !hasNonCanonicalSearchParams(params),
  });
}

export default async function PilotsPage({ searchParams }: PilotsPageProps) {
  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Пилоты", path: "/pilots" },
          ]),
          webPageJsonLd({
            name: "Коллекции пилотов и racing-inspired мерч",
            description:
              "Одежда в стиле автоспорта: футболки, худи и streetwear с пилотской эстетикой для фанатов гонок.",
            path: "/pilots",
          }),
        ]}
      />
      <ShopShell section="pilots" initialParams={await searchParams} />
    </>
  );
}
