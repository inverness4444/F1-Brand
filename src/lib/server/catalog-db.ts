import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type {
  CatalogCategory,
  CatalogCollection,
  Product,
  ProductBadge,
  ProductColor,
  ProductGender,
  ProductStatus,
  ProductSize,
  ProductType,
} from "@/lib/types";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  readCatalogCollectionsFromFile,
  readCatalogProductsFromFile,
  writeCatalogToFiles,
} from "@/lib/server/catalog-file";
import { filterPublicProducts } from "@/lib/product-visibility";
import { slugify } from "@/lib/utils";

export const CATALOG_CACHE_TAG = "catalog";
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 5 * 60;

export const dbProductInclude = {
  category: true,
  collection: true,
  collections: {
    include: {
      collection: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: "asc",
    },
  },
  variants: {
    where: {
      active: true,
    },
    include: {
      size: true,
      color: true,
    },
    orderBy: [
      {
        size: {
          sortOrder: "asc",
        },
      },
      {
        color: {
          sortOrder: "asc",
        },
      },
    ],
  },
} satisfies Prisma.ProductInclude;

export const dbOrderInclude = {
  items: true,
  payment: true,
  giftCards: true,
} satisfies Prisma.OrderInclude;

type DbProduct = Prisma.ProductGetPayload<{ include: typeof dbProductInclude }>;
type DbCollection = Prisma.CollectionGetPayload<{
  include: {
    productRefs: true;
  };
}>;

type CollectionReadOptions = {
  includeHidden?: boolean;
};

const validCategories = new Set<CatalogCategory>([
  "Pilots",
  "Teams",
  "Legends",
  "Accessories",
  "Essentials",
  "Gifts",
]);
const validBadges = new Set<ProductBadge>(["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale", "Original"]);
const validStatuses = new Set<ProductStatus>(["DRAFT", "ACTIVE", "ARCHIVED"]);
const validTypes = new Set<ProductType>([
  "T-shirt",
  "Hoodie",
  "Longsleeve",
  "Jacket",
  "Polo",
  "Pants",
  "Scarf",
  "Lego",
  "Cap",
  "Keychain",
  "Accessory",
  "Wallet",
  "Cardholder",
  "Calendar",
  "Poster",
  "Gift Certificate",
]);
const validGenders = new Set<ProductGender>(["Men", "Women", "Unisex"]);
const validColors = new Set<ProductColor>([
  "Black",
  "White",
  "Navy",
  "Grey",
  "Red",
  "Orange",
  "Green",
  "Blue",
  "Yellow",
  "Silver",
  "Beige",
  "Pink",
]);
const validSizes = new Set<ProductSize>(["XS", "S", "M", "L", "XL", "XXL", "One Size"]);
const legacySystemCollectionNames = new Set([
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
]);

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

const CATALOG_DATABASE_RETRY_MS = Number(process.env.CATALOG_DATABASE_RETRY_MS ?? 60_000);
const CATALOG_DATABASE_HEALTHY_MS = Number(process.env.CATALOG_DATABASE_HEALTHY_MS ?? 10_000);
let catalogDatabaseUnavailableUntil = 0;
let catalogDatabaseAvailableUntil = 0;
let catalogDatabaseProbe: Promise<boolean> | null = null;
let catalogFallbackLogged = false;

function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

function shouldFallbackToFileCatalog() {
  return process.env.NODE_ENV !== "production" || isProductionBuildPhase();
}

function isFileCatalogForced() {
  return process.env.CATALOG_SOURCE?.toLowerCase() === "file";
}

function logCatalogFallback() {
  if (catalogFallbackLogged || process.env.CATALOG_FALLBACK_LOGS !== "true") {
    return;
  }

  catalogFallbackLogged = true;
  console.warn("Catalog database is unavailable. Using file catalog fallback.");
}

function markCatalogDatabaseUnavailable() {
  catalogDatabaseUnavailableUntil = Date.now() + CATALOG_DATABASE_RETRY_MS;
  catalogDatabaseAvailableUntil = 0;
  logCatalogFallback();
}

async function canReadCatalogFromDatabase() {
  if (!isDatabaseConfigured() || isProductionBuildPhase() || isFileCatalogForced()) {
    return false;
  }

  if (!shouldFallbackToFileCatalog()) {
    return true;
  }

  const now = Date.now();

  if (now < catalogDatabaseUnavailableUntil) {
    return false;
  }

  if (now < catalogDatabaseAvailableUntil) {
    return true;
  }

  catalogDatabaseProbe ??= prisma
    .$queryRaw`SELECT 1`
    .then(() => {
      catalogDatabaseAvailableUntil = Date.now() + CATALOG_DATABASE_HEALTHY_MS;
      catalogDatabaseUnavailableUntil = 0;
      catalogFallbackLogged = false;
      return true;
    })
    .catch(() => {
      markCatalogDatabaseUnavailable();
      return false;
    })
    .finally(() => {
      catalogDatabaseProbe = null;
    });

  return catalogDatabaseProbe;
}

function asCategory(value?: string | null): CatalogCategory {
  return value && validCategories.has(value as CatalogCategory) ? (value as CatalogCategory) : "Essentials";
}

function asBadge(value: string): ProductBadge {
  return validBadges.has(value as ProductBadge) ? (value as ProductBadge) : "New";
}

function asStatus(value: string): ProductStatus {
  return validStatuses.has(value as ProductStatus) ? (value as ProductStatus) : "ACTIVE";
}

function asType(value: string): ProductType {
  return validTypes.has(value as ProductType) ? (value as ProductType) : "T-shirt";
}

function asGender(value: string): ProductGender {
  return validGenders.has(value as ProductGender) ? (value as ProductGender) : "Unisex";
}

function asColors(values: string[]) {
  const colors = values.filter((value): value is ProductColor => validColors.has(value as ProductColor));
  return colors.length > 0 ? unique(colors) : (["Black"] as ProductColor[]);
}

function asOptionalColors(values: string[]) {
  return unique(values.filter((value): value is ProductColor => validColors.has(value as ProductColor)));
}

function asSizes(values: string[]) {
  const sizes = values.filter((value): value is ProductSize => validSizes.has(value as ProductSize));
  return sizes.length > 0 ? unique(sizes) : (["One Size"] as ProductSize[]);
}

export function productFromDb(product: DbProduct, options: CollectionReadOptions = {}): Product {
  const images = product.images.map((image) => image.url).filter(Boolean);
  const variantColors = asColors(product.variants.map((variant) => variant.color.value));
  const colors = product.designColors.length > 0 ? asColors(product.designColors) : variantColors;
  const colorways = asOptionalColors(product.colorways);
  const sizes = asSizes(product.variants.map((variant) => variant.size.value));
  const primaryCollection = options.includeHidden || product.collection?.visible ? product.collection : null;
  const productCollections = options.includeHidden
    ? product.collections
    : product.collections.filter((item) => item.collection.visible);
  const collectionTags = unique([
    primaryCollection?.name,
    ...productCollections.map((item) => item.collection.name),
    product.badge === "Sale" ? "Sale" : null,
  ].filter((value): value is string => Boolean(value)));
  const image = images[0] ?? "/mockups/tshirt.svg";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: asCategory(product.category?.name),
    collection: primaryCollection?.name ?? "",
    collectionTags,
    driverName: product.driverName,
    driverSlug: product.driverSlug,
    teamName: product.teamName,
    teamSlug: product.teamSlug,
    legendName: product.legendName,
    legendSlug: product.legendSlug,
    gender: asGender(product.gender),
    price: product.priceCents,
    oldPrice: product.oldPriceCents,
    stock: product.stock,
    productType: product.productKind === "gift_certificate" ? "gift_certificate" : "standard",
    requiresShipping: product.requiresShipping,
    colors,
    colorways,
    sizes,
    type: asType(product.type),
    badge: asBadge(product.badge),
    status: asStatus(product.status),
    image,
    gallery: images.length > 0 ? images : [image],
    description: product.description,
    shortDescription: product.shortDescription,
    popularity: product.popularity,
    createdAt: product.createdAt.toISOString(),
    number: product.number ?? undefined,
    hexPalette: product.hexPalette.length > 0 ? product.hexPalette : ["#111111", "#d7c8b7", "#f9f8f4"],
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size.value as ProductSize,
      color: variant.color.value as ProductColor,
      stock: variant.stock,
      priceOverride: variant.priceOverrideCents,
    })),
  };
}

export function collectionFromDb(collection: DbCollection): CatalogCollection {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    visible: collection.visible,
    productIds: collection.productRefs.map((ref) => ref.productId),
    createdAt: collection.createdAt.toISOString(),
  };
}

async function readCatalogProductsFresh() {
  if (!(await canReadCatalogFromDatabase())) {
    return filterPublicProducts(await readCatalogProductsFromFile());
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
      },
      include: dbProductInclude,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    return products.map((product) => productFromDb(product));
  } catch (error) {
    if (!shouldFallbackToFileCatalog()) {
      throw error;
    }

    markCatalogDatabaseUnavailable();
    return filterPublicProducts(await readCatalogProductsFromFile());
  }
}

const readCachedCatalogProducts = unstable_cache(readCatalogProductsFresh, ["catalog-products"], {
  revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
  tags: [CATALOG_CACHE_TAG],
});

export async function readCatalogProductsFromDb() {
  if (process.env.NODE_ENV === "development" || isFileCatalogForced()) {
    return readCatalogProductsFresh();
  }

  return readCachedCatalogProducts();
}

export async function readAdminCatalogProductsFromDb() {
  if (!isDatabaseConfigured() || isFileCatalogForced()) {
    return readCatalogProductsFromFile();
  }

  const products = await prisma.product.findMany({
    include: dbProductInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return products.map((product) => productFromDb(product, { includeHidden: true }));
}

function filterVisibleCollections(collections: CatalogCollection[], options: CollectionReadOptions = {}) {
  return options.includeHidden ? collections : collections.filter((collection) => collection.visible);
}

function mergeCollectionsByName(collections: CatalogCollection[]) {
  return collections.reduce<CatalogCollection[]>((result, collection) => {
    const existing = result.find((item) => item.name === collection.name);

    if (!existing) {
      result.push(collection);
      return result;
    }

    existing.productIds = unique([...existing.productIds, ...collection.productIds]);
    existing.visible = existing.visible || collection.visible;
    return result;
  }, []);
}

function createUniqueCollectionSlugFromList(
  baseSlug: string,
  collectionId: string,
  collections: CatalogCollection[],
) {
  const normalizedBase = slugify(baseSlug) || "collection";
  let candidate = normalizedBase;
  let index = 2;

  while (collections.some((collection) => collection.slug === candidate && collection.id !== collectionId)) {
    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }

  return candidate;
}

function firstCustomCollectionName(collectionTags: string[]) {
  return collectionTags.find((tag) => !legacySystemCollectionNames.has(tag)) ?? "";
}

function productFileCollectionNames(product: Product) {
  return unique([product.collection, ...product.collectionTags].filter(Boolean)).filter(
    (name) => !legacySystemCollectionNames.has(name),
  );
}

function ensureFileCollectionsForProducts(collections: CatalogCollection[], products: Product[]) {
  const nextCollections = [...collections];

  for (const product of products) {
    for (const collectionName of productFileCollectionNames(product)) {
      if (nextCollections.some((collection) => collection.name === collectionName)) {
        continue;
      }

      const id = createUniqueCollectionSlugFromList(collectionName, slugify(collectionName), nextCollections);
      nextCollections.push({
        id,
        slug: id,
        name: collectionName,
        visible: true,
        productIds: [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return nextCollections;
}

function syncFileCollectionsWithProducts(collections: CatalogCollection[], products: Product[]) {
  const productIds = new Set(products.map((product) => product.id));

  return mergeCollectionsByName(collections).map((collection) => {
    const matchingProductIds = products
      .filter((product) => product.collection === collection.name || product.collectionTags.includes(collection.name))
      .map((product) => product.id);

    return {
      ...collection,
      productIds: unique([
        ...collection.productIds.filter((productId) => productIds.has(productId)),
        ...matchingProductIds,
      ]),
    };
  });
}

async function upsertProductInFileCatalog(product: Product) {
  const [products, collections] = await Promise.all([
    readCatalogProductsFromFile(),
    readCatalogCollectionsFromFile(),
  ]);
  const nextProducts = [
    ...products.filter((item) => item.id !== product.id),
    product,
  ];
  const nextCollections = syncFileCollectionsWithProducts(
    ensureFileCollectionsForProducts(collections, nextProducts),
    nextProducts,
  );

  await writeCatalogToFiles(nextProducts, nextCollections);

  const refreshedProducts = await readCatalogProductsFromFile();
  return refreshedProducts.find((item) => item.id === product.id) ?? product;
}

async function upsertCollectionInFileCatalog(
  collection: CatalogCollection,
  productIds: string[] = collection.productIds,
) {
  const [products, collections] = await Promise.all([
    readCatalogProductsFromFile(),
    readCatalogCollectionsFromFile(),
  ]);
  const existingCollection =
    collections.find((item) => item.id === collection.id) ??
    collections.find((item) => item.slug === collection.slug);
  const collectionId = existingCollection?.id ?? (collection.id || collection.slug || `collection-${Date.now()}`);
  const slug = createUniqueCollectionSlugFromList(
    collection.slug || collection.name || collectionId,
    collectionId,
    collections,
  );
  const previousName = existingCollection?.name;
  const selectedProductIds = new Set(productIds.filter((productId) => products.some((product) => product.id === productId)));
  const savedCollection: CatalogCollection = {
    ...collection,
    id: collectionId,
    slug,
    visible: collection.visible ?? true,
    productIds: [...selectedProductIds],
    createdAt: collection.createdAt || existingCollection?.createdAt || new Date().toISOString(),
  };
  const nextProducts = products.map((product) => {
    const tagsWithoutPrevious = previousName
      ? product.collectionTags.filter((tag) => tag !== previousName)
      : product.collectionTags;
    const tagsWithoutCurrent = tagsWithoutPrevious.filter((tag) => tag !== savedCollection.name);
    const shouldInclude = selectedProductIds.has(product.id);
    const collectionTags = shouldInclude
      ? unique([savedCollection.name, ...tagsWithoutCurrent])
      : tagsWithoutCurrent;
    const nextCollection =
      shouldInclude || product.collection === previousName || product.collection === savedCollection.name
        ? firstCustomCollectionName(collectionTags)
        : product.collection;

    return {
      ...product,
      collection: nextCollection,
      collectionTags,
    };
  });
  const nextCollections = syncFileCollectionsWithProducts(
    [
      ...collections.filter((item) => item.id !== savedCollection.id),
      savedCollection,
    ],
    nextProducts,
  );

  await writeCatalogToFiles(nextProducts, nextCollections);

  const refreshedCollections = await readCatalogCollectionsFromFile();
  return {
    collection: refreshedCollections.find((item) => item.id === savedCollection.id) ?? savedCollection,
    previousSlug: existingCollection?.slug,
  };
}

async function deleteProductFromFileCatalog(productId: string) {
  const [products, collections] = await Promise.all([
    readCatalogProductsFromFile(),
    readCatalogCollectionsFromFile(),
  ]);
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  const nextProducts = products.filter((item) => item.id !== productId);
  const nextCollections = syncFileCollectionsWithProducts(collections, nextProducts);

  await writeCatalogToFiles(nextProducts, nextCollections);

  return {
    id: product.id,
    slug: product.slug,
  };
}

async function deleteCollectionFromFileCatalog(collectionId: string) {
  const [products, collections] = await Promise.all([
    readCatalogProductsFromFile(),
    readCatalogCollectionsFromFile(),
  ]);
  const collection = collections.find((item) => item.id === collectionId);

  if (!collection) {
    return null;
  }

  const nextProducts = products.map((product) => {
    if (product.collection !== collection.name && !product.collectionTags.includes(collection.name)) {
      return product;
    }

    const collectionTags = product.collectionTags.filter((tag) => tag !== collection.name);

    return {
      ...product,
      collection: product.collection === collection.name ? firstCustomCollectionName(collectionTags) : product.collection,
      collectionTags,
    };
  });
  const nextCollections = syncFileCollectionsWithProducts(
    collections.filter((item) => item.id !== collectionId),
    nextProducts,
  );

  await writeCatalogToFiles(nextProducts, nextCollections);

  return {
    id: collection.id,
    slug: collection.slug,
  };
}

async function readCatalogCollectionsFresh(options: CollectionReadOptions = {}) {
  if (!(await canReadCatalogFromDatabase())) {
    return mergeCollectionsByName(filterVisibleCollections(await readCatalogCollectionsFromFile(), options));
  }

  try {
    const collections = await prisma.collection.findMany({
      where: options.includeHidden
        ? undefined
        : {
            visible: true,
          },
      include: {
        productRefs: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return mergeCollectionsByName(collections.map(collectionFromDb));
  } catch (error) {
    if (!shouldFallbackToFileCatalog()) {
      throw error;
    }

    markCatalogDatabaseUnavailable();
    return mergeCollectionsByName(filterVisibleCollections(await readCatalogCollectionsFromFile(), options));
  }
}

const readCachedVisibleCatalogCollections = unstable_cache(
  () => readCatalogCollectionsFresh(),
  ["catalog-collections-visible"],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_CACHE_TAG],
  },
);

export async function readCatalogCollectionsFromDb(options: CollectionReadOptions = {}) {
  if (options.includeHidden || process.env.NODE_ENV === "development" || isFileCatalogForced()) {
    return readCatalogCollectionsFresh(options);
  }

  return readCachedVisibleCatalogCollections();
}

async function ensureCategory(category: CatalogCategory) {
  const slug = slugify(category);
  return prisma.category.upsert({
    where: { slug },
    create: { id: slug, slug, name: category },
    update: { name: category },
  });
}

async function ensureCollection(name: string, visible?: boolean) {
  const slug = slugify(name || "collection");
  const collectionName = name || "Collection";
  const visibilityUpdate = typeof visible === "boolean" ? { visible } : {};

  const collection = await prisma.collection.upsert({
    where: { slug },
    create: { id: slug, slug, name: collectionName, visible: visible ?? true },
    update: { name: collectionName, ...visibilityUpdate },
  });

  if (typeof visible === "boolean") {
    await prisma.collection.updateMany({
      where: {
        name: collectionName,
      },
      data: {
        visible,
      },
    });
  }

  return collection;
}

async function ensureSize(value: ProductSize) {
  return prisma.size.upsert({
    where: { value },
    create: {
      id: slugify(value),
      value,
      label: value,
      sortOrder: value === "One Size" ? 100 : ["XS", "S", "M", "L", "XL", "XXL"].indexOf(value) * 10,
    },
    update: {
      label: value,
    },
  });
}

async function ensureColor(value: ProductColor) {
  return prisma.color.upsert({
    where: { value },
    create: {
      id: slugify(value),
      value,
      label: value,
    },
    update: {
      label: value,
    },
  });
}

function skuFor(product: Product, size: ProductSize, color: ProductColor) {
  return `${product.slug}-${size}-${color}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
}

async function createUniqueProductSlug(baseSlug: string, productId: string) {
  const normalizedBase = slugify(baseSlug) || "product";
  let candidate = normalizedBase;
  let index = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === productId) {
      return candidate;
    }

    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }
}

async function createUniqueCollectionSlug(baseSlug: string, collectionId: string) {
  const normalizedBase = slugify(baseSlug) || "collection";
  let candidate = normalizedBase;
  let index = 2;

  while (true) {
    const existing = await prisma.collection.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === collectionId) {
      return candidate;
    }

    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }
}

function variantKey(size: ProductSize, color: ProductColor) {
  return `${size}::${color}`;
}

export async function upsertProductFromCatalogPayload(product: Product) {
  if (isFileCatalogForced()) {
    return upsertProductInFileCatalog(product);
  }

  const category = await ensureCategory(product.category);
  const primaryCollection = product.collection ? await ensureCollection(product.collection) : null;
  const slug = await createUniqueProductSlug(product.slug || product.name, product.id);
  const status = product.status ?? (product.badge === "OutOfStock" ? "ARCHIVED" : "ACTIVE");
  const images = [...new Set([product.image, ...product.gallery].filter(Boolean))];
  const variantInputs = new Map(
    (product.variants ?? []).map((variant) => [variantKey(variant.size, variant.color), variant]),
  );

  const savedProduct = await prisma.product.upsert({
    where: { id: product.id },
    create: {
      id: product.id,
      slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.price,
      oldPriceCents: product.oldPrice ?? null,
      stock: product.stock ?? null,
      designColors: product.colors,
      colorways: product.colorways ?? [],
      status,
      badge: product.badge,
      type: product.type,
      gender: product.gender,
      productKind: product.productType,
      requiresShipping: product.requiresShipping,
      popularity: product.popularity,
      categoryId: category.id,
      collectionId: primaryCollection?.id,
      driverName: product.driverName,
      driverSlug: product.driverSlug,
      teamName: product.teamName,
      teamSlug: product.teamSlug,
      legendName: product.legendName,
      legendSlug: product.legendSlug,
      number: product.number,
      hexPalette: product.hexPalette,
    },
    update: {
      slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.price,
      oldPriceCents: product.oldPrice ?? null,
      stock: product.stock ?? null,
      designColors: product.colors,
      colorways: product.colorways ?? [],
      status,
      badge: product.badge,
      type: product.type,
      gender: product.gender,
      productKind: product.productType,
      requiresShipping: product.requiresShipping,
      popularity: product.popularity,
      categoryId: category.id,
      collectionId: primaryCollection?.id,
      driverName: product.driverName,
      driverSlug: product.driverSlug,
      teamName: product.teamName,
      teamSlug: product.teamSlug,
      legendName: product.legendName,
      legendSlug: product.legendSlug,
      number: product.number,
      hexPalette: product.hexPalette,
    },
  });

  await prisma.productImage.deleteMany({ where: { productId: savedProduct.id } });
  await prisma.productImage.createMany({
    data: images.map((url, index) => ({
      productId: savedProduct.id,
      url,
      alt: product.name,
      sortOrder: index,
    })),
  });

  await prisma.productCollection.deleteMany({ where: { productId: savedProduct.id } });
  for (const collectionName of [...new Set([product.collection, ...product.collectionTags].filter(Boolean))]) {
    const collection = await ensureCollection(collectionName);
    await prisma.productCollection.upsert({
      where: {
        productId_collectionId: {
          productId: savedProduct.id,
          collectionId: collection.id,
        },
      },
      create: {
        productId: savedProduct.id,
        collectionId: collection.id,
      },
      update: {},
    });
  }

  const activeVariantIds: string[] = [];
  const variantColorValues = product.colorways && product.colorways.length > 0
    ? product.colorways
    : [product.colors[0] ?? "Black"];

  for (const sizeValue of product.sizes) {
    const size = await ensureSize(sizeValue);

    for (const colorValue of variantColorValues) {
      const color = await ensureColor(colorValue);
      const variantInput = variantInputs.get(variantKey(sizeValue, colorValue));
      const stock = product.stock ?? variantInput?.stock ?? (product.productType === "gift_certificate" ? 999 : 10);
      const variant = await prisma.productVariant.upsert({
        where: {
          productId_sizeId_colorId: {
            productId: savedProduct.id,
            sizeId: size.id,
            colorId: color.id,
          },
        },
        create: {
          productId: savedProduct.id,
          sizeId: size.id,
          colorId: color.id,
          sku: skuFor({ ...product, slug }, sizeValue, colorValue),
          stock,
          priceOverrideCents: variantInput?.priceOverride ?? null,
        },
        update: {
          sku: skuFor({ ...product, slug }, sizeValue, colorValue),
          stock,
          priceOverrideCents: variantInput?.priceOverride ?? null,
          active: true,
        },
      });
      activeVariantIds.push(variant.id);
    }
  }

  await prisma.productVariant.updateMany({
    where: {
      productId: savedProduct.id,
      id: {
        notIn: activeVariantIds,
      },
    },
    data: {
      active: false,
    },
  });

  const refreshedProduct = await prisma.product.findUniqueOrThrow({
    where: { id: savedProduct.id },
    include: dbProductInclude,
  });

  return productFromDb(refreshedProduct);
}

export async function upsertCollectionFromCatalogPayload(
  collection: CatalogCollection,
  productIds: string[] = collection.productIds,
) {
  if (isFileCatalogForced()) {
    return upsertCollectionInFileCatalog(collection, productIds);
  }

  const existingCollection =
    (collection.id
      ? await prisma.collection.findUnique({
          where: { id: collection.id },
          select: {
            id: true,
            slug: true,
          },
        })
      : null) ??
    (collection.slug
      ? await prisma.collection.findUnique({
          where: { slug: collection.slug },
          select: {
            id: true,
            slug: true,
          },
        })
      : null);
  const targetId = existingCollection?.id ?? (collection.id || collection.slug || `collection-${Date.now()}`);
  const slug = await createUniqueCollectionSlug(collection.slug || collection.name || targetId, targetId);
  const uniqueProductIds = unique(productIds.filter(Boolean));

  const { savedCollection, previousSlug } = await prisma.$transaction(async (tx) => {
    const existingProducts =
      uniqueProductIds.length > 0
        ? await tx.product.findMany({
            where: {
              id: {
                in: uniqueProductIds,
              },
            },
            select: {
              id: true,
            },
          })
        : [];
    const existingProductIds = existingProducts.map((product) => product.id);
    const saved = await tx.collection.upsert({
      where: { id: targetId },
      create: {
        id: targetId,
        slug,
        name: collection.name,
        visible: collection.visible,
        createdAt: new Date(collection.createdAt),
      },
      update: {
        slug,
        name: collection.name,
        visible: collection.visible,
      },
    });

    await tx.productCollection.deleteMany({
      where: {
        collectionId: saved.id,
      },
    });

    if (existingProductIds.length > 0) {
      await tx.productCollection.createMany({
        data: existingProductIds.map((productId) => ({
          productId,
          collectionId: saved.id,
        })),
        skipDuplicates: true,
      });

      await tx.product.updateMany({
        where: {
          id: {
            in: existingProductIds,
          },
        },
        data: {
          collectionId: saved.id,
        },
      });
    }

    const productsLosingPrimaryCollection = await tx.product.findMany({
      where: {
        collectionId: saved.id,
        ...(existingProductIds.length > 0
          ? {
              id: {
                notIn: existingProductIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
        collections: {
          where: {
            collectionId: {
              not: saved.id,
            },
          },
          select: {
            collectionId: true,
          },
          take: 1,
        },
      },
    });

    for (const product of productsLosingPrimaryCollection) {
      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          collectionId: product.collections[0]?.collectionId ?? null,
        },
      });
    }

    return {
      savedCollection: saved,
      previousSlug: existingCollection?.slug,
    };
  });

  const refreshedCollection = await prisma.collection.findUniqueOrThrow({
    where: {
      id: savedCollection.id,
    },
    include: {
      productRefs: true,
    },
  });

  return {
    collection: collectionFromDb(refreshedCollection),
    previousSlug,
  };
}

export async function deleteProductFromDb(productId: string) {
  if (isFileCatalogForced()) {
    return deleteProductFromFileCatalog(productId);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!product) {
    return null;
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      status: "ARCHIVED",
      variants: {
        updateMany: {
          where: {},
          data: {
            active: false,
          },
        },
      },
    },
  });

  return product;
}

export async function deleteCollectionFromDb(collectionId: string) {
  if (isFileCatalogForced()) {
    return deleteCollectionFromFileCatalog(collectionId);
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!collection) {
    return null;
  }

  await prisma.collection.delete({
    where: { id: collectionId },
  });

  return collection;
}

export async function replaceCatalogInDb(products: Product[], collections: CatalogCollection[]) {
  if (isFileCatalogForced()) {
    await writeCatalogToFiles(products, collections);
    return;
  }

  const currentIds = new Set(products.map((product) => product.id));

  for (const collection of collections) {
    await ensureCollection(collection.name, collection.visible);
  }

  for (const product of products) {
    await upsertProductFromCatalogPayload(product);
  }

  await prisma.product.updateMany({
    where: {
      id: {
        notIn: [...currentIds],
      },
    },
    data: {
      status: "ARCHIVED",
    },
  });
}
