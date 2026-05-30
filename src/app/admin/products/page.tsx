import type { Metadata } from "next";

import { CatalogEditor } from "@/components/catalog-editor";
import { createPrivateMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = createPrivateMetadata("Редактор каталога");

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdmin();

  return <CatalogEditor />;
}
