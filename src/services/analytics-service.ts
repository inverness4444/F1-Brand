"use client";

import type {
  AnalyticsDeviceType,
  AnalyticsEntityType,
  AnalyticsEventType,
} from "@/lib/analytics";
import { storageKeys } from "@/lib/browser-storage";
import { buildCsrfHeaders } from "@/lib/security-utils";

type AnalyticsMetadata = Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;

type TrackAnalyticsEventInput = {
  eventType: AnalyticsEventType;
  entityType: AnalyticsEntityType;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: AnalyticsMetadata | null;
};

function getSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existingSessionId = window.localStorage.getItem(storageKeys.analyticsSession);

  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(storageKeys.analyticsSession, nextSessionId);
  return nextSessionId;
}

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
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    ...input,
    sessionId: getSessionId(),
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    deviceType: getDeviceType(),
  };

  window.setTimeout(() => {
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
