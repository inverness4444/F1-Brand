import { HeroBanner } from "@/components/hero-banner";
import { HomeProductsSection } from "@/components/home-products-section";
import { NewsletterSection } from "@/components/newsletter-section";
import { StructuredData } from "@/components/structured-data";
import {
  createPageMetadata,
  organizationJsonLd,
  siteName,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: siteName,
  absoluteTitle: true,
  path: "/",
  description:
    "Apex Store — магазин одежды в эстетике Formula 1: товары из коллекций пилотов, легенд, подарочные сертификаты и спортивные модели сезона 2026.",
  image: "/hero-racing-collection-rotated.jpg",
});

export default function HomePage() {
  return (
    <div className="pb-14">
      <StructuredData data={[organizationJsonLd(), websiteJsonLd()]} />
      <HeroBanner />
      <HomeProductsSection />
      <NewsletterSection />
    </div>
  );
}
