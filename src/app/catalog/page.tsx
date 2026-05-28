import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Каталог",
  path: "/shop",
  description:
    "Каталог Apex Store: одежда в эстетике Formula 1, коллекции пилотов, легенд, подарочные сертификаты и спортивные модели сезона 2026.",
});

export { default } from "@/app/shop/page";
