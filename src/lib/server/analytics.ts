import "server-only";

import type { Prisma } from "@prisma/client";
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
  sessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  deviceType?: AnalyticsDeviceType | null;
  metadata?: AnalyticsMetadata | null;
};

function sanitizeOptionalText(value: string | null | undefined, maxLength: number) {
  const sanitizedValue = sanitizeText(value ?? "", { maxLength });
  return sanitizedValue || null;
}

function sanitizeOptionalIdentifier(value: string | null | undefined) {
  return value ? sanitizeIdentifier(value, "") || null : null;
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
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: sanitizeOptionalIdentifier(input.entityId),
        entityName: sanitizeOptionalText(input.entityName, 180),
        userId: sanitizeOptionalIdentifier(input.userId),
        sessionId: sanitizeOptionalIdentifier(input.sessionId),
        path: sanitizeOptionalText(input.path, 500) ?? "/",
        referrer: sanitizeOptionalText(input.referrer, 500),
        deviceType: input.deviceType ?? "desktop",
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return true;
  } catch {
    return false;
  }
}
