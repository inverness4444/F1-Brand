import { isValidEmail, normalizeEmail, normalizePhone } from "@/lib/account-utils";
import type { AuthUser } from "@/lib/account-types";

export const SECURITY_LIMITS = {
  nameMaxLength: 80,
  emailMaxLength: 254,
  phoneMaxLength: 20,
  passwordMaxLength: 128,
  searchMaxLength: 80,
  addressFieldMaxLength: 120,
  addressCommentMaxLength: 280,
  orderCommentMaxLength: 280,
  profileTextMaxLength: 80,
  newsletterEmailMaxLength: 254,
  promoCodeMaxLength: 32,
  catalogNameMaxLength: 160,
  catalogShortDescriptionMaxLength: 240,
  catalogDescriptionMaxLength: 4000,
  catalogMetadataMaxLength: 120,
  maxCartItemQuantity: 10,
} as const;

export const CSRF_COOKIE_NAME = "apex-store-csrf-v1";
export const CSRF_HEADER_NAME = "x-csrf-token";

const CONTROL_CHARACTERS_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const INLINE_EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=/gi;
const DANGEROUS_PROTOCOL_REGEX = /\b(?:javascript|vbscript)\s*:/gi;
const DATA_HTML_REGEX = /data\s*:\s*text\/html/gi;
const ANGLE_BRACKETS_REGEX = /[<>]/g;
const WHITESPACE_REGEX = /\s+/g;
const MULTILINE_WHITESPACE_REGEX = /[^\S\r\n]+/g;
const IDENTIFIER_SAFE_CHARS_REGEX = /[^a-z0-9_-]+/gi;
const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DATA_IMAGE_BASE64_URL_REGEX = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const ALLOWED_IMAGE_URL_REGEX = /^(?:\/|https?:\/\/|blob:)/i;

function collapseWhitespace(value: string, allowLineBreaks: boolean) {
  if (!allowLineBreaks) {
    return value.replace(WHITESPACE_REGEX, " ").trim();
  }

  return value
    .split("\n")
    .map((line) => line.replace(MULTILINE_WHITESPACE_REGEX, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

type SanitizeTextOptions = {
  maxLength?: number;
  allowLineBreaks?: boolean;
};

export function sanitizeText(value: string, options: SanitizeTextOptions = {}) {
  const { maxLength = SECURITY_LIMITS.catalogDescriptionMaxLength, allowLineBreaks = false } = options;
  const raw = typeof value === "string" ? value : "";
  const normalized = raw
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS_REGEX, "")
    .replace(DANGEROUS_PROTOCOL_REGEX, "")
    .replace(DATA_HTML_REGEX, "")
    .replace(INLINE_EVENT_HANDLER_REGEX, "")
    .replace(ANGLE_BRACKETS_REGEX, "");

  const collapsed = collapseWhitespace(normalized, allowLineBreaks);
  return collapsed.slice(0, maxLength).trim();
}

export function sanitizeEmail(value: string) {
  return normalizeEmail(sanitizeText(value, { maxLength: SECURITY_LIMITS.emailMaxLength }));
}

export function sanitizePhone(value: string) {
  return normalizePhone(sanitizeText(value, { maxLength: SECURITY_LIMITS.phoneMaxLength }));
}

export function sanitizeSearchQuery(value: string) {
  return sanitizeText(value, { maxLength: SECURITY_LIMITS.searchMaxLength });
}

export function sanitizeAddressField(
  value: string,
  maxLength: number = SECURITY_LIMITS.addressFieldMaxLength,
) {
  return sanitizeText(value, { maxLength });
}

export function sanitizeMultilineComment(
  value: string,
  maxLength: number = SECURITY_LIMITS.orderCommentMaxLength,
) {
  return sanitizeText(value, { maxLength, allowLineBreaks: true });
}

export function sanitizeIdentifier(value: string, fallback = "") {
  const normalized = sanitizeText(value, { maxLength: SECURITY_LIMITS.catalogMetadataMaxLength })
    .toLowerCase()
    .replace(IDENTIFIER_SAFE_CHARS_REGEX, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function sanitizeHexColor(value: string) {
  const normalized = sanitizeText(value, { maxLength: 7 }).toUpperCase();
  return HEX_COLOR_REGEX.test(normalized) ? normalized : "#111111";
}

export function sanitizeAssetUrl(value: string) {
  const raw = typeof value === "string" ? value.trim().replace(CONTROL_CHARACTERS_REGEX, "") : "";

  if (!raw) {
    return "";
  }

  if (DATA_IMAGE_BASE64_URL_REGEX.test(raw)) {
    return raw.replace(/\s+/g, "");
  }

  const normalized = sanitizeText(raw, { maxLength: 4096 });

  if (!normalized) {
    return "";
  }

  if (ALLOWED_IMAGE_URL_REGEX.test(normalized)) {
    return normalized;
  }

  return "";
}

export function safeRedirectPath(value?: string | null, fallback = "/account") {
  if (!value) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://apex-store.local");

    if (url.origin !== "https://apex-store.local") {
      return fallback;
    }

    const nextPath = `${url.pathname}${url.search}${url.hash}`;

    if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
      return fallback;
    }

    if (/[\u0000-\u001F\u007F]/.test(nextPath)) {
      return fallback;
    }

    if (["/login", "/register", "/forgot-password"].some((path) => nextPath.startsWith(path))) {
      return fallback;
    }

    return nextPath;
  } catch {
    return fallback;
  }
}

export function getCsrfTokenFromCookies() {
  if (typeof document === "undefined") {
    return null;
  }

  const rawCookie = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!rawCookie) {
    return null;
  }

  const token = rawCookie.slice(CSRF_COOKIE_NAME.length + 1);
  return sanitizeIdentifier(decodeURIComponent(token), "");
}

export function buildCsrfHeaders(): Record<string, string> {
  const token = getCsrfTokenFromCookies();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

function configuredAdminEmails() {
  return new Set(
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => sanitizeEmail(value))
      .filter((value) => value && isValidEmail(value)),
  );
}

export function resolveUserRole(email: string): AuthUser["role"] {
  return configuredAdminEmails().has(sanitizeEmail(email)) ? "admin" : "customer";
}

export function canAccessAdmin(user: Pick<AuthUser, "role"> | null | undefined) {
  if (!user) {
    return false;
  }

  return user.role === "admin" || process.env.NODE_ENV !== "production";
}
