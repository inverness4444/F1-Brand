"use client";

import { create } from "zustand";

import { createEntityId } from "@/lib/account-utils";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastState = {
  items: ToastItem[];
  pushToast: (message: string, tone?: ToastTone) => string;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  pushToast: (message, tone = "success") => {
    const id = createEntityId("toast");
    set((state) => ({
      items: [...state.items, { id, message, tone }],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
