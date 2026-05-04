import Link from "next/link";

import { footerColumns } from "@/lib/data/storefront";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NewsletterSignupForm } from "@/components/newsletter-signup-form";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[#fbfaf6]">
      <div className="container-shell grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.25fr_0.9fr_0.9fr_0.8fr_0.8fr_1fr]">
        <div className="min-w-0">
          <BrandLogo />
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#5f615f]">
            Магазин одежды в эстетике Formula 1: командные коллекции, капсулы пилотов и чистый спортивный формат без перегруза.
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">Магазин</p>
          <div className="mt-4 space-y-3 text-sm text-[#111111]">
            {footerColumns.shop.map((link) => (
              <Link key={link.label} href={link.href} className="block transition hover:text-[#7b2220]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">
            Покупателям
          </p>
          <div className="mt-4 space-y-3 text-sm text-[#111111]">
            {footerColumns.service.map((link) => (
              <Link key={link.label} href={link.href} className="block transition hover:text-[#7b2220]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">О бренде</p>
          <div className="mt-4 space-y-3 text-sm text-[#111111]">
            <Link href="/about" className="block transition hover:text-[#7b2220]">
              О магазине
            </Link>
            <Link href="/teams" className="block transition hover:text-[#7b2220]">
              Командные коллекции
            </Link>
            <Link href="/pilots" className="block transition hover:text-[#7b2220]">
              Коллекции пилотов
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">Документы</p>
          <div className="mt-4 space-y-3 text-sm text-[#111111]">
            {footerColumns.legal.map((link) => (
              <Link key={link.label} href={link.href} className="block transition hover:text-[#7b2220]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">Рассылка</p>
          <p className="mt-4 text-sm leading-7 text-[#5f615f]">
            Ранний доступ к новым дропам, рестокам и специальным предложениям.
          </p>
          <NewsletterSignupForm
            className="mt-5 flex flex-col gap-3"
            inputClassName="input-base"
            buttonClassName="button-base button-primary w-full"
          />
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#111111]">
            {footerColumns.social.map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-[#7b2220]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] py-5 text-center text-sm text-[#7b7a75]">
        © 2026 Apex Store
      </div>
    </footer>
  );
}
