"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect } from "react";

import type { ToastTone } from "@/store/toast-store";
import { useToastStore } from "@/store/toast-store";

const toneMap: Record<
  ToastTone,
  { icon: typeof CircleCheck; className: string }
> = {
  success: {
    icon: CircleCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  error: {
    icon: CircleAlert,
    className: "border-red-200 bg-red-50 text-red-900",
  },
  info: {
    icon: Info,
    className: "border-slate-200 bg-white text-slate-900",
  },
};

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(() => {
        removeToast(item.id);
      }, 3200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, removeToast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        {items.map((item) => {
            const { icon: Icon, className } = toneMap[item.tone];

            return (
              <div
                key={item.id}
                className={`animate-toast-in pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg ${className}`}
              >
                <Icon className="size-5 shrink-0" />
                <p className="min-w-0 flex-1 text-sm font-medium">{item.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(item.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-current/70 transition hover:bg-black/5 hover:text-current"
                >
                  <X className="size-4" />
                </button>
              </div>
            );
        })}
      </div>
    </div>
  );
}
