import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, noStoreJson } from "@/lib/server/api";
import { subscriberIdFromToken } from "@/lib/server/newsletter";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertProtectedMutation(request);
    const limit = await enforceRateLimit(request, "newsletter-unsubscribe", { maxAttempts: 20, windowMs: 60 * 1000 });
    if (!limit.allowed) return noStoreJson({ error: "Повторите через минуту." }, { status: 429 });
    const { token } = z.object({ token: z.string().max(200) }).parse(await request.json());
    const id = subscriberIdFromToken(token);
    if (!id) return noStoreJson({ error: "Ссылка недействительна. Напишите на velocityclub@mail.ru для отказа от рассылки." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.newsletterSubscriber.updateMany({ where: { id }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), dataConsentAt: null, adsConsentAt: null } });
      await tx.consentRecord.updateMany({ where: { newsletterSubscriberId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return noStoreJson({ ok: true });
  } catch (error) { return apiError(error, "Не удалось отменить рассылку."); }
}
