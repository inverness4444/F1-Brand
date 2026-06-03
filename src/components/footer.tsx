import { Instagram } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { SVGProps } from "react";

import { footerColumns } from "@/lib/data/storefront";

type SocialLabel = (typeof footerColumns.social)[number]["label"];

function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M21.7 3.3 2.9 10.6c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.5c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.6-2.5 5.4 4c1 .6 1.7.3 1.9-.9l3.4-16c.3-1.4-.6-2-1.8-1.5Z"
        fill="currentColor"
      />
      <path d="M7.8 13.3 18.8 6.4 10.1 15.5l-.3 3.1-2-5.3Z" fill="black" fillOpacity="0.28" />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M15.6 2.8c.3 2.4 1.7 3.9 4.1 4.1v3.6c-1.4.1-2.7-.3-4-1.1v6.1c0 3.1-2 5.7-5.5 5.7-3.2 0-5.4-2.1-5.4-5.1 0-3.2 2.4-5.3 5.9-5.1v3.7c-1.5-.2-2.3.5-2.3 1.5 0 .9.7 1.5 1.7 1.5 1.2 0 1.9-.7 1.9-2.3V2.8h3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function VkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3.6 7.4c.1 5.8 3 9.3 8.2 9.3h.3v-3.3c1.9.2 3.3 1.6 3.9 3.3h3c-.8-2.5-2.9-4-4.2-4.5 1.3-.7 3.2-2.4 3.7-4.8h-2.7c-.6 1.8-2.1 3.5-3.7 3.7V7.4H9.4v6.5C7.7 13.5 5.6 11.6 5.5 7.4H3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SocialIcon({ label }: { label: SocialLabel }) {
  if (label === "Instagram") {
    return <Instagram className="size-7" aria-hidden="true" />;
  }

  if (label === "Telegram") {
    return <TelegramIcon className="size-7" />;
  }

  if (label === "TikTok") {
    return <TikTokIcon className="size-7" />;
  }

  return <VkIcon className="size-7" />;
}

export function Footer() {
  const footerLinkClassName = "block text-[1rem] leading-6 text-white/88 transition hover:text-white";

  return (
    <footer className="mt-8 bg-white px-4 pb-4 pt-0 sm:px-8 lg:mt-10 lg:px-[4.2rem]">
      <div className="relative rounded-[0.7rem] bg-black px-7 py-10 text-white sm:px-10 lg:min-h-[25rem] lg:px-14 lg:py-12 xl:px-[3.35rem]">
        <div className="flex min-w-0 flex-col justify-between gap-10 lg:absolute lg:inset-y-12 lg:left-14 xl:left-[3.35rem]">
          <Image
            src="/velocity-logo-preview.png"
            alt="Velocity Club"
            width={405}
            height={240}
            className="h-auto w-36 brightness-0 invert sm:w-40"
          />

          <div>
            <div className="flex flex-wrap gap-4 text-white">
              {footerColumns.social.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  title={link.label}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  className="inline-flex h-9 w-9 items-center justify-center text-white transition hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                >
                  <SocialIcon label={link.label} />
                </Link>
              ))}
            </div>
            <p className="mt-6 text-[1rem] leading-6 text-white/88">© 2026 Velocity Club</p>
          </div>
        </div>

        <div className="mt-10 grid gap-x-14 gap-y-9 sm:grid-cols-2 lg:ml-[22rem] lg:mt-0 lg:grid-cols-4 xl:ml-[27rem] xl:gap-x-16">
          <div className="min-w-0">
            <p className="text-[1.05rem] font-semibold tracking-normal text-white">Магазин</p>
            <div className="mt-6 space-y-2.5">
              {footerColumns.shop.map((link) => (
                <Link key={link.label} href={link.href} className={footerLinkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[1.05rem] font-semibold tracking-normal text-white">Покупателям</p>
            <div className="mt-6 space-y-2.5">
              {footerColumns.service.map((link) => (
                <Link key={link.label} href={link.href} className={footerLinkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[1.05rem] font-semibold tracking-normal text-white">О бренде</p>
            <div className="mt-6 space-y-2.5">
              <Link href="/about" className={footerLinkClassName}>
                О магазине
              </Link>
              <Link href="/teams" className={footerLinkClassName}>
                Командные коллекции
              </Link>
              <Link href="/pilots" className={footerLinkClassName}>
                Коллекции пилотов
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[1.05rem] font-semibold tracking-normal text-white">Документы</p>
            <div className="mt-6 space-y-2.5">
              {footerColumns.legal.map((link) => (
                <Link key={link.label} href={link.href} className={footerLinkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
