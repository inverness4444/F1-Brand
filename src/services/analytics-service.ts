"use client";

import type {
  AnalyticsDeviceType,
  AnalyticsEntityType,
  AnalyticsEventType,
} from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import { buildCsrfHeaders } from "@/lib/security-utils";

type AnalyticsMetadata = Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;

type TrackAnalyticsEventInput = {
  eventType: AnalyticsEventType;
  entityType: AnalyticsEntityType;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: AnalyticsMetadata | null;
};

function getDeviceType(): AnalyticsDeviceType {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const width = window.innerWidth;

  if (width < 768) {
    return "mobile";
  }

  if (width < 1024) {
    return "tablet";
  }

  return "desktop";
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return;
  }

  const payload = {
    ...input,
    sessionId: null,
    path: window.location.pathname,
    referrer: document.referrer ? new URL(document.referrer).origin : null,
    deviceType: getDeviceType(),
  };

  window.setTimeout(() => {
    if (!hasAnalyticsConsent()) return;
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }, 0);
}
