"use client";

import Link from "next/link";

import { canAccessAdmin } from "@/lib/security-utils";
import { useAuthStore } from "@/store/auth-store";

type AdminOnlyLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function AdminOnlyLink({ href, className, children }: AdminOnlyLinkProps) {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!canAccessAdmin(currentUser)) {
    return null;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
