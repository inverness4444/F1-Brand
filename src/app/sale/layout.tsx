import type { Metadata } from "next";

import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const products = await readCatalogProductsFromDb();
  const saleProducts = products.filter((product) => product.badge === "Sale" || product.collectionTags.includes("Sale"));

  return createPageMetadata({
    title: "Распродажа одежды в стиле автоспорта",
    path: "/sale",
    description:
      "Распродажа Apex Store: одежда и аксессуары в гоночном стиле со скидками, если такие позиции доступны в текущем каталоге.",
    index: saleProducts.length > 0,
  });
}

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
