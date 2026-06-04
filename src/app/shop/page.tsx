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

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const [products, params] = await Promise.all([readCatalogProductsFromDb(), searchParams]);
  const description = buildCollectionDescription({
    title: "Каталог Velocity Club",
    products,
    fallback:
      "Каталог Velocity Club: одежда и мерч в гоночном стиле, футболки, худи, аксессуары, подарочные сертификаты и motorsport-inspired streetwear сезона 2026.",
  });

  return createPageMetadata({
    title: "Каталог одежды в гоночном стиле",
    path: "/shop",
    description,
    index: !hasNonCanonicalSearchParams(params),
  });
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Каталог", path: "/shop" },
          ]),
          webPageJsonLd({
            name: "Каталог одежды и мерча в гоночном стиле",
            description:
              "Футболки, худи, аксессуары и подарочные сертификаты в стиле автоспорта для фанатов гонок.",
            path: "/shop",
          }),
        ]}
      />
      <ShopShell initialParams={await searchParams} />
    </>
  );
}
