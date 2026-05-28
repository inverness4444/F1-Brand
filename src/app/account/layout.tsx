import type { Metadata } from "next";

import { AccountLayout } from "@/components/account-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { createPrivateMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = createPrivateMetadata("Личный кабинет");

export default async function AccountRootLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <ProtectedRoute>
      <AccountLayout>{children}</AccountLayout>
    </ProtectedRoute>
  );
}
