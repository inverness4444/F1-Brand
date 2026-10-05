import "server-only";
import { timingSafeEqual } from "node:crypto";
import { hashSessionToken } from "@/lib/server/auth";
import { LEGAL_VERSION } from "@/lib/legal";

export function analyticsConsentToken(id: string) {
  return `${id}.${hashSessionToken(`analytics-consent:${LEGAL_VERSION}:${id}`)}`;
}

export function analyticsConsentId(token: string | undefined) {
  if (!token) return null;
  const split = token.lastIndexOf(".");
  const id = token.slice(0, split);
  const signature = token.slice(split + 1);
  if (split < 1 || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = hashSessionToken(`analytics-consent:${LEGAL_VERSION}:${id}`);
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")) ? id : null;
}
