import type { Metadata } from "next";
import Link from "next/link";

import { InfoPageLayout, InfoSectionCard } from "@/components/info-pages";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Контакты",
  path: "/contacts",
  description:
    "Контакты поддержки покупателей Velocity Club, вопросы по заказам, доставке, возврату, размерам, сотрудничеству и обратной связи.",
});

const socialLinks = [
  { label: "Telegram", href: "https://t.me/f1velocityclub" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/f1velocityclub?igsh=MWJ2ZmhoeHBuMHFkeg%3D%3D&utm_source=qr",
  },
  { label: "TikTok", href: "https://www.tiktok.com/@f1velocityclub" },
  { label: "VK", href: "https://vk.ru/f1velocityclub" },
];

export default function ContactsPage() {
  return (
    <InfoPageLayout
      title="Контакты"
      path="/contacts"
      description="Если у вас есть вопросы по заказу, доставке, возврату, размерам или наличию товара - напишите нам удобным способом."
    >
      <div className="grid gap-4">
        <InfoSectionCard
          title="Поддержка покупателей"
          body={
            <div className="space-y-2">
              <p>
                Telegram:{" "}
                <Link
                  href="https://t.me/VelocityManager"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#111111] underline underline-offset-4"
                >
                  @VelocityManager
                </Link>
              </p>
              <p>
                Email:{" "}
                <Link href="mailto:velocityclub@mail.ru" className="font-semibold text-[#111111] underline underline-offset-4">
                  velocityclub@mail.ru
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
              <Link href="mailto:velocityclub@mail.ru" className="font-semibold text-[#111111] underline underline-offset-4">
                velocityclub@mail.ru
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
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[#111111] transition hover:border-[#111111]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          }
        />
      </div>
    </InfoPageLayout>
  );
}
