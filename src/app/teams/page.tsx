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

type TeamsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: TeamsPageProps): Promise<Metadata> {
  const [products, params] = await Promise.all([readCatalogProductsFromDb(), searchParams]);
  const teamProducts = products.filter((product) => Boolean(product.teamSlug));
  const description = buildCollectionDescription({
    title: "Командные коллекции",
    products: teamProducts,
    fallback:
      "Командные коллекции Velocity Club: одежда и мерч в гоночном стиле, спортивные силуэты, футболки, худи и аксессуары для фанатов автоспорта.",
  });

  return createPageMetadata({
    title: "Командные коллекции в гоночном стиле",
    path: "/teams",
    description,
    index: teamProducts.length > 0 && !hasNonCanonicalSearchParams(params),
  });
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Команды", path: "/teams" },
          ]),
          webPageJsonLd({
            name: "Командные коллекции в гоночном стиле",
            description:
              "Одежда и мерч с командной гоночной эстетикой: футболки, худи, куртки и аксессуары.",
            path: "/teams",
          }),
        ]}
      />
      <ShopShell section="teams" initialParams={await searchParams} />
    </>
  );
}
