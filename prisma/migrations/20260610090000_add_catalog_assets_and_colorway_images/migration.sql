ALTER TABLE "ProductImage"
ADD COLUMN "color" TEXT,
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ProductImage_productId_color_idx" ON "ProductImage"("productId", "color");

CREATE TABLE "CatalogAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogAsset_createdAt_idx" ON "CatalogAsset"("createdAt");
