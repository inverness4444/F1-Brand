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
} from "@/lib/seo";
import { getTeamDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await readCatalogProductsFromDb();
  const productTeamSlugs = new Set(products.map((product) => product.teamSlug).filter(Boolean));

  return teams
    .filter((team) => productTeamSlugs.has(team.slug))
    .map((team) => ({
      slug: team.slug,
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const team = teams.find((entry) => entry.slug === slug);

  if (!team) {
    return {
      title: "Команда не найдена",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const products = await readCatalogProductsFromDb();
  const teamProducts = products.filter((product) => product.teamSlug === team.slug);

  return createPageMetadata({
    title: team.name,
    path: `/teams/${team.slug}`,
    description: getTeamDescriptionForSeo(team, teamProducts),
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
        data={breadcrumbJsonLd([
          { name: "Главная", path: "/" },
          { name: "Команды", path: "/teams" },
          { name: team.name, path: `/teams/${team.slug}` },
        ])}
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
