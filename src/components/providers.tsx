"use client";

import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { CartDbSync } from "@/components/cart-db-sync";
import { CartDrawerMount } from "@/components/cart-drawer-mount";
import { ToastViewport } from "@/components/toast-viewport";

export function Providers({ children }: PropsWithChildren) {
  return (
    <>
      <AuthProvider />
      <CartDbSync />
      {children}
      <CartDrawerMount />
      <ToastViewport />
    </>
  );
}
