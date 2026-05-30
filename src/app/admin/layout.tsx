import { requireAdmin } from "@/lib/server/auth";
import { AdminNavigation } from "@/components/admin-navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <AdminNavigation />
      {children}
    </>
  );
}
