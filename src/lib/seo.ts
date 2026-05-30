import type { Metadata } from "next";

import { uniqueImageSources } from "@/lib/image-utils";
import {
  categoryLabelRu,
  colorLabelRu,
  getCollectionLabel,
  productTypeLabelRu,
} from "@/lib/storefront-text";
import type { Driver, Legend, Product, Team } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const siteName = "Apex Store";
export const defaultOgImage = "/apex-logo-preview.png";
export const siteUrlFallback = "http://localhost:3000";
export const priceCurrency = "RUB";

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  absoluteTitle?: boolean;
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

export function cleanText(value: string, maxLength = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();

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
}: MetadataInput): Metadata {
  const cleanDescription = cleanText(description, 200);
  const metadataTitle = absoluteTitle ? { absolute: title } : title;
  const socialTitle = absoluteTitle ? title : fullTitle(title);
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
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: cleanDescription,
      images: [socialImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function createPrivateMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
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

  return createPageMetadata({
    title: product.name,
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
    logo: absoluteUrl("/apex-logo.png"),
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

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
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

export function faqJsonLd(items: FAQItem[]) {
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
