import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { teams } from "@/lib/data/roster";
import { getTeamDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeamCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const team = teams.find((entry) => entry.slug === slug);

  if (!team) {
    notFound();
  }

  return (
    <CollectionPageContent
      eyebrow="Командная коллекция"
      title={team.name}
      description={getTeamDescription(team)}
      matchField="teamSlug"
      matchValue={team.slug}
    />
  );
}
