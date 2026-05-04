import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import recoveredCatalogProductsData from "@/lib/data/recovered-products.json";
import { catalogProductsPayloadSchema } from "@/lib/validation-schemas";
import type { Product } from "@/lib/types";

const catalogDirectoryPath = path.join(process.cwd(), "data");
const catalogFilePath = path.join(catalogDirectoryPath, "catalog-products.json");
const recoveredCatalogProducts = recoveredCatalogProductsData as Product[];

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

export async function writeCatalogProductsToFile(products: Product[]) {
  const normalizedProducts = catalogProductsPayloadSchema.parse({ products }).products;
  await mkdir(catalogDirectoryPath, { recursive: true });
  await writeFile(catalogFilePath, JSON.stringify(normalizedProducts, null, 2), "utf8");
}

export { catalogFilePath };
