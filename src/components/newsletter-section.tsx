import Image from "next/image";

import { NewsletterSignupForm } from "@/components/newsletter-signup-form";

export function NewsletterSection() {
  return (
    <section id="newsletter" className="mt-24 scroll-mt-28 px-4 sm:mt-28 sm:px-10 lg:px-[4.4rem]">
      <div className="grid min-h-[30rem] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20 xl:gap-24">
        <div className="max-w-[48rem]">
          <h2 className="font-[var(--font-heading)] text-[clamp(2rem,3.2vw,3.4rem)] font-medium leading-[1.05] text-[#050505]">
            Подписка на новости
          </h2>
          <p className="mt-7 max-w-[38rem] text-[1.02rem] leading-8 text-[#343434] sm:text-[1.12rem] sm:leading-9">
            Получайте закрытые предложения, ранние анонсы новых дропов и превью коллекций прямо на почту.
          </p>

          <NewsletterSignupForm
            className="mt-11 flex min-h-[4.85rem] w-full max-w-[48rem] items-center rounded-full border border-[#d8d8d8] bg-[#fbfbfb] p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
            inputClassName="h-full min-w-0 flex-1 border-0 bg-transparent px-5 text-[1.05rem] text-[#111111] outline-none placeholder:text-[#4b4b4b] sm:px-7"
            buttonClassName="inline-flex h-[3.95rem] min-w-[9.5rem] shrink-0 items-center justify-center rounded-full bg-black px-7 text-[0.98rem] font-medium text-white transition hover:bg-[#222222] disabled:cursor-default disabled:opacity-70 sm:min-w-[10.8rem]"
            placeholder="Ваш e-mail"
            submitLabel="Подписаться"
            submittingLabel="Отправляем"
          />
        </div>

        <div className="relative aspect-[500/282] w-full self-center overflow-hidden rounded-[0.85rem]">
          <Image
            src="/newsletter-hamilton.gif"
            alt="Льюис Хэмилтон у камеры"
            fill
            unoptimized
            loading="lazy"
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}
