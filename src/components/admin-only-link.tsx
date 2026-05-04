"use client";

import Link from "next/link";

type AdminOnlyLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function AdminOnlyLink({ href, className, children }: AdminOnlyLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
