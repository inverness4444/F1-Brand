import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Новинки",
  path: "/new",
  description:
    "Новые товары Apex Store сезона 2026: свежие дропы из коллекций пилотов, легенд и существующих коллекций каталога.",
});

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
