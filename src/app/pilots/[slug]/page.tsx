import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { StructuredData } from "@/components/structured-data";
import { drivers } from "@/lib/data/roster";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import {
  breadcrumbJsonLd,
  createPageMetadata,
  getDriverDescriptionForSeo,
  webPageJsonLd,
} from "@/lib/seo";
import { getDriverDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return drivers.map((driver) => ({
    slug: driver.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const driver = drivers.find((entry) => entry.slug === slug);

  if (!driver) {
    notFound();
  }

  const products = await readCatalogProductsFromDb();
  const driverProducts = products.filter((product) => product.driverSlug === driver.slug);

  return createPageMetadata({
    title: `Коллекция ${driver.name}`,
    path: `/pilots/${driver.slug}`,
    description: getDriverDescriptionForSeo(driver, driverProducts),
    index: driverProducts.length > 0,
  });
}

export default async function DriverCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const driver = drivers.find((entry) => entry.slug === slug);

  if (!driver) {
    notFound();
  }

  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Пилоты", path: "/pilots" },
            { name: driver.name, path: `/pilots/${driver.slug}` },
          ]),
          webPageJsonLd({
            name: `Коллекция ${driver.name}`,
            description: getDriverDescription(driver),
            path: `/pilots/${driver.slug}`,
          }),
        ]}
      />
      <CollectionPageContent
        eyebrow={`${driver.teamName} · №${driver.number}`}
        title={driver.name}
        description={getDriverDescription(driver)}
        matchField="driverSlug"
        matchValue={driver.slug}
      />
    </>
  );
}
