import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { InfoCTA, InfoPageLayout, InfoSectionCard } from "@/components/info-pages";

export const metadata: Metadata = {
  title: "Контакты | Apex Store",
  description: "Контакты поддержки покупателей, сотрудничества и обратной связи Apex Store.",
};

const socialLinks = [
  { label: "Telegram", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "VK", href: "#" },
];

export default function ContactsPage() {
  return (
    <InfoPageLayout
      title="Контакты"
      description="Если у вас есть вопросы по заказу, доставке, возврату, размерам или наличию товара - напишите нам удобным способом."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <InfoSectionCard
            title="Поддержка покупателей"
            body={
              <div className="space-y-2">
                <p>
                  Telegram:{" "}
                  <Link href="https://t.me/yourbrand" className="font-semibold text-[#111111] underline underline-offset-4">
                    @yourbrand
                  </Link>
                </p>
                <p>
                  Email:{" "}
                  <Link href="mailto:support@yourbrand.ru" className="font-semibold text-[#111111] underline underline-offset-4">
                    support@yourbrand.ru
                  </Link>
                </p>
                <p>Время ответа: ежедневно с 10:00 до 22:00</p>
              </div>
            }
          />
          <InfoSectionCard
            title="По вопросам сотрудничества"
            body={
              <p>
                Для партнёрств, оптовых заказов, коллабораций и предложений пишите на email:{" "}
                <Link href="mailto:partners@yourbrand.ru" className="font-semibold text-[#111111] underline underline-offset-4">
                  partners@yourbrand.ru
                </Link>
              </p>
            }
          />
          <InfoSectionCard
            title="Поддержка по заказам"
            body="При обращении по заказу укажите номер заказа, имя, телефон или email и краткое описание вопроса. Так мы сможем быстрее помочь."
          />
          <InfoSectionCard
            title="Социальные сети"
            body={
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[#111111] transition hover:border-[#111111]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            }
          />
        </div>

        <section className="rounded-[1.1rem] border border-[var(--line)] bg-white p-5 sm:p-6">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold tracking-normal text-[#111111]">
            Форма обратной связи
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">
            Форма пока работает без backend: после отправки вы увидите уведомление на сайте.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </section>
      </div>

      <InfoCTA
        title="Остались вопросы?"
        text="Укажите номер заказа при обращении, и мы быстрее найдём информацию."
        buttonLabel="Связаться с нами"
        href="/contacts"
      />
    </InfoPageLayout>
  );
}
