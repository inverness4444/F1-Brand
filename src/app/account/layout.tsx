import { AccountLayout } from "@/components/account-layout";
import { ProtectedRoute } from "@/components/protected-route";

export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AccountLayout>{children}</AccountLayout>
    </ProtectedRoute>
  );
}
