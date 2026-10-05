import type { Metadata } from "next";
import { InfoPageLayout } from "@/components/info-pages";
import { NewsletterUnsubscribeForm } from "@/components/newsletter-unsubscribe-form";
export const metadata: Metadata = { title: "Отказ от рассылки", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <InfoPageLayout title="Отказ от рассылки" description="Отключите рекламные письма Velocity Club."><NewsletterUnsubscribeForm token={typeof token === "string" ? token : ""} /></InfoPageLayout>;
}
