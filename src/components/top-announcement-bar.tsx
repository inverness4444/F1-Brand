"use client";

import { useEffect, useState } from "react";

import { topBarItems } from "@/lib/data/storefront";

export function TopAnnouncementBar() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % topBarItems.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="bg-black text-white">
      <div className="container-shell flex h-9 items-center justify-center overflow-hidden">
        <div className="hidden flex-wrap items-center justify-center gap-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] md:flex">
          {topBarItems.map((item) => (
            <span key={item} className="inline-flex items-center gap-5">
              <span>{item}</span>
              <span className="last:hidden">•</span>
            </span>
          ))}
        </div>
        <p className="w-full truncate whitespace-nowrap text-center text-[0.68rem] font-semibold uppercase tracking-[0.18em] md:hidden">
          {topBarItems[activeIndex]}
        </p>
      </div>
    </div>
  );
}
