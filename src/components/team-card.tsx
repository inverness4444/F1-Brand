import Link from "next/link";

import type { Team } from "@/lib/types";
import { getTeamDescription } from "@/lib/storefront-text";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group min-w-0 overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-white transition hover:-translate-y-0.5"
    >
      <div className="p-5">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#7b7a75]">Команда</p>
        <h3 className="mt-3 break-words font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
          {team.name}
        </h3>
        <p className="mt-3 break-words text-sm leading-7 text-[#5f615f]">{getTeamDescription(team)}</p>
        <span className="mt-6 inline-flex text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[#111111]">
          Смотреть коллекцию
        </span>
      </div>
    </Link>
  );
}
