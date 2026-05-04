"use client";

import { useEffect } from "react";

const COUNT_KEY = "scrollLockCount";
const OVERFLOW_KEY = "scrollLockOverflow";
const POSITION_KEY = "scrollLockPosition";
const TOP_KEY = "scrollLockTop";
const LEFT_KEY = "scrollLockLeft";
const RIGHT_KEY = "scrollLockRight";
const WIDTH_KEY = "scrollLockWidth";
const HTML_OVERSCROLL_KEY = "scrollLockHtmlOverscroll";
const SCROLL_Y_KEY = "scrollLockScrollY";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const activeCount = Number(body.dataset[COUNT_KEY] ?? "0");

    if (activeCount === 0) {
      body.dataset[OVERFLOW_KEY] = body.style.overflow;
      body.dataset[POSITION_KEY] = body.style.position;
      body.dataset[TOP_KEY] = body.style.top;
      body.dataset[LEFT_KEY] = body.style.left;
      body.dataset[RIGHT_KEY] = body.style.right;
      body.dataset[WIDTH_KEY] = body.style.width;
      body.dataset[HTML_OVERSCROLL_KEY] = documentElement.style.overscrollBehavior;
      body.dataset[SCROLL_Y_KEY] = String(window.scrollY);

      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${window.scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      documentElement.style.overscrollBehavior = "none";
    }

    body.dataset[COUNT_KEY] = String(activeCount + 1);

    return () => {
      const nextCount = Math.max(0, Number(body.dataset[COUNT_KEY] ?? "1") - 1);

      if (nextCount > 0) {
        body.dataset[COUNT_KEY] = String(nextCount);
        return;
      }

      const savedScrollY = Number(body.dataset[SCROLL_Y_KEY] ?? "0");

      body.style.overflow = body.dataset[OVERFLOW_KEY] ?? "";
      body.style.position = body.dataset[POSITION_KEY] ?? "";
      body.style.top = body.dataset[TOP_KEY] ?? "";
      body.style.left = body.dataset[LEFT_KEY] ?? "";
      body.style.right = body.dataset[RIGHT_KEY] ?? "";
      body.style.width = body.dataset[WIDTH_KEY] ?? "";
      documentElement.style.overscrollBehavior = body.dataset[HTML_OVERSCROLL_KEY] ?? "";

      delete body.dataset[COUNT_KEY];
      delete body.dataset[OVERFLOW_KEY];
      delete body.dataset[POSITION_KEY];
      delete body.dataset[TOP_KEY];
      delete body.dataset[LEFT_KEY];
      delete body.dataset[RIGHT_KEY];
      delete body.dataset[WIDTH_KEY];
      delete body.dataset[HTML_OVERSCROLL_KEY];
      delete body.dataset[SCROLL_Y_KEY];

      window.scrollTo(0, savedScrollY);
    };
  }, [locked]);
}
