"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useCartStore } from "@/store/cart-store";

const LazyCartDrawer = dynamic(
  () => import("@/components/cart-drawer").then((module) => module.CartDrawer),
  { ssr: false },
);

export function CartDrawerMount() {
  const isOpen = useCartStore((state) => state.isOpen);
  const [shouldLoadDrawer, setShouldLoadDrawer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldLoadDrawer(true);
    }
  }, [isOpen]);

  return shouldLoadDrawer ? <LazyCartDrawer /> : null;
}
