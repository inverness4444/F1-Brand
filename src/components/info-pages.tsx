import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClassName } from "@/components/ui/button";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type InfoSection = {
  title: string;
  body: ReactNode;
};

type InfoPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type InfoCTAProps = {
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
};

type FAQItem = {
  category?: string;
  question: string;
  answer: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-[#6b6a66]" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
            {item.href && !last ? (
              <Link href={item.href} className="transition hover:text-[#111111]">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-[#111111]" : undefined}>{item.label}</span>
            )}
            {!last ? <span className="text-[#b5b0a8]">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

export function InfoPageLayout({ title, description, children }: InfoPageLayoutProps) {
  return (
    <div className="pb-16">
      <section className="container-shell pt-8">
        <div className="border-b border-[var(--line)] pb-8">
          <div className="mx-auto max-w-[1180px]">
            <Breadcrumbs
              items={[
                { label: "Главная", href: "/" },
                { label: title },
              ]}
            />
            <p className="section-kicker mt-8">Покупателям</p>
            <h1 className="mt-4 max-w-4xl break-words font-[var(--font-heading)] text-4xl font-semibold leading-none tracking-normal text-[#111111] sm:text-5xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f615f] sm:text-lg">{description}</p>
          </div>
        </div>
      </section>

      <div className="container-shell mt-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </div>
    </div>
  );
}

export function InfoSection({ title, body }: InfoSection) {
  return (
    <section className="rounded-[1.1rem] border border-[var(--line)] bg-white p-6 sm:p-8">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <h2 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-normal text-[#111111]">
          {title}
        </h2>
        <div className="text-[0.98rem] leading-8 text-[#5f615f] sm:text-base">{body}</div>
      </div>
    </section>
  );
}

export function InfoSectionCard({ title, body }: InfoSection) {
  return <InfoSection title={title} body={body} />;
}

export function InfoSectionGrid({ sections }: { sections: InfoSection[] }) {
  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <InfoSection key={section.title} title={section.title} body={section.body} />
      ))}
    </div>
  );
}

export function InfoCTA({ title, text, buttonLabel, href }: InfoCTAProps) {
  return (
    <section className="mt-8 rounded-[1.1rem] border border-[#111111] bg-[#111111] p-6 text-white sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <div className="max-w-2xl">
        <p className="section-kicker text-white/55">Поддержка</p>
        <h2 className="mt-3 font-[var(--font-heading)] text-3xl font-semibold tracking-normal sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">{text}</p>
      </div>
      <Link
        href={href}
        className={buttonClassName({
          variant: "secondary",
          className: "mt-6 border-white bg-white text-black hover:bg-white/90 lg:mt-0",
        })}
      >
        {buttonLabel}
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="divide-y divide-[var(--line)] rounded-[1.1rem] border border-[var(--line)] bg-white">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-5 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              {item.category ? (
                <span className="block text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#88847d]">
                  {item.category}
                </span>
              ) : null}
              <span className="mt-1 block font-[var(--font-heading)] text-xl font-semibold tracking-normal text-[#111111]">
                {item.question}
              </span>
            </span>
            <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-lg leading-none text-[#111111] transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5f615f] sm:text-[0.96rem]">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
