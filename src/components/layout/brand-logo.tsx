import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  markClassName,
  titleClassName,
  showTagline = true,
}: {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 sm:gap-2.5", className)}>
      <span className="block w-11 shrink-0 sm:w-[2.95rem]">
        <Image
          src="/apex-logo-preview.png"
          alt="Apex Store"
          width={405}
          height={240}
          className={cn("h-auto w-full", markClassName)}
        />
      </span>
      <div className="min-w-0">
        {showTagline ? (
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[#7b7a75]">
            Фирменный магазин
          </p>
        ) : null}
        <p
          className={cn(
            "whitespace-nowrap font-[var(--font-heading)] text-lg font-semibold tracking-[-0.04em] text-[#111111] sm:text-xl",
            titleClassName,
          )}
        >
          Apex Store
        </p>
      </div>
    </Link>
  );
}
