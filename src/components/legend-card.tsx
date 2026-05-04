import Link from "next/link";

import type { Legend } from "@/lib/types";
import { getLegendDescription } from "@/lib/storefront-text";

export function LegendCard({ legend }: { legend: Legend }) {
  return (
    <Link
      href={`/legends/${legend.slug}`}
      className="group min-w-0 overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-white transition hover:-translate-y-0.5"
    >
      <div className="h-28 bg-[linear-gradient(180deg,#f8f5ef_0%,#efeadf_100%)] px-5 py-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#7b7a75]">Легенда</p>
        <h3 className="mt-3 break-words font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
          {legend.name}
        </h3>
      </div>
      <div className="p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b7a75]">Архивная коллекция</p>
        <p className="mt-3 break-words text-sm leading-7 text-[#5f615f]">{getLegendDescription(legend)}</p>
      </div>
    </Link>
  );
}
