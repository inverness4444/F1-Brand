import { CatalogEditor } from "@/components/catalog-editor";
import { ProtectedRoute } from "@/components/protected-route";

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <CatalogEditor />
    </ProtectedRoute>
  );
}
