"use client";

import { Gift, WalletCards } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

const accentGradients = [
  "from-[#111111] via-[#22201d] to-[#7b2220]",
  "from-[#111111] via-[#2a1d1a] to-[#935034]",
  "from-[#111111] via-[#1d2525] to-[#7b2220]",
];

export function GiftCardVisual({
  amount,
  compact = false,
  variant = 0,
  className,
}: {
  amount: number;
  compact?: boolean;
  variant?: number;
  className?: string;
}) {
  const normalizedVariant = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) : 0;
  const gradientClassName = accentGradients[normalizedVariant % accentGradients.length] ?? accentGradients[0];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.4rem] border border-[#2f2b27] bg-gradient-to-br text-white shadow-[0_22px_60px_rgba(17,17,17,0.22)]",
        gradientClassName,
        compact ? "min-h-[92px] p-3.5" : "min-h-[260px] p-5 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute inset-y-0 left-[18%] w-px bg-white/20" />
        <div className="absolute inset-y-0 left-[72%] w-px bg-white/10" />
        <div className="absolute inset-x-0 top-[22%] h-px bg-white/10" />
        <div className="absolute inset-x-0 bottom-[24%] h-px bg-white/10" />
        <div className="absolute -right-10 top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/90">
            <WalletCards className="size-3.5" />
            Digital Gift Card
          </div>
          <Gift className={cn("text-white/85", compact ? "size-4" : "size-5")} />
        </div>

        <div className={cn("mt-4", compact ? "space-y-1" : "space-y-2")}>
          <p className={cn("uppercase tracking-[0.24em] text-white/60", compact ? "text-[0.55rem]" : "text-[0.68rem]")}>
            Apex Store
          </p>
          <p
            className={cn(
              "font-[var(--font-heading)] font-semibold tracking-[-0.06em] text-white",
              compact ? "text-[1.15rem]" : "text-[clamp(2rem,5vw,3.25rem)]",
            )}
          >
            {formatCurrency(amount)}
          </p>
          <p className={cn("max-w-[18rem] text-white/70", compact ? "text-[0.7rem] leading-5" : "text-sm leading-7")}>
            Активируйте код в аккаунте и оплачивайте покупки балансом частями.
          </p>
        </div>
      </div>
    </div>
  );
}
