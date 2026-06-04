"use client";

import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/services/analytics-service";

export function HeroCtaLink() {
  return (
    <Link
      href="/shop"
      onClick={() => {
        trackAnalyticsEvent({
          eventType: "hero_cta_click",
          entityType: "section",
          entityId: "hero",
          entityName: "Hero",
          metadata: {
            target: "/shop",
          },
        });
        trackAnalyticsEvent({
          eventType: "section_click",
          entityType: "section",
          entityId: "all-products",
          entityName: "Все товары",
          metadata: {
            source: "hero",
          },
        });
      }}
      className={buttonClassName({
        variant: "secondary",
        className:
          "w-full justify-center rounded-full border-white/70 bg-white/8 text-white backdrop-blur hover:border-white hover:bg-white/14 hover:text-white sm:w-auto sm:min-w-[220px]",
      })}
    >
      Смотреть все товары
    </Link>
  );
}
