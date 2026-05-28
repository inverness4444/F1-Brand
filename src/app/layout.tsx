import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";

import "@/app/globals.css";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { ScrollbarVisibility } from "@/components/scrollbar-visibility";
import { TopAnnouncementBar } from "@/components/top-announcement-bar";
import { defaultOgImage, getSiteUrl, siteName } from "@/lib/seo";

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
  description:
    "Магазин одежды в эстетике Formula 1 с коллекциями команд, пилотов и базовой спортивной линейкой.",
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteName,
    description:
      "Магазин одежды в эстетике Formula 1 с коллекциями команд, пилотов и базовой спортивной линейкой.",
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
    description:
      "Магазин одежды в эстетике Formula 1 с коллекциями команд, пилотов и базовой спортивной линейкой.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
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
