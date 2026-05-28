import "server-only";

import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import recoveredCatalogProductsData from "@/lib/data/recovered-products.json";
import { uniqueImageSources } from "@/lib/image-utils";
import { catalogPayloadSchema, catalogProductsPayloadSchema } from "@/lib/validation-schemas";
import type { CatalogCollection, Product } from "@/lib/types";

const catalogDirectoryPath = path.join(process.cwd(), "data");
const catalogFilePath = path.join(catalogDirectoryPath, "catalog-products.json");
const catalogCollectionsFilePath = path.join(catalogDirectoryPath, "catalog-collections.json");
const catalogImageDirectoryPath = path.join(process.cwd(), "public", "catalog-products");
const recoveredCatalogProducts = recoveredCatalogProductsData as Product[];
const dataImageRegex = /^data:(image\/(?:png|jpe?g|gif|webp));base64,([a-z0-9+/=\s]+)$/i;

function toAssetFileName(value: unknown, fallback: string) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function getImageExtension(mimeType: string) {
  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  if (mimeType.includes("gif")) {
    return "gif";
  }

  return "jpg";
}

async function materializeDataImage(value: string, baseName: string, suffix: string) {
  const match = value.match(dataImageRegex);

  if (!match) {
    return value;
  }

  const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
  const extension = getImageExtension(match[1]);
  const fileName = `${baseName}-${suffix}-${hash}.${extension}`;

  await mkdir(catalogImageDirectoryPath, { recursive: true });
  await writeFile(path.join(catalogImageDirectoryPath, fileName), buffer);

  return `/catalog-products/${fileName}`;
}

async function materializeProductImages(product: Product, index: number) {
  const baseName = toAssetFileName(product.slug || product.id || product.name, `product-${index + 1}`);
  const image = await materializeDataImage(product.image, baseName, "cover");
  const gallery = await Promise.all(
    (product.gallery ?? []).map((galleryImage, galleryIndex) =>
      materializeDataImage(galleryImage, baseName, `gallery-${galleryIndex + 1}`),
    ),
  );
  const normalizedGallery =
    typeof image === "string" && image ? [image, ...gallery] : gallery;

  return {
    ...product,
    image,
    gallery: uniqueImageSources(normalizedGallery),
  };
}

async function ensureCatalogFile() {
  try {
    await readFile(catalogFilePath, "utf8");
  } catch (error) {
    const errorCode =
      typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : null;

    if (errorCode !== "ENOENT") {
      throw error;
    }

    await mkdir(catalogDirectoryPath, { recursive: true });
    await writeFile(catalogFilePath, JSON.stringify(recoveredCatalogProducts, null, 2), "utf8");
  }
}

export async function readCatalogProductsFromFile() {
  await ensureCatalogFile();

  try {
    const rawCatalog = await readFile(catalogFilePath, "utf8");
    const parsedCatalog = JSON.parse(rawCatalog);
    return catalogProductsPayloadSchema.parse({ products: parsedCatalog }).products;
  } catch {
    await writeCatalogProductsToFile(recoveredCatalogProducts);
    console.error("Catalog file was invalid and has been restored.");
    return recoveredCatalogProducts;
  }
}

async function ensureCatalogCollectionsFile() {
  try {
    await readFile(catalogCollectionsFilePath, "utf8");
  } catch (error) {
    const errorCode =
      typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : null;

    if (errorCode !== "ENOENT") {
      throw error;
    }

    await mkdir(catalogDirectoryPath, { recursive: true });
    await writeFile(catalogCollectionsFilePath, JSON.stringify([], null, 2), "utf8");
  }
}

export async function readCatalogCollectionsFromFile() {
  await ensureCatalogCollectionsFile();

  try {
    const rawCatalog = await readFile(catalogCollectionsFilePath, "utf8");
    const parsedCatalog = JSON.parse(rawCatalog);
    return catalogPayloadSchema.parse({ products: [], collections: parsedCatalog }).collections;
  } catch {
    await writeCatalogCollectionsToFile([]);
    console.error("Catalog collections file was invalid and has been restored.");
    return [];
  }
}

export async function writeCatalogProductsToFile(products: Product[]) {
  const normalizedProducts = catalogProductsPayloadSchema.parse({ products }).products;
  const materializedProducts = await Promise.all(normalizedProducts.map(materializeProductImages));
  const validatedProducts = catalogProductsPayloadSchema.parse({ products: materializedProducts }).products;

  await mkdir(catalogDirectoryPath, { recursive: true });
  await writeFile(catalogFilePath, JSON.stringify(validatedProducts, null, 2), "utf8");
}

export async function writeCatalogCollectionsToFile(collections: CatalogCollection[]) {
  const validatedCollections = catalogPayloadSchema.parse({ products: [], collections }).collections;

  await mkdir(catalogDirectoryPath, { recursive: true });
  await writeFile(catalogCollectionsFilePath, JSON.stringify(validatedCollections, null, 2), "utf8");
}

export async function writeCatalogToFiles(products: Product[], collections: CatalogCollection[]) {
  await writeCatalogProductsToFile(products);
  await writeCatalogCollectionsToFile(collections);
}

export { catalogCollectionsFilePath, catalogFilePath };
