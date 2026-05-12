import type { ProductBadge } from "@/lib/types";
import { badgeLabels } from "@/lib/catalog-ui";
import { cn } from "@/lib/utils";

const badgeToneClassNames: Record<ProductBadge, string> = {
  New: "border-[#e6ddd2] bg-white/95 text-[#111111]",
  Hit: "border-[#111111] bg-[#111111] text-white",
  Limited: "border-[#f0dcc9] bg-[#fff3ec] text-[#7b2220]",
  Preorder: "border-[#ead9b3] bg-[#fff8e7] text-[#8a5a12]",
  OutOfStock: "border-[#dcdcd7] bg-[#f4f4f1] text-[#6d6d68]",
  Sale: "border-[#cfe7d7] bg-[#eef8f1] text-[#14683d]",
  Original: "border-[#c9d7ef] bg-[#eef4ff] text-[#17406f]",
};

export function ProductBadgeTag({
  badge,
  className,
}: {
  badge: ProductBadge;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm",
        badgeToneClassNames[badge],
        className,
      )}
    >
      {badgeLabels[badge]}
    </span>
  );
}
