import { HeroBanner } from "@/components/hero-banner";
import { HomeProductsSection } from "@/components/home-products-section";
import { NewsletterSection } from "@/components/newsletter-section";
import { StructuredData } from "@/components/structured-data";
import {
  createPageMetadata,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Velocity Club — одежда и мерч в гоночном стиле",
  absoluteTitle: true,
  path: "/",
  description:
    "Velocity Club — интернет-магазин одежды и мерча в гоночном стиле: футболки, худи, аксессуары, подарочные сертификаты и motorsport-inspired streetwear для фанатов автоспорта.",
  image: "/og-default.jpg",
});

export default function HomePage() {
  return (
    <div className="pb-14">
      <StructuredData
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          webPageJsonLd({
            name: "Velocity Club — одежда и мерч в гоночном стиле",
            description:
              "Интернет-магазин одежды и мерча в стиле автоспорта: футболки, худи, аксессуары и streetwear для фанатов гонок.",
            path: "/",
          }),
        ]}
      />
      <HeroBanner />
      <HomeProductsSection />
      <NewsletterSection />
    </div>
  );
}
