import "server-only";

import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const MAX_CATALOG_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_CATALOG_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function safeFileStem(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "catalog-image";
}

export async function saveCatalogAsset(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isDatabaseConfigured() && process.env.CATALOG_SOURCE !== "file") {
    const asset = await prisma.catalogAsset.create({
      data: {
        fileName: file.name || "catalog-image",
        mimeType: file.type,
        size: bytes.length,
        data: bytes,
      },
      select: {
        id: true,
      },
    });

    return `/api/catalog/assets/${asset.id}`;
  }

  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const fileName = `${safeFileStem(file.name)}-${hash}.${extensionForMimeType(file.type)}`;
  const assetDirectory = path.join(process.cwd(), "public", "catalog-assets");

  await mkdir(assetDirectory, { recursive: true });
  await writeFile(path.join(assetDirectory, fileName), bytes);

  return `/catalog-assets/${fileName}`;
}
