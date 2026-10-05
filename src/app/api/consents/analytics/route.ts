import { NextRequest } from "next/server";
import { z } from "zod";
import { LEGAL_VERSION } from "@/lib/legal";
import { ANALYTICS_CONSENT_COOKIE_NAME, COOKIE_CONSENT_COOKIE_NAME } from "@/lib/cookie-constants";
import { shouldUseSecureCookies } from "@/lib/cookie-utils";
import { prisma } from "@/lib/prisma";
import { consentRecordData } from "@/lib/server/legal-consents";
import { analyticsConsentId, analyticsConsentToken } from "@/lib/server/analytics-consent";
import { assertPersonalDataReady } from "@/lib/server/legal-readiness";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";
import { apiError, noStoreJson } from "@/lib/server/api";

export const runtime = "nodejs";
const schema = z.object({ choice: z.enum(["essential", "all"]), documentVersion: z.literal(LEGAL_VERSION) }).strict();

export async function POST(request: NextRequest) {
  try {
    assertProtectedMutation(request);
    const limit = await enforceRateLimit(request, "analytics-consent", { maxAttempts: 30, windowMs: 60 * 1000 });
    if (!limit.allowed) return noStoreJson({ error: "Повторите через минуту." }, { status: 429 });
    const input = schema.parse(await request.json());
    const previousId = analyticsConsentId(request.cookies.get(ANALYTICS_CONSENT_COOKIE_NAME)?.value);
    if (input.choice === "all") assertPersonalDataReady();
    const record = previousId || input.choice === "all" ? await prisma.$transaction(async (tx) => {
      if (previousId) {
        await tx.consentRecord.updateMany({ where: { id: previousId, kind: "analytics", revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.analyticsEvent.deleteMany({ where: { sessionId: previousId } });
      }
      return input.choice === "all" ? tx.consentRecord.create({ data: consentRecordData("analytics", "cookie-banner") }) : null;
    }) : null;
    const response = noStoreJson({ ok: true });
    const options = { path: "/", sameSite: "lax" as const, secure: shouldUseSecureCookies(request), maxAge: 180 * 24 * 60 * 60 };
    response.cookies.set(COOKIE_CONSENT_COOKIE_NAME, input.choice, options);
    response.cookies.set(ANALYTICS_CONSENT_COOKIE_NAME, record ? analyticsConsentToken(record.id) : "", { ...options, httpOnly: true, maxAge: record ? options.maxAge : 0 });
    return response;
  } catch (error) { return apiError(error, "Не удалось сохранить выбор. Аналитика остаётся отключённой."); }
}
