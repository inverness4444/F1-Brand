import type { Metadata } from "next";

import { uniqueImageSources } from "@/lib/image-utils";
import {
  categoryLabelRu,
  colorLabelRu,
  getCollectionLabel,
  getProductCategoryBreadcrumb,
  getProductDisplayName,
  productTypeLabelRu,
} from "@/lib/storefront-text";
import type { Driver, Legend, Product, Team } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const siteName = "Velocity Club";
export const defaultOgImage = "/og-default.jpg";
export const siteUrlFallback = "https://velocityclub.ru";
export const priceCurrency = "RUB";

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  absoluteTitle?: boolean;
  index?: boolean;
  follow?: boolean;
};

type BreadcrumbItem = {
  name: string;
  path?: string;
};

type FAQItem = {
  question: string;
  answer: string;
};

function normalizeSiteUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return siteUrlFallback;
  }
}

function booleanEnv(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (["1", "true", "yes"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no"].includes(value.toLowerCase())) {
    return false;
  }

  return null;
}

export function publicPagesAreIndexable() {
  const explicitValue = booleanEnv(process.env.NEXT_PUBLIC_SITE_INDEXABLE ?? process.env.SITE_INDEXABLE);

  if (explicitValue !== null) {
    return explicitValue;
  }

  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  return true;
}

export function publicRobots(index = true, follow = true): Metadata["robots"] {
  const environmentIndexable = publicPagesAreIndexable();
  const shouldIndex = index && environmentIndexable;
  const shouldFollow = follow && environmentIndexable;

  return {
    index: shouldIndex,
    follow: shouldFollow,
    googleBot: {
      index: shouldIndex,
      follow: shouldFollow,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function privateRobots(): Metadata["robots"] {
  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  };
}

export function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return rawSiteUrl ? normalizeSiteUrl(rawSiteUrl) : siteUrlFallback;
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path.startsWith("/") ? path : `/${path}`, getSiteUrl()).toString();
}

export function sanitizeMotorsportSeoText(value: string) {
  return value
    .replace(/\bFormula\s*1\b/gi, "гоночной культурой")
    .replace(/\bF1\b/g, "racing-inspired")
    .replace(/\bofficial-store\b/gi, "premium retail")
    .replace(/\bofficial\s+store\b/gi, "premium retail")
    .replace(/\bofficial\s+teamwear\b/gi, "premium teamwear")
    .replace(/\bofficial\b/gi, "premium")
    .replace(/официальн(?:ый|ого|ом|ая|ую|ые|ых|ыми)? магазин(?:а|е|ом)?/gi, "премиального спортивного магазина")
    .replace(/официальн(?:ый|ого|ом|ая|ую|ые|ых|ыми)? мерч/gi, "мерч в стиле автоспорта")
    .replace(/официальн(?:ая|ую|ые|ых|ыми|ый|ого|ом)? коллекци(?:я|ю|и|й)/gi, "racing-inspired коллекция");
}

export function cleanText(value: string, maxLength = 180) {
  const normalized = sanitizeMotorsportSeoText(value)
    .replace(/\.{2,}/g, ".")
    .replace(/\s+([.,:;!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength - 1);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  return `${truncated.slice(0, lastSpaceIndex > 80 ? lastSpaceIndex : truncated.length).trim()}…`;
}

export function fullTitle(title: string) {
  return title === siteName || title.endsWith(`| ${siteName}`) ? title : `${title} | ${siteName}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  image = defaultOgImage,
  absoluteTitle = false,
  index = true,
  follow = true,
}: MetadataInput): Metadata {
  const cleanTitle = cleanText(title, 80);
  const cleanDescription = cleanText(description, 200);
  const metadataTitle = absoluteTitle ? { absolute: cleanTitle } : cleanTitle;
  const socialTitle = absoluteTitle ? cleanTitle : fullTitle(cleanTitle);
  const socialImage = image || defaultOgImage;

  return {
    title: metadataTitle,
    description: cleanDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: socialTitle,
      description: cleanDescription,
      url: path,
      siteName,
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: socialImage,
          alt: socialTitle,
          width: socialImage === defaultOgImage ? 1200 : undefined,
          height: socialImage === defaultOgImage ? 630 : undefined,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: cleanDescription,
      images: [socialImage],
    },
    robots: publicRobots(index, follow),
  };
}

export function createPrivateMetadata(title: string): Metadata {
  return {
    title,
    robots: privateRobots(),
  };
}

function isPlaceholderDescription(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  return (
    !normalized ||
    normalized === "опишите материал, посадку и особенности модели." ||
    normalized === "короткое описание товара для каталога."
  );
}

function joinNonEmpty(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim())).join(". ");
}

function getProductNameWithType(product: Product) {
  const typeLabel = productTypeLabelRu[product.type];
  const productName = product.name.trim();

  return productName.toLocaleLowerCase("ru-RU").includes(typeLabel.toLocaleLowerCase("ru-RU"))
    ? productName
    : `${typeLabel} ${productName}`;
}

export function productSeoImage(product: Product) {
  if (product.image && (product.image.startsWith("/") || /^https?:\/\//i.test(product.image))) {
    return product.image;
  }

  return defaultOgImage;
}

export function buildProductSeoDescription(product: Product) {
  const entity = product.driverName ?? product.teamName ?? product.legendName;
  const entityText = entity ? `Связано с ${entity}` : null;
  const collectionText = product.collection ? `Коллекция: ${getCollectionLabel(product.collection)}` : null;
  const colorText = product.colors.length
    ? `Цвета на товаре: ${product.colors.map((color) => colorLabelRu[color]).join(", ")}`
    : null;
  const colorwayText = product.colorways?.length
    ? `Расцветки: ${product.colorways.map((color) => colorLabelRu[color]).join(", ")}`
    : null;
  const sizeText = product.sizes.length ? `Размеры: ${product.sizes.join(", ")}` : null;
  const realDescription = !isPlaceholderDescription(product.description)
    ? product.description
    : !isPlaceholderDescription(product.shortDescription)
      ? product.shortDescription
      : null;

  return cleanText(
    joinNonEmpty([
      realDescription,
      getProductNameWithType(product),
      `Раздел: ${categoryLabelRu[product.category]}`,
      entityText,
      collectionText,
      colorText,
      colorwayText,
      sizeText,
      `Цена: ${formatPrice(product.price)}`,
    ]),
    260,
  );
}

export function buildProductMetadata(product: Product) {
  const path = `/product/${product.slug}`;
  const breadcrumb = getProductCategoryBreadcrumb(product);

  return createPageMetadata({
    title: cleanText(`${getProductDisplayName(product)} — ${breadcrumb.label}`, 70),
    description: buildProductSeoDescription(product),
    path,
    image: productSeoImage(product),
  });
}

export function buildCollectionDescription({
  title,
  products,
  fallback,
}: {
  title: string;
  products: Product[];
  fallback: string;
}) {
  if (products.length === 0) {
    return fallback;
  }

  const productTypes = [...new Set(products.map((product) => productTypeLabelRu[product.type]))].slice(0, 5);
  const collections = [...new Set(products.map((product) => product.collection).filter(Boolean))].slice(0, 4);
  const entities = [
    ...new Set(
      products
        .flatMap((product) => [product.driverName, product.teamName, product.legendName])
        .filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 5);

  return cleanText(
    joinNonEmpty([
      `${title}: ${products.length} товаров в каталоге ${siteName}`,
      "Одежда в гоночном стиле, motorsport-inspired apparel, футболки, худи, streetwear и мерч для фанатов автоспорта",
      productTypes.length ? `Типы товаров: ${productTypes.join(", ")}` : null,
      collections.length ? `Коллекции: ${collections.join(", ")}` : null,
      entities.length ? `Связанные пилоты, команды и легенды: ${entities.join(", ")}` : null,
    ]),
    240,
  );
}

export function getTeamDescriptionForSeo(team: Team, products: Product[]) {
  return buildCollectionDescription({
    title: `Коллекция ${team.name}`,
    products,
    fallback: team.label,
  });
}

export function getDriverDescriptionForSeo(driver: Driver, products: Product[]) {
  return buildCollectionDescription({
    title: `Коллекция ${driver.name}`,
    products,
    fallback: driver.label,
  });
}

export function getLegendDescriptionForSeo(legend: Legend, products: Product[]) {
  return buildCollectionDescription({
    title: `Коллекция ${legend.name}`,
    products,
    fallback: `${legend.label} Эра: ${legend.era}.`,
  });
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/velocity-logo.png"),
    email: "velocityclub@mail.ru",
    sameAs: [
      "https://t.me/f1velocityclub",
      "https://vk.ru/f1velocityclub",
      "https://www.tiktok.com/@f1velocityclub",
      "https://www.instagram.com/f1velocityclub",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/shop")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function webPageJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description: cleanText(description, 220),
    url: absoluteUrl(path),
    inLanguage: "ru-RU",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
    },
  };
}

export function productJsonLd(product: Product) {
  const availability =
    product.badge === "OutOfStock"
      ? "https://schema.org/OutOfStock"
      : product.badge === "Preorder"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";

  const schemaImages = uniqueImageSources(product.gallery.length ? product.gallery : [productSeoImage(product)])
    .filter((image) => image && (image.startsWith("/") || /^https?:\/\//i.test(image)))
    .map((image) => absoluteUrl(image));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: schemaImages.length ? schemaImages : [absoluteUrl(defaultOgImage)],
    description: buildProductSeoDescription(product),
    brand: {
      "@type": "Brand",
      name: siteName,
    },
    sku: product.id,
    category: categoryLabelRu[product.category],
    url: absoluteUrl(`/product/${product.slug}`),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency,
      price: product.price,
      availability,
    },
  };
}

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function faqJsonLd(items: readonly FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

const nonCanonicalQueryKeys = new Set([
  "category",
  "team",
  "driver",
  "legend",
  "collection",
  "type",
  "color",
  "size",
  "minPrice",
  "maxPrice",
  "sort",
  "q",
  "page",
]);

export function hasNonCanonicalSearchParams(params: Record<string, string | string[] | undefined>) {
  return Object.entries(params).some(([key, value]) => {
    if (!nonCanonicalQueryKeys.has(key)) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.some((entry) => entry.trim().length > 0);
    }

    return Boolean(value?.trim());
  });
}
