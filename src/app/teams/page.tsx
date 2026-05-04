import { NewsletterSection } from "@/components/newsletter-section";
import { TeamCard } from "@/components/team-card";
import { teams } from "@/lib/data/roster";

export default function TeamsPage() {
  return (
    <div className="pb-14">
      <section className="container-shell pt-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <p className="section-kicker">Команды</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[clamp(2.2rem,4vw,4.2rem)] font-semibold tracking-[-0.07em] text-[#111111]">
            Коллекции команд
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f615f] sm:text-base sm:leading-8">
            Командные коллекции по составу Formula 1 сезона 2026.
          </p>
        </div>
      </section>

      <section className="container-shell mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((team) => (
          <TeamCard key={team.slug} team={team} />
        ))}
      </section>

      <NewsletterSection />
    </div>
  );
}
