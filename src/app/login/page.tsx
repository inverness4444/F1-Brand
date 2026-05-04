import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { LoginPageClient } from "@/components/login-page-client";

export default function LoginPage() {
  return (
    <section className="container-shell py-10 sm:py-14">
      <Suspense fallback={<LoginForm redirectPath={null} />}>
        <LoginPageClient />
      </Suspense>
    </section>
  );
}
