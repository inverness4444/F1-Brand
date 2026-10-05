import { notFound } from "next/navigation";
import { InfoPageLayout, InfoSectionCard } from "@/components/info-pages";
import { consentDocuments, LEGAL_DATE, LEGAL_VERSION } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(consentDocuments).map((kind) => ({ kind }));
}

export default async function ConsentPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!Object.hasOwn(consentDocuments, kind)) notFound();
  const document = consentDocuments[kind as keyof typeof consentDocuments];
  return <InfoPageLayout title={document.title} path={`/consent/${kind}`} description={`Редакция от ${LEGAL_DATE}. Версия ${LEGAL_VERSION}.`}>
    <InfoSectionCard title="Текст согласия" body={document.text} />
  </InfoPageLayout>;
}
