import { NewsletterSignupForm } from "@/components/newsletter-signup-form";

export function NewsletterSection() {
  return (
    <section id="newsletter" className="mt-24 scroll-mt-28 px-4 sm:mt-28 sm:px-10 lg:px-[4.4rem]">
      <div className="grid min-h-[42rem] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20 xl:gap-24">
        <div className="max-w-[48rem]">
          <h2 className="font-[var(--font-heading)] text-5xl font-semibold leading-[0.95] text-[#050505] sm:text-6xl lg:text-7xl">
            Sign up for news
          </h2>
          <p className="mt-8 max-w-[40rem] text-[1.08rem] leading-8 text-[#343434] sm:text-[1.18rem] sm:leading-9">
            Sign up to our newsletter to benefit from exclusive offers and product previews, direct to your inbox.
          </p>

          <NewsletterSignupForm
            className="mt-11 flex min-h-[4.85rem] w-full max-w-[48rem] items-center rounded-full border border-[#d8d8d8] bg-[#fbfbfb] p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
            inputClassName="h-full min-w-0 flex-1 border-0 bg-transparent px-5 text-[1.05rem] text-[#111111] outline-none placeholder:text-[#4b4b4b] sm:px-7"
            buttonClassName="inline-flex h-[3.95rem] min-w-[9.5rem] shrink-0 items-center justify-center rounded-full bg-black px-7 text-[0.98rem] font-medium text-white transition hover:bg-[#222222] disabled:cursor-default disabled:opacity-70 sm:min-w-[10.8rem]"
            placeholder="Email"
            submitLabel="Sign Up"
            submittingLabel="Sending"
          />
        </div>

        <div className="relative min-h-[20rem] overflow-hidden rounded-[0.85rem] bg-[#eeeeea] sm:min-h-[26rem] lg:min-h-[32.5rem]">
          <img
            src="/newsletter-hamilton.gif"
            alt="Lewis Hamilton celebration"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}
