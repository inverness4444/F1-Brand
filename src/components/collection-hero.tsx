export function CollectionHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="container-shell pt-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white">
        <div className="px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-4 font-[var(--font-heading)] text-[clamp(2.2rem,4vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-[#111111]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f615f] sm:text-base sm:leading-8">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
