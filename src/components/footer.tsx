import Link from "next/link";

import { footerColumns } from "@/lib/data/storefront";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NewsletterSignupForm } from "@/components/newsletter-signup-form";

export function Footer() {
  return (
    <footer className="mt-20 px-4 sm:px-10 lg:px-[4.4rem]">
      <div className="rounded-t-[0.8rem] bg-black text-white">
        <div className="grid gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:px-10 xl:grid-cols-[1.25fr_0.9fr_0.9fr_0.8fr_0.8fr_1fr] xl:px-14">
          <div className="min-w-0">
            <BrandLogo markClassName="brightness-0 invert" titleClassName="text-white" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              Магазин одежды в эстетике Formula 1
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-white/60">Магазин</p>
            <div className="mt-4 space-y-3 text-sm text-white">
              {footerColumns.shop.map((link) => (
                <Link key={link.label} href={link.href} className="block transition hover:text-white/60">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-white/60">
              Покупателям
            </p>
            <div className="mt-4 space-y-3 text-sm text-white">
              {footerColumns.service.map((link) => (
                <Link key={link.label} href={link.href} className="block transition hover:text-white/60">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-white/60">О бренде</p>
            <div className="mt-4 space-y-3 text-sm text-white">
              <Link href="/about" className="block transition hover:text-white/60">
                О магазине
              </Link>
              <Link href="/teams" className="block transition hover:text-white/60">
                Командные коллекции
              </Link>
              <Link href="/pilots" className="block transition hover:text-white/60">
                Коллекции пилотов
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-white/60">Документы</p>
            <div className="mt-4 space-y-3 text-sm text-white">
              {footerColumns.legal.map((link) => (
                <Link key={link.label} href={link.href} className="block transition hover:text-white/60">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-white/60">Рассылка</p>
            <p className="mt-4 text-sm leading-7 text-white/60">
              Ранний доступ к новым дропам, рестокам и специальным предложениям.
            </p>
            <NewsletterSignupForm
              className="mt-5 flex flex-col gap-3"
              inputClassName="min-h-12 rounded-[0.7rem] border border-white/22 bg-transparent px-4 text-white outline-none placeholder:text-white/50"
              buttonClassName="button-base w-full border border-white bg-white text-black hover:bg-white/90"
            />
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white">
              {footerColumns.social.map((link) => (
                <Link key={link.label} href={link.href} className="transition hover:text-white/60">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/12 py-5 text-center text-sm text-white/50">
          © 2026 Apex Store
        </div>
      </div>
    </footer>
  );
}
