import { NextRequest, NextResponse } from "next/server";

import { analyticsEventPayloadSchema } from "@/lib/validation-schemas";
import { getCurrentUser } from "@/lib/server/auth";
import { apiError, noStoreJson } from "@/lib/server/api";
import {
  getDeviceTypeFromUserAgent,
  getRequestPath,
  recordAnalyticsEvent,
} from "@/lib/server/analytics";
import { assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "analytics-events", {
      maxAttempts: 240,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много событий. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertSameOrigin(request);

    const input = analyticsEventPayloadSchema.parse(await request.json());
    const currentUser = await getCurrentUser().catch(() => null);
    const stored = await recordAnalyticsEvent({
      ...input,
      userId: currentUser?.id ?? null,
      path: input.path || getRequestPath(request),
      referrer: input.referrer ?? request.headers.get("referer"),
      deviceType: input.deviceType ?? getDeviceTypeFromUserAgent(request.headers.get("user-agent")),
    });

    return noStoreJson({ ok: stored });
  } catch (error) {
    return apiError(error, "Не удалось записать событие аналитики.");
  }
}
