import "server-only";
import { LEGAL_VERSION, legalSnapshot } from "@/lib/legal";
import { hashSessionToken } from "@/lib/server/auth";

export function consentRecordData(kind: Parameters<typeof legalSnapshot>[0], source: string, email?: string) {
  return { kind, source, documentVersion: LEGAL_VERSION, documentText: legalSnapshot(kind), subjectKey: email ? hashSessionToken(`consent-subject:${email.trim().toLowerCase()}`) : null };
}
