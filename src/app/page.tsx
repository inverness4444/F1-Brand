import { HeroBanner } from "@/components/hero-banner";
import { HomeProductsSection } from "@/components/home-products-section";
import { NewsletterSection } from "@/components/newsletter-section";

export default function HomePage() {
  return (
    <div className="pb-14">
      <HeroBanner />
      <HomeProductsSection />
      <NewsletterSection />
    </div>
  );
}
