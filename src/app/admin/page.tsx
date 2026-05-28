import type { Metadata } from "next";

import { CatalogEditor } from "@/components/catalog-editor";
import { ProtectedRoute } from "@/components/protected-route";
import { createPrivateMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/server/auth";

export const metadata: Metadata = createPrivateMetadata("Редактор каталога");

export default async function AdminPage() {
  await requireAdmin();

  return (
    <ProtectedRoute requireAdmin>
      <CatalogEditor />
    </ProtectedRoute>
  );
}
