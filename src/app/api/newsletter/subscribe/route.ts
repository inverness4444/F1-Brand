import { assertPersonalDataReady } from "@/lib/server/legal-readiness";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, noStoreJson } from "@/lib/server/api";
import { consentRecordData } from "@/lib/server/legal-consents";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";
import { newsletterSubscriptionSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertProtectedMutation(request);
    assertPersonalDataReady();
    const rateLimit = await enforceRateLimit(request, "newsletter-subscribe", { maxAttempts: 10, windowMs: 10 * 60 * 1000 });
    if (!rateLimit.allowed) return NextResponse.json({ error: "Слишком много запросов. Повторите позже." }, { status: 429 });
    // A legacy signup does not prove consent. Validate both purposes and the displayed version.
    const input = newsletterSubscriptionSchema.parse(await request.json());
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const subscriber = await tx.newsletterSubscriber.upsert({
        where: { email: input.email },
        create: { email: input.email, source: input.source, status: "ACTIVE", dataConsentAt: now, adsConsentAt: now, consentVersion: input.consentVersion },
        update: { source: input.source, status: "ACTIVE", unsubscribedAt: null, dataConsentAt: now, adsConsentAt: now, consentVersion: input.consentVersion },
      });
      await tx.consentRecord.updateMany({ where: { newsletterSubscriberId: subscriber.id, revokedAt: null }, data: { revokedAt: now } });
      await tx.consentRecord.createMany({ data: (["newsletter_data", "newsletter_ads"] as const).map((kind) => ({
        ...consentRecordData(kind, input.source, input.email), newsletterSubscriberId: subscriber.id, grantedAt: now,
      })) });
    });
    return noStoreJson({ ok: true, message: "Согласия сохранены. Вы подписались на рассылку Velocity Club." });
  } catch (error) { return apiError(error, "Не удалось оформить подписку."); }
}
