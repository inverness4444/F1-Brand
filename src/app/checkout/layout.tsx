import type { Metadata } from "next";

import { createPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivateMetadata("Оформление заказа");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
