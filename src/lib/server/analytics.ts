import "server-only";

import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { analyticsConsentId } from "@/lib/server/analytics-consent";
import { ANALYTICS_CONSENT_COOKIE_NAME, COOKIE_CONSENT_COOKIE_NAME } from "@/lib/cookie-constants";
import type { NextRequest } from "next/server";

import type {
  AnalyticsDeviceType,
  AnalyticsEntityType,
  AnalyticsEventType,
} from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { sanitizeIdentifier, sanitizeText } from "@/lib/security-utils";

type AnalyticsMetadata = Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;

type RecordAnalyticsEventInput = {
  eventType: AnalyticsEventType;
  entityType: AnalyticsEntityType;
  entityId?: string | null;
  entityName?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  deviceType?: AnalyticsDeviceType | null;
  metadata?: AnalyticsMetadata | null;
};

const excludedAnalyticsUserEmails = new Set([
  "abuzada@mail.ru",
  "awxlone@mail.ru",
  "vadim.efimov194@gmail.com",
]);

function sanitizeOptionalText(value: string | null | undefined, maxLength: number) {
  const sanitizedValue = sanitizeText(value ?? "", { maxLength });
  return sanitizedValue || null;
}

function sanitizeOptionalIdentifier(value: string | null | undefined) {
  return value ? sanitizeIdentifier(value, "") || null : null;
}

function isExcludedAnalyticsEmail(value: string | null | undefined) {
  return value ? excludedAnalyticsUserEmails.has(value.trim().toLowerCase()) : false;
}

async function shouldExcludeAnalyticsEvent(input: RecordAnalyticsEventInput) {
  if (input.userEmail) {
    return isExcludedAnalyticsEmail(input.userEmail);
  }

  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });

    return isExcludedAnalyticsEmail(user?.email);
  }

  if (input.entityId && (input.entityType === "order" || input.entityType === "payment")) {
    const order = await prisma.order.findUnique({
      where: { id: input.entityId },
      select: {
        customerEmail: true,
        user: {
          select: { email: true },
        },
      },
    });

    return (
      isExcludedAnalyticsEmail(order?.user?.email) ||
      isExcludedAnalyticsEmail(order?.customerEmail)
    );
  }

  return false;
}

export function getDeviceTypeFromUserAgent(userAgent: string | null | undefined): AnalyticsDeviceType {
  const value = userAgent ?? "";

  if (/ipad|tablet|kindle|silk|playbook/i.test(value)) {
    return "tablet";
  }

  if (/mobi|android|iphone|ipod|blackberry|phone/i.test(value)) {
    return "mobile";
  }

  return "desktop";
}

export function getRequestPath(request: NextRequest) {
  return request.nextUrl.pathname;
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get(COOKIE_CONSENT_COOKIE_NAME)?.value !== "all") return false;
    const consentId = analyticsConsentId(cookieStore.get(ANALYTICS_CONSENT_COOKIE_NAME)?.value);
    if (!consentId) return false;
    const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const consent = await prisma.consentRecord.findFirst({ where: { id: consentId, kind: "analytics", revokedAt: null, grantedAt: { gte: since } } });
    if (!consent) return false;
    if (await shouldExcludeAnalyticsEvent(input)) {
      return true;
    }

    await prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: sanitizeOptionalIdentifier(input.entityId),
        entityName: sanitizeOptionalText(input.entityName, 180),
        userId: null,
        sessionId: consentId,
        path: sanitizeOptionalText(input.path?.split("?")[0], 500) ?? "/",
        referrer: null,
        deviceType: input.deviceType ?? "desktop",
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return true;
  } catch {
    return false;
  }
}
