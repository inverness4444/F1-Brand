import { notFound } from "next/navigation";

import { CollectionPageContent } from "@/components/collection-page-content";
import { drivers } from "@/lib/data/roster";
import { getDriverDescription } from "@/lib/storefront-text";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DriverCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const driver = drivers.find((entry) => entry.slug === slug);

  if (!driver) {
    notFound();
  }

  return (
    <CollectionPageContent
      eyebrow={`${driver.teamName} · №${driver.number}`}
      title={driver.name}
      description={getDriverDescription(driver)}
      matchField="driverSlug"
      matchValue={driver.slug}
    />
  );
}
