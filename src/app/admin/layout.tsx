import type { Metadata } from "next";

import { requireAdmin } from "@/lib/server/auth";
import { AdminNavigation } from "@/components/admin-navigation";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivateMetadata("Админка");

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
