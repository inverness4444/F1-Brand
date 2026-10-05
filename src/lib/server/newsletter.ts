import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { hashSessionToken } from "@/lib/server/auth";
import { getSiteUrl } from "@/lib/seo";

export function newsletterEligibilityWhere(now = new Date()): Prisma.NewsletterSubscriberWhereInput {
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 3);
  return { status: "ACTIVE", dataConsentAt: { gte: since }, adsConsentAt: { gte: since }, consentVersion: { not: null } };
}

export function newsletterUnsubscribeToken(id: string) {
  return `${id}.${hashSessionToken(`newsletter-unsubscribe:${id}`)}`;
}

export function newsletterUnsubscribeUrl(id: string) {
  return `${getSiteUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(newsletterUnsubscribeToken(id))}`;
}

export function subscriberIdFromToken(token: string) {
  const split = token.lastIndexOf(".");
  if (split < 1) return null;
  const id = token.slice(0, split);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const expected = hashSessionToken(`newsletter-unsubscribe:${id}`);
  const signature = token.slice(split + 1);
  if (!/^[a-f0-9]{64}$/.test(signature)) return null;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")) ? id : null;
}
