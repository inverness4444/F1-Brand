import { COOKIE_CONSENT_COOKIE_NAME, cookieConsentValues, type CookieConsentValue } from "@/lib/cookie-constants";
import { storageKeys } from "@/lib/browser-storage";

export const COOKIE_SETTINGS_EVENT = "velocity:cookie-settings";
export const COOKIE_CONSENT_EVENT = "velocity:cookie-consent";

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`))?.slice(COOKIE_CONSENT_COOKIE_NAME.length + 1);
  return cookieConsentValues.includes(value as CookieConsentValue) ? value as CookieConsentValue : null;
}

export function hasAnalyticsConsent() {
  return readCookieConsent() === "all";
}

export function saveCookieConsent(value: CookieConsentValue) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  if (value !== "all") clearAnalyticsStorage();
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function clearAnalyticsStorage() {
  try { window.localStorage.removeItem(storageKeys.analyticsSession); } catch { /* Storage may be disabled. */ }
}
