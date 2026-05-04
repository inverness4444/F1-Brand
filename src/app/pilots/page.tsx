import { DriverCard } from "@/components/driver-card";
import { NewsletterSection } from "@/components/newsletter-section";
import { drivers, teams } from "@/lib/data/roster";

export default function PilotsPage() {
  return (
    <div className="pb-14">
      <section className="container-shell pt-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <p className="section-kicker">Пилоты</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[clamp(2.2rem,4vw,4.2rem)] font-semibold tracking-[-0.07em] text-[#111111]">
            Коллекции пилотов
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f615f] sm:text-base sm:leading-8">
            Коллекции всех действующих пилотов Formula 1 сезона 2026.
          </p>
        </div>
      </section>

      <section className="container-shell mt-10 space-y-10">
        {teams.map((team) => (
          <div key={team.slug}>
            <div className="mb-4">
              <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                {team.name}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {drivers
                .filter((driver) => driver.teamName === team.name)
                .map((driver) => (
                  <DriverCard key={driver.slug} driver={driver} />
                ))}
            </div>
          </div>
        ))}
      </section>

      <NewsletterSection />
    </div>
  );
}
