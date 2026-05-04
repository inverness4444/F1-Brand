import Link from "next/link";

import type { Driver } from "@/lib/types";
import { getDriverDescription } from "@/lib/storefront-text";

export function DriverCard({ driver }: { driver: Driver }) {
  return (
    <Link
      href={`/pilots/${driver.slug}`}
      className="group min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white transition hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <span className="min-w-0 break-words text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#7b7a75]">
          {driver.teamName}
        </span>
        <span className="font-[var(--font-heading)] text-xl font-semibold tracking-[-0.05em] text-[#111111]">
          #{driver.number}
        </span>
      </div>
      <div className="p-5">
        <h3 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
          {driver.name}
        </h3>
        <p className="mt-3 break-words text-sm leading-7 text-[#5f615f]">{getDriverDescription(driver)}</p>
        <span className="mt-6 inline-flex text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[#111111]">
          Смотреть коллекцию
        </span>
      </div>
    </Link>
  );
}
