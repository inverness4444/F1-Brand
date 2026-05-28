import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

import type { CatalogCollection, Product } from "../src/lib/types";

const prisma = new PrismaClient();

const sizeOrder = new Map(
  ["XS", "S", "M", "L", "XL", "XXL", "One Size"].map((value, index) => [value, (index + 1) * 10]),
);
const colorHexMap = {
  Black: "#111111",
  White: "#f9f8f4",
  Navy: "#162540",
  Grey: "#9ea3aa",
  Red: "#d8382e",
  Orange: "#eb6d2f",
  Green: "#16614b",
  Blue: "#1c4fb4",
  Yellow: "#d6b224",
  Silver: "#cfd4da",
  Beige: "#d7c8b7",
  Pink: "#d66597",
} as const;
const colorOrder = new Map(Object.keys(colorHexMap).map((value, index) => [value, (index + 1) * 10]));

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8")) as T;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function unique<T>(values: Array<T | null | undefined>) {
  return [...new Set(values.filter((value): value is T => Boolean(value)))];
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function createManyChunked<T extends Record<string, unknown>>(
  model: { createMany: (args: { data: T[]; skipDuplicates: true }) => Promise<unknown> },
  data: T[],
  chunkSize = 100,
) {
  for (const chunk of chunks(data, chunkSize)) {
    await model.createMany({ data: chunk, skipDuplicates: true });
  }
}

function skuFor(product: Product, size: string, color: string) {
  return `${product.slug}-${size}-${color}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 180);
}

async function seedCatalog() {
  const products = readJson<Product[]>("data/catalog-products.json");
  const localCollections = readJson<CatalogCollection[]>("data/catalog-collections.json");
  const localCollectionByName = new Map(localCollections.map((collection) => [collection.name, collection]));
  const collectionNames = unique([
    ...localCollections.map((collection) => collection.name),
    ...products.flatMap((product) => [product.collection, ...product.collectionTags]),
  ]);
  const categoryNames = unique(products.map((product) => product.category));
  const sizeValues = unique(products.flatMap((product) => product.sizes));
  const colorValues = unique(products.flatMap((product) => product.colors));

  await prisma.$transaction([
    prisma.product.deleteMany({}),
    prisma.collection.deleteMany({}),
    prisma.category.deleteMany({}),
    prisma.size.deleteMany({}),
    prisma.color.deleteMany({}),
  ]);

  await prisma.category.createMany({
    data: categoryNames.map((name) => ({
      id: slugify(name),
      slug: slugify(name),
      name,
    })),
    skipDuplicates: true,
  });
  await prisma.collection.createMany({
    data: collectionNames.map((name) => {
      const explicit = localCollectionByName.get(name);
      return {
        id: explicit?.id || slugify(name),
        slug: explicit?.slug || slugify(name),
        name,
        createdAt: explicit?.createdAt ? new Date(explicit.createdAt) : undefined,
      };
    }),
    skipDuplicates: true,
  });
  await prisma.size.createMany({
    data: sizeValues.map((value) => ({
      id: slugify(value),
      value,
      label: value,
      sortOrder: sizeOrder.get(value) || 999,
    })),
    skipDuplicates: true,
  });
  await prisma.color.createMany({
    data: colorValues.map((value) => ({
      id: slugify(value),
      value,
      label: value,
      hex: colorHexMap[value] || null,
      sortOrder: colorOrder.get(value) || 999,
    })),
    skipDuplicates: true,
  });

  const categories = new Map((await prisma.category.findMany()).map((category) => [category.name, category]));
  const collections = new Map(
    (await prisma.collection.findMany()).map((collection) => [collection.name, collection]),
  );
  const sizes = new Map((await prisma.size.findMany()).map((size) => [size.value, size]));
  const colors = new Map((await prisma.color.findMany()).map((color) => [color.value, color]));

  await createManyChunked(
    prisma.product,
    products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: Math.round(product.price),
      status: "ACTIVE",
      badge: product.badge,
      type: product.type,
      gender: product.gender,
      productKind: product.productType,
      requiresShipping: product.requiresShipping,
      popularity: product.popularity,
      categoryId: categories.get(product.category)?.id,
      collectionId: product.collection ? collections.get(product.collection)?.id : null,
      driverName: product.driverName,
      driverSlug: product.driverSlug,
      teamName: product.teamName,
      teamSlug: product.teamSlug,
      legendName: product.legendName,
      legendSlug: product.legendSlug,
      number: product.number,
      hexPalette: product.hexPalette,
      createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
    })),
    25,
  );

  const imageRows = products.flatMap((product) =>
    unique([product.image, ...product.gallery]).map((url, sortOrder) => ({
      productId: product.id,
      url,
      alt: product.name,
      sortOrder,
    })),
  );
  const productCollectionRows = products.flatMap((product) =>
    unique([product.collection, ...product.collectionTags])
      .map((name) => collections.get(name))
      .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection))
      .map((collection) => ({
        productId: product.id,
        collectionId: collection.id,
      })),
  );
  const variantRows = products.flatMap((product) =>
    unique(product.sizes).flatMap((sizeValue) => {
      const size = sizes.get(sizeValue);
      return unique(product.colors)
        .map((colorValue) => {
          const color = colors.get(colorValue);
          if (!size || !color) {
            return null;
          }
          return {
            productId: product.id,
            sizeId: size.id,
            colorId: color.id,
            sku: skuFor(product, sizeValue, colorValue),
            stock: product.badge === "OutOfStock" ? 0 : product.productType === "gift_certificate" ? 999 : 10,
            active: true,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
    }),
  );

  await createManyChunked(prisma.productImage, imageRows, 50);
  await createManyChunked(prisma.productCollection, productCollectionRows, 200);
  await createManyChunked(prisma.productVariant, variantRows, 200);
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Store Admin",
      phone: "+79990000000",
      role: UserRole.ADMIN,
      passwordHash,
      carts: {
        create: {},
      },
      balance: {
        create: {
          amountCents: 0,
        },
      },
    },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.cart.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });
}

async function main() {
  await seedCatalog();
  await seedAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
