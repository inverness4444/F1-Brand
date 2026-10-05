import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

async function main() {
loadEnvConfig(process.cwd());
const db = new PrismaClient();
const execute = process.argv.includes("--execute");
if (execute && process.env.PERSONAL_DATA_RF_VERIFIED !== "true") throw new Error("Перед удалением подтвердите целевую российскую базу. По умолчанию выполняется только подсчёт.");

const now = new Date();
const analyticsBefore = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
const eraseBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const consentBefore = new Date(now); consentBefore.setUTCFullYear(consentBefore.getUTCFullYear() - 3);
const abandonedBefore = new Date(now); abandonedBefore.setUTCFullYear(abandonedBefore.getUTCFullYear() - 1);
const expiredWhere = { status: "ACTIVE" as const, OR: [{ dataConsentAt: { lt: consentBefore } }, { adsConsentAt: { lt: consentBefore } }, { dataConsentAt: null }, { adsConsentAt: null }] };
const expiredAnalyticsConsentWhere = { kind: "analytics", revokedAt: null, grantedAt: { lte: analyticsBefore } };
const legacyUnsubscribeWhere = { status: "UNSUBSCRIBED" as const, unsubscribedAt: null };
const erasedSubscriberWhere = { consentRecords: { none: { legalHold: true } }, status: "UNSUBSCRIBED" as const, unsubscribedAt: { lte: eraseBefore } };
const abandonedWhere = { legalHold: false, createdAt: { lt: abandonedBefore }, status: { in: ["PENDING", "AWAITING_PAYMENT", "CANCELLED"] as Array<"PENDING" | "AWAITING_PAYMENT" | "CANCELLED"> }, paymentStatus: { in: ["NOT_STARTED", "CANCELED", "FAILED"] as Array<"NOT_STARTED" | "CANCELED" | "FAILED"> }, amountPaidByBalanceCents: 0, stockDeducted: false };
try {
  const counts = {
    analytics: await db.analyticsEvent.count({ where: { createdAt: { lt: analyticsBefore } } }),
    expiredSubscriptions: await db.newsletterSubscriber.count({ where: expiredWhere }),
    eraseSubscriptions: await db.newsletterSubscriber.count({ where: erasedSubscriberWhere }),
    expiredAnalyticsConsent: await db.consentRecord.count({ where: expiredAnalyticsConsentWhere }),
    legacyUnsubscribeDates: await db.newsletterSubscriber.count({ where: legacyUnsubscribeWhere }),
    expiredProof: await db.consentRecord.count({ where: { legalHold: false, revokedAt: { lt: consentBefore } } }),
    abandonedOrders: await db.order.count({ where: abandonedWhere }),
  };
  console.log(JSON.stringify({ execute, counts }));
  if (execute) await db.$transaction(async (tx) => {
    await tx.$executeRaw`UPDATE "ConsentRecord" SET "revokedAt" = "grantedAt" + INTERVAL '180 days' WHERE "kind" = 'analytics' AND "revokedAt" IS NULL AND "grantedAt" <= ${analyticsBefore}`;
    // Legacy opt-outs have no reliable historical timestamp. Begin their erasure window now.
    await tx.newsletterSubscriber.updateMany({ where: legacyUnsubscribeWhere, data: { unsubscribedAt: now } });
    await tx.analyticsEvent.deleteMany({ where: { createdAt: { lt: analyticsBefore } } });
    const expired = await tx.newsletterSubscriber.findMany({ where: expiredWhere, select: { id: true } });
    await tx.consentRecord.updateMany({ where: { newsletterSubscriberId: { in: expired.map((item) => item.id) }, revokedAt: null }, data: { revokedAt: now } });
    await tx.newsletterSubscriber.updateMany({ where: expiredWhere, data: { status: "UNSUBSCRIBED", unsubscribedAt: now, dataConsentAt: null, adsConsentAt: null } });
    await tx.newsletterSubscriber.deleteMany({ where: erasedSubscriberWhere });
    await tx.consentRecord.deleteMany({ where: { legalHold: false, revokedAt: { lt: consentBefore } } });
    await tx.order.deleteMany({ where: abandonedWhere });
    await tx.session.deleteMany({ where: { expiresAt: { lt: now } } });
    await tx.guestCart.deleteMany({ where: { expiresAt: { lt: now } } });
    await tx.user.updateMany({ where: { profileConsentAt: null }, data: { birthday: null, favoriteDriver: null, favoriteTeam: null } });
  });
} finally { await db.$disconnect(); }

}
void main().catch(() => { console.error("Обработка сроков не завершена. Проверьте целевую базу и её настройки."); process.exitCode = 1; });
