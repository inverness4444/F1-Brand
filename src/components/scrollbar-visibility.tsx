"use client";

import { useEffect } from "react";

const SCROLLING_CLASS_NAME = "is-scrolling";
const SCROLL_IDLE_TIMEOUT_MS = 180;

export function ScrollbarVisibility() {
  useEffect(() => {
    let timeoutId: number | null = null;

    const showScrollbar = () => {
      document.documentElement.classList.add(SCROLLING_CLASS_NAME);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        document.documentElement.classList.remove(SCROLLING_CLASS_NAME);
      }, SCROLL_IDLE_TIMEOUT_MS);
    };

    window.addEventListener("scroll", showScrollbar, { passive: true });

    return () => {
      window.removeEventListener("scroll", showScrollbar);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      document.documentElement.classList.remove(SCROLLING_CLASS_NAME);
    };
  }, []);

  return null;
}
