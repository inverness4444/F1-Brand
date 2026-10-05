import type { Metadata } from "next";
import { InfoCTA, InfoPageLayout, InfoSectionGrid } from "@/components/info-pages";
import { privacySections, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Политика обработки персональных данных", path: "/privacy", description: "Политика обработки персональных данных интернет-магазина Velocity Club.",
});

export default function LegalPage() {
  return <InfoPageLayout title="Политика обработки персональных данных" path="/privacy" description={`Редакция от ${LEGAL_DATE}. Версия ${LEGAL_VERSION}.`}>
    <InfoSectionGrid sections={privacySections} />
    <InfoCTA title="Обращения покупателей" text="Напишите нам по вопросам заказа, возврата или обработки данных." buttonLabel="Контакты продавца" href="/contacts" />
  </InfoPageLayout>;
}
