import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";

import "@/app/globals.css";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { ScrollbarVisibility } from "@/components/scrollbar-visibility";
import { TopAnnouncementBar } from "@/components/top-announcement-bar";
import { defaultOgImage, getSiteUrl, publicRobots, siteName } from "@/lib/seo";

const siteDescription =
  "Apex Store — магазин одежды и мерча в гоночном стиле: футболки, худи, аксессуары и motorsport-inspired streetwear для фанатов автоспорта.";

const headingFont = Archivo({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  display: "swap",
});

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/",
    siteName,
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: defaultOgImage,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [defaultOgImage],
  },
  robots: publicRobots(),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="bg-[var(--background)] font-[var(--font-body)] text-[var(--foreground)] antialiased">
        <Providers>
          <ScrollbarVisibility />
          <TopAnnouncementBar />
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
