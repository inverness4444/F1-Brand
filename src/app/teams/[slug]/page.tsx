import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { StructuredData } from "@/components/structured-data";
import { teams } from "@/lib/data/roster";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import {
  breadcrumbJsonLd,
  createPageMetadata,
  getTeamDescriptionForSeo,
  webPageJsonLd,
} from "@/lib/seo";
import { getTeamDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return teams.map((team) => ({
    slug: team.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const team = teams.find((entry) => entry.slug === slug);

  if (!team) {
    notFound();
  }

  const products = await readCatalogProductsFromDb();
  const teamProducts = products.filter((product) => product.teamSlug === team.slug);

  return createPageMetadata({
    title: `Коллекция ${team.name}`,
    path: `/teams/${team.slug}`,
    description: getTeamDescriptionForSeo(team, teamProducts),
    index: teamProducts.length > 0,
  });
}

export default async function TeamCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const team = teams.find((entry) => entry.slug === slug);

  if (!team) {
    notFound();
  }

  return (
    <>
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Команды", path: "/teams" },
            { name: team.name, path: `/teams/${team.slug}` },
          ]),
          webPageJsonLd({
            name: `Коллекция ${team.name}`,
            description: getTeamDescription(team),
            path: `/teams/${team.slug}`,
          }),
        ]}
      />
      <CollectionPageContent
        eyebrow="Командная коллекция"
        title={team.name}
        description={getTeamDescription(team)}
        matchField="teamSlug"
        matchValue={team.slug}
      />
    </>
  );
}
