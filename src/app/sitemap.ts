import type { MetadataRoute } from "next";

import { drivers, legends, teams } from "@/lib/data/roster";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const infoPages = [
  "/about",
  "/delivery",
  "/returns",
  "/contacts",
  "/faq",
  "/privacy",
  "/terms",
  "/offer",
] as const;

const publicStaticPages = [
  "/",
  "/shop",
  "/new",
  "/teams",
  "/pilots",
  "/legends",
  "/accessories",
  "/gift-cards",
  "/sale",
  ...infoPages,
] as const;

function latestDate(products: Array<{ createdAt: string }>) {
  const latestTimestamp = products.reduce((latest, product) => {
    const timestamp = new Date(product.createdAt).getTime();

    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);

  return latestTimestamp > 0 ? new Date(latestTimestamp) : new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await readCatalogProductsFromDb();
  const catalogLastModified = latestDate(products);
  const productTeamSlugs = new Set(products.map((product) => product.teamSlug).filter(Boolean));
  const productDriverSlugs = new Set(products.map((product) => product.driverSlug).filter(Boolean));
  const productLegendSlugs = new Set(products.map((product) => product.legendSlug).filter(Boolean));

  const staticEntries: MetadataRoute.Sitemap = publicStaticPages.map((path) => ({
    url: absoluteUrl(path),
    lastModified: catalogLastModified,
    changeFrequency: path === "/" || path === "/shop" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : infoPages.includes(path as (typeof infoPages)[number]) ? 0.5 : 0.75,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: new Date(product.createdAt),
    changeFrequency: "weekly",
    priority: product.badge === "OutOfStock" ? 0.45 : 0.8,
  }));

  const teamEntries: MetadataRoute.Sitemap = teams
    .filter((team) => productTeamSlugs.has(team.slug))
    .map((team) => ({
      url: absoluteUrl(`/teams/${team.slug}`),
      lastModified: catalogLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const driverEntries: MetadataRoute.Sitemap = drivers
    .filter((driver) => productDriverSlugs.has(driver.slug))
    .map((driver) => ({
      url: absoluteUrl(`/pilots/${driver.slug}`),
      lastModified: catalogLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const legendEntries: MetadataRoute.Sitemap = legends
    .filter((legend) => productLegendSlugs.has(legend.slug))
    .map((legend) => ({
      url: absoluteUrl(`/legends/${legend.slug}`),
      lastModified: catalogLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [
    ...staticEntries,
    ...teamEntries,
    ...driverEntries,
    ...legendEntries,
    ...productEntries,
  ];
}
