-- CreateEnum
CREATE TYPE "SiteNotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_PAID', 'ORDER_STATUS_UPDATED', 'ADMIN_NEW_ORDER');

-- CreateTable
CREATE TABLE "SiteNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "SiteNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusChangeLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "oldStatus" "OrderStatus" NOT NULL,
    "newStatus" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteNotification_dedupeKey_key" ON "SiteNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "SiteNotification_userId_isRead_createdAt_idx" ON "SiteNotification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "SiteNotification_orderId_idx" ON "SiteNotification"("orderId");

-- CreateIndex
CREATE INDEX "SiteNotification_type_idx" ON "SiteNotification"("type");

-- CreateIndex
CREATE INDEX "SiteNotification_createdAt_idx" ON "SiteNotification"("createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusChangeLog_orderId_createdAt_idx" ON "OrderStatusChangeLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusChangeLog_adminUserId_idx" ON "OrderStatusChangeLog"("adminUserId");

-- CreateIndex
CREATE INDEX "OrderStatusChangeLog_createdAt_idx" ON "OrderStatusChangeLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SiteNotification" ADD CONSTRAINT "SiteNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteNotification" ADD CONSTRAINT "SiteNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusChangeLog" ADD CONSTRAINT "OrderStatusChangeLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusChangeLog" ADD CONSTRAINT "OrderStatusChangeLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
