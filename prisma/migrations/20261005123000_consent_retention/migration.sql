ALTER TABLE "NewsletterSubscriber" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);
ALTER TABLE "ConsentRecord" ADD COLUMN "subjectKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConsentRecord" ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false;
