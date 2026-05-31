import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account",
        "/account/",
        "/admin",
        "/admin/",
        "/cart",
        "/cart/",
        "/checkout",
        "/checkout/",
        "/login",
        "/register",
        "/forgot-password",
        "/orders",
        "/orders/",
        "/profile",
        "/profile/",
        "/settings",
        "/settings/",
        "/debug",
        "/debug/",
        "/test",
        "/test/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(getSiteUrl()).host,
  };
}
