import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Подарочные сертификаты Velocity Club",
  path: "/gift-cards",
  description:
    "Подарочные сертификаты Velocity Club: цифровой подарок для покупки одежды, аксессуаров и мерча в гоночном стиле.",
});

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
