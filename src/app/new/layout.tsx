import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Новинки гоночного streetwear 2026",
  path: "/new",
  description:
    "Новые товары Velocity Club сезона 2026: футболки, худи, аксессуары и свежие дропы в гоночном стиле и motorsport-inspired streetwear.",
});

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
