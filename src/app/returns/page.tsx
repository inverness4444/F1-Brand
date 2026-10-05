import type { Metadata } from "next";
import { InfoCTA, InfoPageLayout, InfoSectionGrid } from "@/components/info-pages";
import { returnSections, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Возврат и обмен", path: "/returns", description: "Возврат и обмен интернет-магазина Velocity Club.",
});

export default function LegalPage() {
  return <InfoPageLayout title="Возврат и обмен" path="/returns" description={`Редакция от ${LEGAL_DATE}. Версия ${LEGAL_VERSION}.`}>
    <InfoSectionGrid sections={returnSections} />
    <InfoCTA title="Обращения покупателей" text="Напишите нам по вопросам заказа, возврата или обработки данных." buttonLabel="Контакты продавца" href="/contacts" />
  </InfoPageLayout>;
}
