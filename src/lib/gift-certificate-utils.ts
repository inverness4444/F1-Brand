import { sanitizeGiftCertificateCode } from "@/lib/security-utils";

const GIFT_CERTIFICATE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const GIFT_CERTIFICATE_CODE_LENGTH = 8;

function createSecureRandomValues(length: number) {
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    return globalThis.crypto.getRandomValues(new Uint32Array(length));
  }

  return Uint32Array.from(
    { length },
    () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  );
}

function createRandomCode() {
  const randomValues = createSecureRandomValues(GIFT_CERTIFICATE_CODE_LENGTH);

  return Array.from(randomValues, (value) => GIFT_CERTIFICATE_ALPHABET[value % GIFT_CERTIFICATE_ALPHABET.length]).join(
    "",
  );
}

export function normalizeGiftCertificateCode(value: string) {
  return sanitizeGiftCertificateCode(value);
}

export function validateGiftCertificateCode(value: string) {
  return /^[A-Z]{8}$/.test(value);
}

export function generateGiftCertificateCode(existingCodes: Set<string> = new Set()) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nextCode = createRandomCode();

    if (!existingCodes.has(nextCode)) {
      return nextCode;
    }
  }

  return generateGiftCertificateCode(existingCodes);
}
