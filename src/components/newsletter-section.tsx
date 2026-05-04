import { NewsletterSignupForm } from "@/components/newsletter-signup-form";

export function NewsletterSection() {
  return (
    <section className="container-shell mt-14 sm:mt-18">
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="section-kicker">Рассылка</p>
            <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(2rem,7vw,2.25rem)] font-semibold tracking-[-0.06em] text-[#111111] sm:text-4xl">
              Вступайте в Racing Club
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f615f] sm:text-base sm:leading-8">
              Получайте ранний доступ к новым дропам, рестокам и закрытым предложениям.
            </p>
          </div>
          <NewsletterSignupForm
            className="flex flex-col gap-3 sm:flex-row"
            inputClassName="input-base flex-1"
            buttonClassName="button-base button-primary w-full sm:min-w-[160px]"
          />
        </div>
      </div>
    </section>
  );
}
