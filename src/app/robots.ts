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
        "/checkout",
        "/checkout/",
        "/login",
        "/register",
        "/forgot-password",
        "/debug",
        "/debug/",
        "/test",
        "/test/",
        "/*?category=",
        "/*?team=",
        "/*?driver=",
        "/*?legend=",
        "/*?collection=",
        "/*?type=",
        "/*?color=",
        "/*?size=",
        "/*?minPrice=",
        "/*?maxPrice=",
        "/*?sort=",
        "/*?q=",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(getSiteUrl()).host,
  };
}
