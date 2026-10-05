import type { Metadata } from "next";
import { InfoCTA, InfoPageLayout, InfoSectionGrid } from "@/components/info-pages";
import { termsSections, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Пользовательское соглашение", path: "/terms", description: "Пользовательское соглашение интернет-магазина Velocity Club.",
});

export default function LegalPage() {
  return <InfoPageLayout title="Пользовательское соглашение" path="/terms" description={`Редакция от ${LEGAL_DATE}. Версия ${LEGAL_VERSION}.`}>
    <InfoSectionGrid sections={termsSections} />
    <InfoCTA title="Обращения покупателей" text="Напишите нам по вопросам заказа, возврата или обработки данных." buttonLabel="Контакты продавца" href="/contacts" />
  </InfoPageLayout>;
}
