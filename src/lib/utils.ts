import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Product } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPrice(price: number) {
  return formatCurrency(price);
}

const cyrillicToLatinMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};
const generatedProductSlugPattern = /^custom-\d+(?:-\d+)?$/;

function transliterateCyrillic(value: string) {
  return value.replace(/[а-яё]/gi, (letter) => cyrillicToLatinMap[letter.toLowerCase()] ?? "");
}

export function slugify(value: string) {
  return transliterateCyrillic(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function isGeneratedProductSlug(slug: string, id?: string) {
  const normalizedSlug = slugify(slug);

  return !normalizedSlug || normalizedSlug === id || generatedProductSlugPattern.test(normalizedSlug);
}

function createUniqueSlug(base: string, taken: Set<string>) {
  const normalizedBase = slugify(base) || "product";

  if (!taken.has(normalizedBase) && !generatedProductSlugPattern.test(normalizedBase)) {
    return normalizedBase;
  }

  let index = 2;
  let candidate = `${normalizedBase}-${index}`;

  while (taken.has(candidate) || generatedProductSlugPattern.test(candidate)) {
    index += 1;
    candidate = `${normalizedBase}-${index}`;
  }

  return candidate;
}

export function createProductSeoSlug(
  product: Pick<
    Product,
    "id" | "name" | "collection" | "driverName" | "teamName" | "legendName" | "type" | "price"
  >,
  existingProducts: Array<Pick<Product, "id" | "slug">> = [],
) {
  const takenSlugs = new Set(
    existingProducts
      .filter((item) => item.id !== product.id)
      .map((item) => slugify(item.slug))
      .filter(Boolean),
  );
  const entityName = product.driverName ?? product.teamName ?? product.legendName ?? "";
  const candidates = [
    product.name,
    [product.name, product.collection].filter(Boolean).join(" "),
    [product.name, entityName].filter(Boolean).join(" "),
    [product.name, product.collection, product.price].filter(Boolean).join(" "),
    [product.type, product.name, product.price].filter(Boolean).join(" "),
    [product.type, product.price].filter(Boolean).join(" "),
  ]
    .map(slugify)
    .filter((candidate) => candidate && !generatedProductSlugPattern.test(candidate));

  const availableCandidate = candidates.find((candidate) => !takenSlugs.has(candidate));

  return availableCandidate ?? createUniqueSlug(candidates[0] ?? product.type, takenSlugs);
}

export function getProductHref(product: Pick<Product, "id" | "slug">) {
  return `/product/${product.slug}`;
}
