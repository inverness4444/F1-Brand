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
  CatalogCollection,
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
import { catalogPayloadSchema, catalogProductsPayloadSchema } from "@/lib/validation-schemas";
import { clamp, slugify } from "@/lib/utils";

const validCategories: CatalogCategory[] = ["Pilots", "Teams", "Legends", "Accessories", "Essentials", "Gifts"];
const internalProductTags = new Set(["New Arrivals", "Sale"]);
const legacySystemCollectionNames = new Set([
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
]);
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

function normalizeProductCollectionName(value: string) {
  const normalized = sanitizeText(value || "", {
    maxLength: SECURITY_LIMITS.catalogMetadataMaxLength,
  });

  return legacySystemCollectionNames.has(normalized) ? "" : normalized;
}

function normalizeRequiredCollectionName(value: string, fallback = "Новая коллекция") {
  return sanitizeText(value || fallback, {
    maxLength: SECURITY_LIMITS.catalogMetadataMaxLength,
  }) || fallback;
}

function normalizeCollection(collection: CatalogCollection, existingCollections: CatalogCollection[] = []) {
  const name = normalizeRequiredCollectionName(collection.name);
  const baseSlug = sanitizeIdentifier(collection.slug ?? "", slugify(name) || `collection-${Date.now()}`);
  const slug = createUniqueValue(
    baseSlug,
    existingCollections.map((item) => item.slug),
  );
  const id = createUniqueValue(
    sanitizeIdentifier(collection.id ?? "", slug || `collection-${Date.now()}`),
    existingCollections.map((item) => item.id),
  );

  return {
    ...collection,
    id,
    slug,
    name,
    productIds: uniqueValues((collection.productIds ?? []).map((value) => sanitizeIdentifier(value, "")).filter(Boolean)),
    createdAt: isValidDate(collection.createdAt) ? new Date(collection.createdAt).toISOString() : new Date().toISOString(),
  } satisfies CatalogCollection;
}

function normalizeCollectionList(collections: CatalogCollection[] = []) {
  return collections.reduce<CatalogCollection[]>((result, collection) => {
    if (legacySystemCollectionNames.has(normalizeRequiredCollectionName(collection.name))) {
      return result;
    }

    const existingByName = result.find((item) => item.name === collection.name);

    if (existingByName) {
      Object.assign(existingByName, {
        ...existingByName,
        ...normalizeCollection(collection, result.filter((item) => item.id !== existingByName.id)),
        id: existingByName.id,
        slug: existingByName.slug,
      });
      return result;
    }

    result.push(normalizeCollection(collection, result));
    return result;
  }, []);
}

function syncCollectionsWithProducts(collections: CatalogCollection[], products: Product[]) {
  return normalizeCollectionList(collections).map((collection) => {
    const matchingProductIds = products
      .filter((product) => product.collection === collection.name || product.collectionTags.includes(collection.name))
      .map((product) => product.id);

    return {
      ...collection,
      productIds: uniqueValues([...collection.productIds.filter((id) => products.some((product) => product.id === id)), ...matchingProductIds]),
    };
  });
}

function deriveCollectionTags(
  badge: ProductBadge,
  collection: FeaturedCollection,
  createdAt: string,
  explicitTags: FeaturedCollection[] = [],
) {
  const tags = new Set<FeaturedCollection>(
    explicitTags
      .map(normalizeProductCollectionName)
      .filter(Boolean),
  );
  const normalizedCollection = normalizeProductCollectionName(collection);

  if (normalizedCollection) {
    tags.add(normalizedCollection);
  }

  if (badge === "Sale") {
    tags.add("Sale");
  } else {
    tags.delete("Sale");
  }

  if (badge === "New" || createdAt >= "2026-04-01") {
    tags.add("New Arrivals");
  }

  return [...tags].filter((tag) => internalProductTags.has(tag) || !legacySystemCollectionNames.has(tag));
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
  const collection = normalizeProductCollectionName(product.collection);
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

  if (category === "Accessories" || category === "Essentials" || category === "Gifts") {
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
    collectionTags: deriveCollectionTags(
      badgeValue(product.badge),
      collection,
      createdAt,
      product.collectionTags,
    ),
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
  const driver = drivers[0];

  return normalizeProduct(
    {
      id: `custom-${Date.now()}`,
      slug: "",
      name: "Новый товар",
      category: "Pilots",
      collection: "",
      collectionTags: ["New Arrivals"],
      driverName: driver.name,
      driverSlug: null,
      teamName: driver.teamName,
      teamSlug: null,
      legendName: null,
      legendSlug: null,
      gender: "Unisex",
      price: 2990,
      productType: "standard",
      requiresShipping: true,
      colors: [...driver.colors],
      sizes: sizesByType["T-shirt"],
      type: "T-shirt",
      badge: "New",
      image: imageByType["T-shirt"],
      gallery: [imageByType["T-shirt"]],
      shortDescription: "Короткое описание товара для каталога.",
      description: "Опишите материал, посадку и особенности модели.",
      popularity: 75,
      createdAt: new Date().toISOString(),
      number: driver.number,
      hexPalette: [...driver.hexPalette],
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
  collections: CatalogCollection[];
  hasHydrated: boolean;
  initializeCatalog: () => Promise<void>;
  upsertProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  replaceProducts: (products: Product[]) => Promise<void>;
  upsertCollection: (collection: CatalogCollection) => Promise<void>;
  removeCollection: (collectionId: string) => Promise<void>;
  saveCollectionProducts: (collection: CatalogCollection, productIds: string[]) => Promise<void>;
  resetProducts: () => Promise<void>;
};

const normalizedRecoveredProducts = normalizeProductCollection(recoveredCatalogProductsData as Product[]);
const normalizedRecoveredCollections = syncCollectionsWithProducts([], normalizedRecoveredProducts);
let initializeCatalogPromise: Promise<void> | null = null;
let saveCatalogQueue: Promise<void> = Promise.resolve();

async function fetchCatalogProductsFromServer() {
  const response = await fetch("/api/catalog", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить каталог.");
  }

  return catalogPayloadSchema.parse(await response.json());
}

async function saveCatalogToServer(products: Product[], collections: CatalogCollection[]) {
  const response = await fetch("/api/catalog", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    body: JSON.stringify({
      products,
      collections,
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

function enqueueCatalogSave(products: Product[], collections: CatalogCollection[]) {
  const snapshot = cloneProductsSnapshot(products);
  const collectionsSnapshot = JSON.parse(JSON.stringify(collections)) as CatalogCollection[];

  saveCatalogQueue = saveCatalogQueue
    .catch(() => undefined)
    .then(() => saveCatalogToServer(snapshot, collectionsSnapshot));

  return saveCatalogQueue;
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  products: normalizedRecoveredProducts,
  collections: normalizedRecoveredCollections,
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
        const payload = await fetchCatalogProductsFromServer();
        const products = resolveCatalogProducts(payload.products);

        set({
          products,
          collections: syncCollectionsWithProducts(payload.collections, products),
          hasHydrated: true,
        });
      } catch {
        console.error("Failed to initialize catalog from server.");
        set({
          products: normalizedRecoveredProducts,
          collections: normalizedRecoveredCollections,
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
    let nextCollections: CatalogCollection[] = [];

    set((state) => {
      const otherProducts = state.products.filter((item) => item.id !== product.id);
      const normalized = normalizeProduct(product, otherProducts);
      nextProducts = sortProductsByName([...otherProducts, normalized]);
      nextCollections = syncCollectionsWithProducts(state.collections, nextProducts);

      return {
        products: nextProducts,
        collections: nextCollections,
      };
    });

    await enqueueCatalogSave(nextProducts, nextCollections);
  },
  removeProduct: async (productId) => {
    let nextProducts: Product[] = [];
    let nextCollections: CatalogCollection[] = [];

    set((state) => {
      nextProducts = state.products.filter((product) => product.id !== productId);
      nextCollections = syncCollectionsWithProducts(state.collections, nextProducts);

      return {
        products: nextProducts,
        collections: nextCollections,
      };
    });

    await enqueueCatalogSave(nextProducts, nextCollections);
  },
  replaceProducts: async (products) => {
    const nextProducts = normalizeProductCollection(catalogProductsPayloadSchema.parse({ products }).products);
    const nextCollections = syncCollectionsWithProducts(get().collections, nextProducts);

    set({
      products: nextProducts,
      collections: nextCollections,
    });

    await enqueueCatalogSave(nextProducts, nextCollections);
  },
  upsertCollection: async (collection) => {
    let nextCollections: CatalogCollection[] = [];

    set((state) => {
      const otherCollections = state.collections.filter((item) => item.id !== collection.id);
      nextCollections = syncCollectionsWithProducts([...otherCollections, collection], state.products);

      return {
        collections: nextCollections,
      };
    });

    await enqueueCatalogSave(get().products, nextCollections);
  },
  removeCollection: async (collectionId) => {
    let nextProducts: Product[] = [];
    let nextCollections: CatalogCollection[] = [];

    set((state) => {
      const removed = state.collections.find((collection) => collection.id === collectionId);
      const removedName = removed?.name;
      nextProducts = removedName
        ? state.products.map((product) => {
            if (!product.collectionTags.includes(removedName) && product.collection !== removedName) {
              return product;
            }

            const collectionTags = product.collectionTags.filter((tag) => tag !== removedName);
            const nextCollection = collectionTags.find((tag) => !legacySystemCollectionNames.has(tag)) ?? "";

            return {
              ...product,
              collection: product.collection === removedName ? nextCollection : product.collection,
              collectionTags,
            };
          })
        : state.products;
      nextProducts = normalizeProductCollection(nextProducts);
      nextCollections = syncCollectionsWithProducts(
        state.collections.filter((collection) => collection.id !== collectionId),
        nextProducts,
      );

      return {
        products: nextProducts,
        collections: nextCollections,
      };
    });

    await enqueueCatalogSave(nextProducts, nextCollections);
  },
  saveCollectionProducts: async (collection, productIds) => {
    let nextProducts: Product[] = [];
    let nextCollections: CatalogCollection[] = [];

    set((state) => {
      const existing = state.collections.find((item) => item.id === collection.id);
      const previousName = existing?.name;
      const normalizedCollection = normalizeCollection(
        {
          ...collection,
          productIds,
        },
        state.collections.filter((item) => item.id !== collection.id),
      );
      const selectedIds = new Set(productIds);
      nextProducts = state.products.map((product) => {
        const tagsWithoutPrevious = previousName
          ? product.collectionTags.filter((tag) => tag !== previousName)
          : product.collectionTags;
        const tagsWithoutCurrent = tagsWithoutPrevious.filter((tag) => tag !== normalizedCollection.name);
        const shouldInclude = selectedIds.has(product.id);
        const nextTags = shouldInclude
          ? uniqueValues([normalizedCollection.name, ...tagsWithoutCurrent])
          : tagsWithoutCurrent;
        const nextCollection =
          shouldInclude || product.collection === previousName || product.collection === normalizedCollection.name
            ? nextTags.find((tag) => !legacySystemCollectionNames.has(tag)) ?? ""
            : product.collection;

        return {
          ...product,
          collection: nextCollection,
          collectionTags: nextTags,
        };
      });
      nextProducts = normalizeProductCollection(nextProducts);
      nextCollections = syncCollectionsWithProducts(
        [...state.collections.filter((item) => item.id !== normalizedCollection.id), normalizedCollection],
        nextProducts,
      );

      return {
        products: nextProducts,
        collections: nextCollections,
      };
    });

    await enqueueCatalogSave(nextProducts, nextCollections);
  },
  resetProducts: async () => {
    set({
      products: normalizedRecoveredProducts,
      collections: normalizedRecoveredCollections,
    });

    await enqueueCatalogSave(normalizedRecoveredProducts, normalizedRecoveredCollections);
  },
}));
