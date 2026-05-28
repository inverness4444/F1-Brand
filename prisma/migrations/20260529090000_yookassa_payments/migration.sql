-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_FULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'MOCK');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'CANCELED', 'FAILED');

-- Replace OrderStatus enum safely, mapping the old FULFILLED status to DELIVERED.
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus"
  USING (
    CASE "status"::text
      WHEN 'FULFILLED' THEN 'DELIVERED'
      ELSE "status"::text
    END
  )::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "OrderStatus_old";

-- Replace PaymentStatus enum safely, mapping the old PAID status to SUCCEEDED.
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'WAITING_FOR_CAPTURE', 'SUCCEEDED', 'CANCELED', 'REFUNDED', 'FAILED');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment"
  ALTER COLUMN "status" TYPE "PaymentStatus"
  USING (
    CASE "status"::text
      WHEN 'PAID' THEN 'SUCCEEDED'
      ELSE "status"::text
    END
  )::"PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
DROP TYPE "PaymentStatus_old";

-- Alter Payment provider from string to enum, preserving existing mock values.
ALTER TABLE "Payment" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "Payment"
  ALTER COLUMN "provider" TYPE "PaymentProvider"
  USING (
    CASE lower("provider")
      WHEN 'yookassa' THEN 'YOOKASSA'
      ELSE 'MOCK'
    END
  )::"PaymentProvider";
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'MOCK';

-- AlterTable: Order
ALTER TABLE "Order"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_FULFILLED',
  ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stockDeductedAt" TIMESTAMP(3);

UPDATE "Order"
SET
  "paymentStatus" = CASE
    WHEN "status" = 'PAID' THEN 'SUCCEEDED'::"PaymentStatus"
    WHEN "status" = 'DELIVERED' THEN 'SUCCEEDED'::"PaymentStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELED'::"PaymentStatus"
    ELSE 'PENDING'::"PaymentStatus"
  END,
  "fulfillmentStatus" = CASE
    WHEN "status" = 'PROCESSING' THEN 'PROCESSING'::"FulfillmentStatus"
    WHEN "status" = 'SHIPPED' THEN 'SHIPPED'::"FulfillmentStatus"
    WHEN "status" = 'DELIVERED' THEN 'DELIVERED'::"FulfillmentStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"FulfillmentStatus"
    ELSE 'NOT_FULFILLED'::"FulfillmentStatus"
  END,
  "stockDeducted" = CASE
    WHEN "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED') THEN true
    ELSE false
  END,
  "stockDeductedAt" = CASE
    WHEN "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED') THEN "updatedAt"
    ELSE NULL
  END;

-- AlterTable: OrderItem
ALTER TABLE "OrderItem"
  ADD COLUMN "variantName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "sku" TEXT;

UPDATE "OrderItem"
SET "variantName" = trim(both ' ' from concat_ws(' / ', NULLIF("size", ''), NULLIF("color", '')))
WHERE "variantName" = '';

UPDATE "OrderItem"
SET "sku" = "ProductVariant"."sku"
FROM "ProductVariant"
WHERE "OrderItem"."variantId" = "ProductVariant"."id";

-- AlterTable: Payment
ALTER TABLE "Payment"
  ADD COLUMN "idempotenceKey" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN "confirmationUrl" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "capturedAt" TIMESTAMP(3),
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "receiptRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "receiptStatus" TEXT,
  ADD COLUMN "receipt" JSONB,
  ADD COLUMN "rawRequest" JSONB,
  ADD COLUMN "rawResponse" JSONB,
  ADD COLUMN "webhookPayload" JSONB,
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "errorMessage" TEXT;

UPDATE "Payment"
SET
  "idempotenceKey" = concat('legacy_', "id"),
  "paidAt" = CASE WHEN "status" IN ('SUCCEEDED', 'REFUNDED') THEN "updatedAt" ELSE NULL END,
  "refundedAt" = CASE WHEN "status" = 'REFUNDED' THEN "updatedAt" ELSE NULL END;

ALTER TABLE "Payment" ALTER COLUMN "idempotenceKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotenceKey_key" ON "Payment"("idempotenceKey");

-- CreateIndex
CREATE INDEX "Payment_provider_externalId_idx" ON "Payment"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_providerRefundId_idx" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_dedupeKey_key" ON "WebhookEvent"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_idx" ON "WebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_paymentId_idx" ON "WebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "WebhookEvent_orderId_idx" ON "WebhookEvent"("orderId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
