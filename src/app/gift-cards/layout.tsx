import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Подарочные сертификаты",
  path: "/gift-cards",
  description:
    "Подарочные сертификаты Apex Store: цифровые сертификаты из текущего каталога, активация в личном кабинете и оплата товаров балансом.",
});

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
