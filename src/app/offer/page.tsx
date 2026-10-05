import type { Metadata } from "next";
import { InfoCTA, InfoPageLayout, InfoSectionGrid } from "@/components/info-pages";
import { offerSections, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";
export const metadata: Metadata = createPageMetadata({ title: "Публичная оферта", path: "/offer", description: "Условия покупки, оплаты, доставки и возврата Velocity Club." });
export default function OfferPage() {
  return <InfoPageLayout title="Публичная оферта" path="/offer" description={`Редакция от ${LEGAL_DATE}. Версия ${LEGAL_VERSION}.`}>
    <InfoSectionGrid sections={offerSections} />
    <InfoCTA title="Обращения покупателей" text="Напишите продавцу по вопросам заказа, оплаты или возврата." buttonLabel="Контакты" href="/contacts" />
  </InfoPageLayout>;
}
