"use client";

import { COOKIE_SETTINGS_EVENT } from "@/lib/analytics-consent";

export function CookieSettingsButton() {
  return <button type="button" className="text-left text-sm text-white/70 underline underline-offset-4 hover:text-white" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>Настройки cookies</button>;
}
