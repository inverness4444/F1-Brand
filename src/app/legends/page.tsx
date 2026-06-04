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

type LegendsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export async function generateMetadata({ searchParams }: LegendsPageProps): Promise<Metadata> {
  const [products, params] = await Promise.all([readCatalogProductsFromDb(), searchParams]);
  const legendProducts = products.filter((product) => Boolean(product.legendSlug));
  const description = buildCollectionDescription({
    title: "Коллекции легенд",
    products: legendProducts,
    fallback:
      "Архивные коллекции Velocity Club: одежда и мерч в стиле автоспорта, футболки, лонгсливы и аксессуары с современной подачей.",
  });

  return createPageMetadata({
    title: "Архивные коллекции автоспорта",
    path: "/legends",
    description,
    index: legendProducts.length > 0 && !hasNonCanonicalSearchParams(params),
  });
}

export default async function LegendsPage({ searchParams }: LegendsPageProps) {
  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Легенды", path: "/legends" },
          ]),
          webPageJsonLd({
            name: "Архивные коллекции автоспорта",
            description:
              "Архивные капсулы, футболки и аксессуары в гоночном стиле для фанатов истории автоспорта.",
            path: "/legends",
          }),
        ]}
      />
      <ShopShell section="legends" initialParams={await searchParams} />
    </>
  );
}
