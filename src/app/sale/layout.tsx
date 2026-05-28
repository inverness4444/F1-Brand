import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Распродажа",
  path: "/sale",
  description:
    "Раздел распродажи Apex Store для отобранных позиций со скидкой, когда такие товары доступны в текущем каталоге.",
});

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
