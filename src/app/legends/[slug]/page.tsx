import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { legends } from "@/lib/data/roster";
import { getLegendDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegendCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const legend = legends.find((entry) => entry.slug === slug);

  if (!legend) {
    notFound();
  }

  return (
    <CollectionPageContent
      eyebrow="Коллекция легенд"
      title={legend.name}
      description={getLegendDescription(legend)}
      matchField="legendSlug"
      matchValue={legend.slug}
    />
  );
}
