"use client";

import { useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/login-form";

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  return <LoginForm redirectPath={redirect} />;
}
