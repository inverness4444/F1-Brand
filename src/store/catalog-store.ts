"use client";

import { create } from "zustand";

import { drivers, legends, teams } from "@/lib/data/roster";
import {
  createDefaultProductDescription,
  imageByType,
  sizesByType,
} from "@/lib/data/products";
import recoveredCatalogProductsData from "@/lib/data/recovered-products.json";
import type {
  CatalogCategory,
  FeaturedCollection,
  Product,
  ProductBadge,
  ProductColor,
  ProductGender,
  ProductSize,
  ProductType,
} from "@/lib/types";
import {
  buildCsrfHeaders,
  sanitizeAssetUrl,
  sanitizeHexColor,
  sanitizeIdentifier,
  sanitizeText,
  SECURITY_LIMITS,
} from "@/lib/security-utils";
import { catalogProductsPayloadSchema } from "@/lib/validation-schemas";
import { clamp, slugify } from "@/lib/utils";

const validCategories: CatalogCategory[] = ["Pilots", "Teams", "Legends", "Essentials", "Gifts"];
const validCollections: FeaturedCollection[] = [
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
];
const validBadges: ProductBadge[] = ["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale"];
const validTypes: ProductType[] = [
  "T-shirt",
  "Hoodie",
  "Longsleeve",
  "Jacket",
  "Polo",
  "Pants",
  "Scarf",
  "Lego",
  "Cap",
  "Accessory",
  "Calendar",
  "Poster",
  "Gift Certificate",
];
const validSizes: ProductSize[] = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const validGenders: ProductGender[] = ["Men", "Women", "Unisex"];

const driverMap = new Map(drivers.map((driver) => [driver.name, driver] as const));
const teamMap = new Map(teams.map((team) => [team.name, team] as const));
const legendMap = new Map(legends.map((legend) => [legend.name, legend] as const));

function sortProductsByName(products: Product[]) {
  return [...products].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function uniqueValues<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function createUniqueValue(base: string, taken: string[]) {
  const normalizedBase = base.trim();

  if (!taken.includes(normalizedBase)) {
    return normalizedBase;
  }

  let index = 2;
  while (taken.includes(`${normalizedBase}-${index}`)) {
    index += 1;
  }

  return `${normalizedBase}-${index}`;
}

function deriveCollectionTags(
  badge: ProductBadge,
  collection: FeaturedCollection,
  createdAt: string,
  explicitTags: FeaturedCollection[] = [],
) {
  const tags = new Set<FeaturedCollection>([collection, ...explicitTags]);

  if (badge === "Sale") {
    tags.add("Sale");
  }

  if (badge === "New" || createdAt >= "2026-04-01") {
    tags.add("New Arrivals");
  }

  return [...tags];
}

function normalizeGallery(images: string[], image: string) {
  const cleaned = uniqueValues(
    images
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return cleaned.length > 0 ? cleaned : [image];
}

export function normalizeProduct(product: Product, existingProducts: Product[] = []) {
  const category = validCategories.includes(product.category) ? product.category : "Essentials";
  const type = validTypes.includes(product.type) ? product.type : "T-shirt";
  const name =
    sanitizeText(product.name ?? "", {
      maxLength: SECURITY_LIMITS.catalogNameMaxLength,
    }) || "New Product";
  const gender = validGenders.includes(product.gender) ? product.gender : "Unisex";
  const collection = validCollections.includes(product.collection) ? product.collection : "Essentials";
  const baseId = sanitizeIdentifier(product.id ?? "", slugify(name) || `product-${Date.now()}`);
  const id = createUniqueValue(
    baseId,
    existingProducts.map((item) => item.id),
  );
  const slug = createUniqueValue(
    sanitizeIdentifier(product.slug ?? "", slugify(id || name) || `product-${Date.now()}`),
    existingProducts.map((item) => item.slug),
  );

  let driverName =
    sanitizeText(product.driverName ?? "", {
      maxLength: SECURITY_LIMITS.catalogMetadataMaxLength,
    }) || null;
  let teamName =
    sanitizeText(product.teamName ?? "", {
      maxLength: SECURITY_LIMITS.catalogMetadataMaxLength,
    }) || null;
  let legendName =
    sanitizeText(product.legendName ?? "", {
      maxLength: SECURITY_LIMITS.catalogMetadataMaxLength,
    }) || null;

  if (category === "Pilots" && driverName) {
    const driver = driverMap.get(driverName);
    teamName = driver?.teamName ?? teamName;
    legendName = null;
  }

  if (category === "Teams" && teamName) {
    driverName = null;
    legendName = null;
  }

  if (category === "Legends" && legendName) {
    driverName = null;
    teamName = null;
  }

  if (category === "Essentials" || category === "Gifts") {
    driverName = null;
    teamName = null;
    legendName = null;
  }

  const driver = driverName ? driverMap.get(driverName) : undefined;
  const team = teamName ? teamMap.get(teamName) : undefined;
  const legend = legendName ? legendMap.get(legendName) : undefined;

  const colors =
    product.colors.length > 0
      ? product.colors
      : driver?.colors ?? team?.colors ?? legend?.colors ?? (["Black", "Beige"] as ProductColor[]);
  const image = sanitizeAssetUrl(product.image ?? "") || imageByType[type];
  const createdAt = isValidDate(product.createdAt) ? new Date(product.createdAt).toISOString() : new Date().toISOString();
  const description =
    sanitizeText(product.description ?? "", {
      maxLength: SECURITY_LIMITS.catalogDescriptionMaxLength,
      allowLineBreaks: true,
    }) ||
    createDefaultProductDescription({
      name,
      category,
    });

  return {
    ...product,
    id,
    slug,
    name,
    category,
    collection,
    collectionTags: deriveCollectionTags(badgeValue(product.badge), collection, createdAt, product.collectionTags),
    driverName,
    driverSlug: driver?.slug ?? null,
    teamName,
    teamSlug: team?.slug ?? driver?.teamSlug ?? null,
    legendName,
    legendSlug: legend?.slug ?? null,
    gender,
    price: Number.isFinite(product.price) ? Math.max(0, Math.round(product.price)) : 2990,
    productType: product.type === "Gift Certificate" ? "gift_certificate" : product.productType ?? "standard",
    requiresShipping: product.type === "Gift Certificate" ? false : product.requiresShipping ?? true,
    colors,
    sizes:
      product.sizes.length > 0
        ? uniqueValues(product.sizes.filter((size): size is ProductSize => validSizes.includes(size)))
        : sizesByType[type],
    type,
    badge: badgeValue(product.badge),
    image,
    gallery: normalizeGallery(product.gallery ?? [], image),
    description,
    shortDescription:
      sanitizeText(product.shortDescription ?? "", {
        maxLength: SECURITY_LIMITS.catalogShortDescriptionMaxLength,
      }) || description,
    popularity: Number.isFinite(product.popularity)
      ? clamp(Math.round(product.popularity), 1, 100)
      : 75,
    createdAt,
    number: driver?.number ?? product.number,
    hexPalette:
      product.hexPalette.length > 0
        ? product.hexPalette.map((value) => sanitizeHexColor(value))
        : driver?.hexPalette ?? team?.hexPalette ?? legend?.hexPalette ?? ["#111111", "#d7c8b7", "#ece4d7"],
  } satisfies Product;
}

function badgeValue(badge: ProductBadge) {
  return validBadges.includes(badge) ? badge : "New";
}

export function createProductDraft(existingProducts: Product[] = []) {
  return normalizeProduct(
    {
      id: `custom-${Date.now()}`,
      slug: "",
      name: "Новый товар",
      category: "Essentials",
      collection: "Essentials",
      collectionTags: ["Essentials", "New Arrivals"],
      driverName: null,
      driverSlug: null,
      teamName: null,
      teamSlug: null,
      legendName: null,
      legendSlug: null,
      gender: "Unisex",
      price: 2990,
      productType: "standard",
      requiresShipping: true,
      colors: ["Black", "White"],
      sizes: sizesByType["T-shirt"],
      type: "T-shirt",
      badge: "New",
      image: imageByType["T-shirt"],
      gallery: [imageByType["T-shirt"]],
      shortDescription: "Короткое описание товара для каталога.",
      description: "Опишите материал, посадку и особенности модели.",
      popularity: 75,
      createdAt: new Date().toISOString(),
      hexPalette: ["#111111", "#d7c8b7", "#ece4d7"],
    },
    existingProducts,
  );
}

function normalizeProductCollection(products: Product[]) {
  return sortProductsByName(
    products.reduce<Product[]>((result, product) => {
      result.push(normalizeProduct(product, result));
      return result;
    }, []),
  );
}

function resolveCatalogProducts(products?: Product[]) {
  if (!products) {
    return normalizedRecoveredProducts;
  }

  if (products.length === 0) {
    return [];
  }

  return normalizeProductCollection(products);
}

type CatalogState = {
  products: Product[];
  hasHydrated: boolean;
  initializeCatalog: () => Promise<void>;
  upsertProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  replaceProducts: (products: Product[]) => Promise<void>;
  resetProducts: () => Promise<void>;
};

const normalizedRecoveredProducts = normalizeProductCollection(recoveredCatalogProductsData as Product[]);
let initializeCatalogPromise: Promise<void> | null = null;
let saveCatalogQueue: Promise<void> = Promise.resolve();

async function fetchCatalogProductsFromServer() {
  const response = await fetch("/api/catalog", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить каталог.");
  }

  const payload = catalogProductsPayloadSchema.parse(await response.json());
  return payload.products;
}

async function saveCatalogProductsToServer(products: Product[]) {
  const response = await fetch("/api/catalog", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    body: JSON.stringify({
      products,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось сохранить каталог.");
  }
}

function cloneProductsSnapshot(products: Product[]) {
  return JSON.parse(JSON.stringify(products)) as Product[];
}

function enqueueCatalogSave(products: Product[]) {
  const snapshot = cloneProductsSnapshot(products);

  saveCatalogQueue = saveCatalogQueue
    .catch(() => undefined)
    .then(() => saveCatalogProductsToServer(snapshot));

  return saveCatalogQueue;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: normalizedRecoveredProducts,
  hasHydrated: false,
  initializeCatalog: async () => {
    if (get().hasHydrated) {
      return;
    }

    if (initializeCatalogPromise) {
      await initializeCatalogPromise;
      return;
    }

    initializeCatalogPromise = (async () => {
      try {
        const serverProducts = await fetchCatalogProductsFromServer();

        set({
          products: resolveCatalogProducts(serverProducts),
          hasHydrated: true,
        });
      } catch {
        console.error("Failed to initialize catalog from server.");
        set({
          products: normalizedRecoveredProducts,
          hasHydrated: true,
        });
      } finally {
        initializeCatalogPromise = null;
      }
    })();

    await initializeCatalogPromise;
  },
  upsertProduct: async (product) => {
    let nextProducts: Product[] = [];

    set((state) => {
      const otherProducts = state.products.filter((item) => item.id !== product.id);
      const normalized = normalizeProduct(product, otherProducts);
      nextProducts = sortProductsByName([...otherProducts, normalized]);

      return {
        products: nextProducts,
      };
    });

    await enqueueCatalogSave(nextProducts);
  },
  removeProduct: async (productId) => {
    let nextProducts: Product[] = [];

    set((state) => {
      nextProducts = state.products.filter((product) => product.id !== productId);

      return {
        products: nextProducts,
      };
    });

    await enqueueCatalogSave(nextProducts);
  },
  replaceProducts: async (products) => {
    const nextProducts = normalizeProductCollection(catalogProductsPayloadSchema.parse({ products }).products);

    set({
      products: nextProducts,
    });

    await enqueueCatalogSave(nextProducts);
  },
  resetProducts: async () => {
    set({
      products: normalizedRecoveredProducts,
    });

    await enqueueCatalogSave(normalizedRecoveredProducts);
  },
}));
