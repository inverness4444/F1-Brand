"use client";

import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { CartDrawer } from "@/components/cart-drawer";
import { ToastViewport } from "@/components/toast-viewport";

export function Providers({ children }: PropsWithChildren) {
  return (
    <>
      <AuthProvider />
      {children}
      <CartDrawer />
      <ToastViewport />
    </>
  );
}
