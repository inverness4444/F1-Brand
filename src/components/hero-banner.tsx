import Image from "next/image";

import { HeroCtaLink } from "@/components/hero-cta-link";

export function HeroBanner() {
  return (
    <section className="-mt-[74px]">
      <div className="relative overflow-hidden bg-[#111111]">
        <Image
          src="/hero-racing-collection-rotated.jpg"
          alt="Одежда и мерч в гоночном стиле Velocity Club"
          fill
          priority
          quality={82}
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.72)_0%,rgba(6,6,6,0.46)_28%,rgba(6,6,6,0.18)_58%,rgba(6,6,6,0.34)_100%)]" />
        <div className="relative flex min-h-[calc(100svh-2.25rem)] items-end px-4 pb-8 pt-[7.5rem] sm:px-8 sm:pb-12 lg:px-12 lg:pb-14 lg:pt-[8.5rem] xl:px-16 xl:pb-16">
          <div className="max-w-[40rem] text-white sm:max-w-[46rem]">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white/72">
              Velocity Club
            </p>
            <h1 className="mt-4 font-[var(--font-heading)] text-[clamp(2.35rem,11vw,6.4rem)] font-semibold leading-[0.9] tracking-normal">
              Racing DNA
            </h1>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-7 text-white/82 sm:text-base sm:leading-8">
              Подборка одежды, командных коллекций, капсул пилотов и аксессуаров в одной витрине.
            </p>
            <div className="mt-8">
              <HeroCtaLink />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
