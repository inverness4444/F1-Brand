ALTER TABLE "Order" ADD COLUMN "deliveryDeadline" TIMESTAMP(3), ADD COLUMN "offerVersion" TEXT, ADD COLUMN "offerSnapshot" TEXT, ADD COLUMN "returnInstructions" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productInfoSnapshot" JSONB;
-- Existing orders retain their original terms. Do not backfill with today's promise.
