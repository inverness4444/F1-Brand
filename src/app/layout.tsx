import type { Metadata } from "next";
import { Archivo, Manrope } from "next/font/google";

import "@/app/globals.css";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { ScrollbarVisibility } from "@/components/scrollbar-visibility";
import { TopAnnouncementBar } from "@/components/top-announcement-bar";

const headingFont = Archivo({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Apex Store",
  description:
    "Магазин одежды в эстетике Formula 1 с коллекциями команд, пилотов и базовой спортивной линейкой.",
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
