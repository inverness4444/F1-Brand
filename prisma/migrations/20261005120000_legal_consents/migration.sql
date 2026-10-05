ALTER TABLE "User" ADD COLUMN "profileConsentAt" TIMESTAMP(3), ADD COLUMN "profileConsentVersion" TEXT;
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "dataConsentAt" TIMESTAMP(3), ADD COLUMN "adsConsentAt" TIMESTAMP(3), ADD COLUMN "consentVersion" TEXT;

CREATE TABLE "ConsentRecord" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "documentText" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "userId" TEXT,
  "newsletterSubscriberId" TEXT,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsentRecord_userId_kind_revokedAt_idx" ON "ConsentRecord"("userId", "kind", "revokedAt");
CREATE INDEX "ConsentRecord_newsletterSubscriberId_kind_revokedAt_idx" ON "ConsentRecord"("newsletterSubscriberId", "kind", "revokedAt");
CREATE INDEX "ConsentRecord_revokedAt_idx" ON "ConsentRecord"("revokedAt");
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_newsletterSubscriberId_fkey" FOREIGN KEY ("newsletterSubscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- No backfill: legacy signup dates do not prove consent.
