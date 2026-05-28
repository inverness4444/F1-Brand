import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivateMetadata("Восстановление пароля");

export default function ForgotPasswordPage() {
  return (
    <section className="container-shell py-10 sm:py-14">
      <ForgotPasswordForm />
    </section>
  );
}
