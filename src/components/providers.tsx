"use client";

import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { CartDrawerMount } from "@/components/cart-drawer-mount";
import { ToastViewport } from "@/components/toast-viewport";

export function Providers({ children }: PropsWithChildren) {
  return (
    <>
      <AuthProvider />
      {children}
      <CartDrawerMount />
      <ToastViewport />
    </>
  );
}
