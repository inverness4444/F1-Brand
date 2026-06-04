import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { StructuredData } from "@/components/structured-data";
import { legends } from "@/lib/data/roster";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import {
  breadcrumbJsonLd,
  createPageMetadata,
  getLegendDescriptionForSeo,
  webPageJsonLd,
} from "@/lib/seo";
import { getLegendDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;
export const revalidate = 300;

export async function generateStaticParams() {
  return legends.map((legend) => ({
    slug: legend.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const legend = legends.find((entry) => entry.slug === slug);

  if (!legend) {
    notFound();
  }

  const products = await readCatalogProductsFromDb();
  const legendProducts = products.filter((product) => product.legendSlug === legend.slug);

  return createPageMetadata({
    title: `Коллекция ${legend.name}`,
    path: `/legends/${legend.slug}`,
    description: getLegendDescriptionForSeo(legend, legendProducts),
    index: legendProducts.length > 0,
  });
}

export default async function LegendCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const legend = legends.find((entry) => entry.slug === slug);

  if (!legend) {
    notFound();
  }

  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Легенды", path: "/legends" },
            { name: legend.name, path: `/legends/${legend.slug}` },
          ]),
          webPageJsonLd({
            name: `Коллекция ${legend.name}`,
            description: getLegendDescription(legend),
            path: `/legends/${legend.slug}`,
          }),
        ]}
      />
      <CollectionPageContent
        eyebrow="Коллекция легенд"
        title={legend.name}
        description={getLegendDescription(legend)}
        matchField="legendSlug"
        matchValue={legend.slug}
      />
    </>
  );
}
