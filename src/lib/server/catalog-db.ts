import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  CatalogCategory,
  CatalogCollection,
  Product,
  ProductBadge,
  ProductColor,
  ProductGender,
  ProductSize,
  ProductType,
} from "@/lib/types";
import { prisma, isDatabaseConfigured } from "@/lib/server/db";
import {
  readCatalogCollectionsFromFile,
  readCatalogProductsFromFile,
} from "@/lib/server/catalog-file";
import { slugify } from "@/lib/utils";

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

const validCategories = new Set<CatalogCategory>([
  "Pilots",
  "Teams",
  "Legends",
  "Accessories",
  "Essentials",
  "Gifts",
]);
const validBadges = new Set<ProductBadge>(["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale", "Original"]);
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

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function asCategory(value?: string | null): CatalogCategory {
  return value && validCategories.has(value as CatalogCategory) ? (value as CatalogCategory) : "Essentials";
}

function asBadge(value: string): ProductBadge {
  return validBadges.has(value as ProductBadge) ? (value as ProductBadge) : "New";
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

function asSizes(values: string[]) {
  const sizes = values.filter((value): value is ProductSize => validSizes.has(value as ProductSize));
  return sizes.length > 0 ? unique(sizes) : (["One Size"] as ProductSize[]);
}

export function productFromDb(product: DbProduct): Product {
  const images = product.images.map((image) => image.url).filter(Boolean);
  const colors = asColors(product.variants.map((variant) => variant.color.value));
  const sizes = asSizes(product.variants.map((variant) => variant.size.value));
  const collectionTags = unique([
    product.collection?.name,
    ...product.collections.map((item) => item.collection.name),
    product.badge === "Sale" ? "Sale" : null,
  ].filter((value): value is string => Boolean(value)));
  const image = images[0] ?? "/mockups/tshirt.svg";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: asCategory(product.category?.name),
    collection: product.collection?.name ?? "",
    collectionTags,
    driverName: product.driverName,
    driverSlug: product.driverSlug,
    teamName: product.teamName,
    teamSlug: product.teamSlug,
    legendName: product.legendName,
    legendSlug: product.legendSlug,
    gender: asGender(product.gender),
    price: product.priceCents,
    productType: product.productKind === "gift_certificate" ? "gift_certificate" : "standard",
    requiresShipping: product.requiresShipping,
    colors,
    sizes,
    type: asType(product.type),
    badge: product.status === "ACTIVE" ? asBadge(product.badge) : "OutOfStock",
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
    productIds: collection.productRefs.map((ref) => ref.productId),
    createdAt: collection.createdAt.toISOString(),
  };
}

export async function readCatalogProductsFromDb() {
  if (!isDatabaseConfigured()) {
    return readCatalogProductsFromFile();
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

    return products.map(productFromDb);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.error("Failed to read catalog from database. Falling back to file catalog.");
    return readCatalogProductsFromFile();
  }
}

export async function readCatalogCollectionsFromDb() {
  if (!isDatabaseConfigured()) {
    return readCatalogCollectionsFromFile();
  }

  try {
    const collections = await prisma.collection.findMany({
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

    return collections.map(collectionFromDb);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.error("Failed to read collections from database. Falling back to file catalog.");
    return readCatalogCollectionsFromFile();
  }
}

async function ensureCategory(category: CatalogCategory) {
  const slug = slugify(category);
  return prisma.category.upsert({
    where: { slug },
    create: { id: slug, slug, name: category },
    update: { name: category },
  });
}

async function ensureCollection(name: string) {
  const slug = slugify(name || "collection");
  return prisma.collection.upsert({
    where: { slug },
    create: { id: slug, slug, name: name || "Collection" },
    update: { name: name || "Collection" },
  });
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

export async function upsertProductFromCatalogPayload(product: Product) {
  const category = await ensureCategory(product.category);
  const primaryCollection = product.collection ? await ensureCollection(product.collection) : null;

  const savedProduct = await prisma.product.upsert({
    where: { id: product.id },
    create: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.price,
      status: product.badge === "OutOfStock" ? "ARCHIVED" : "ACTIVE",
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
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.price,
      status: product.badge === "OutOfStock" ? "ARCHIVED" : "ACTIVE",
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
    data: product.gallery.map((url, index) => ({
      productId: savedProduct.id,
      url,
      alt: product.name,
      sortOrder: index,
    })),
  });

  await prisma.productCollection.deleteMany({ where: { productId: savedProduct.id } });
  for (const collectionName of product.collectionTags.filter(Boolean)) {
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

  for (const sizeValue of product.sizes) {
    const size = await ensureSize(sizeValue);

    for (const colorValue of product.colors) {
      const color = await ensureColor(colorValue);
      await prisma.productVariant.upsert({
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
          sku: skuFor(product, sizeValue, colorValue),
          stock: product.badge === "OutOfStock" ? 0 : 10,
        },
        update: {
          sku: skuFor(product, sizeValue, colorValue),
          active: true,
        },
      });
    }
  }
}

export async function replaceCatalogInDb(products: Product[], collections: CatalogCollection[]) {
  const currentIds = new Set(products.map((product) => product.id));

  for (const collection of collections) {
    await ensureCollection(collection.name);
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
