import type { Metadata } from "next";

import { RegisterForm } from "@/components/register-form";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivateMetadata("Регистрация");

export default function RegisterPage() {
  return (
    <section className="container-shell py-10 sm:py-14">
      <RegisterForm />
    </section>
  );
}
