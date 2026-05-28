"use client";

import { useEffect } from "react";

import { STORAGE_EVENT_NAME, storageKeys } from "@/lib/browser-storage";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider() {
  const initialize = useAuthStore((state) => state.initialize);
  const refresh = useAuthStore((state) => state.refresh);

  useEffect(() => {
    void initialize();

    const handleStorage = (event: Event) => {
      if (event instanceof StorageEvent) {
        const authKeys = [
          storageKeys.currentUser,
          storageKeys.currentSessionId,
          storageKeys.sessions,
        ];

        if (event.key && !authKeys.includes(event.key as (typeof authKeys)[number])) {
          return;
        }
      }

      if (event instanceof CustomEvent) {
        const entity = (event.detail as { entity?: string } | undefined)?.entity;

        if (entity && entity !== "auth") {
          return;
        }
      }

      void refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);
    };
  }, [initialize, refresh]);

  return null;
}
