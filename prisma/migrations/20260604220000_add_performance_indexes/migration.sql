-- Public catalog filters and date ordering.
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx" ON "Product"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_status_categoryId_createdAt_idx" ON "Product"("status", "categoryId", "createdAt");

-- Cart, checkout, and inventory lookups.
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");
CREATE INDEX IF NOT EXISTS "ProductVariant_stock_idx" ON "ProductVariant"("stock");

-- Account/admin order lists and status dashboards.
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- Newsletter admin filters.
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_status_createdAt_idx" ON "NewsletterSubscriber"("status", "createdAt");
