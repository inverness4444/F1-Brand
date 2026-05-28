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
} from "@/lib/seo";
import { getLegendDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await readCatalogProductsFromDb();
  const productLegendSlugs = new Set(products.map((product) => product.legendSlug).filter(Boolean));

  return legends
    .filter((legend) => productLegendSlugs.has(legend.slug))
    .map((legend) => ({
      slug: legend.slug,
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const legend = legends.find((entry) => entry.slug === slug);

  if (!legend) {
    return {
      title: "Легенда не найдена",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const products = await readCatalogProductsFromDb();
  const legendProducts = products.filter((product) => product.legendSlug === legend.slug);

  return createPageMetadata({
    title: legend.name,
    path: `/legends/${legend.slug}`,
    description: getLegendDescriptionForSeo(legend, legendProducts),
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
        data={breadcrumbJsonLd([
          { name: "Главная", path: "/" },
          { name: "Легенды", path: "/legends" },
          { name: legend.name, path: `/legends/${legend.slug}` },
        ])}
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
