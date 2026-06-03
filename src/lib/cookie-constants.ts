export const SESSION_COOKIE_NAME = "velocity-club-session-v1";
export const ROLE_COOKIE_NAME = "velocity-club-role-v1";
export const CHECKOUT_ACCESS_COOKIE_NAME = "velocity-club-checkout-order-v1";
export const GUEST_CART_COOKIE_NAME = "velocity-club-guest-cart-v1";
export const COOKIE_CONSENT_COOKIE_NAME = "velocity-club-cookie-consent-v1";

export const cookieConsentValues = ["all", "essential"] as const;

export type CookieConsentValue = (typeof cookieConsentValues)[number];
