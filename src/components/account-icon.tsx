"use client";

import { CircleUserRound } from "lucide-react";

import { getInitials } from "@/lib/account-utils";
import { cn } from "@/lib/utils";

export function AccountIcon({
  name,
  className,
  initialsClassName,
}: {
  name?: string | null;
  className?: string;
  initialsClassName?: string;
}) {
  if (!name) {
    return (
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700",
          className,
        )}
      >
        <CircleUserRound className="size-5" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white",
        className,
        initialsClassName,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
