"use client";

import { LEGAL_VERSION } from "@/lib/legal";
import { buildCsrfHeaders } from "@/lib/security-utils";
import Link from "next/link";
import { useEffect, useState } from "react";

import { COOKIE_SETTINGS_EVENT, clearAnalyticsStorage, hasAnalyticsConsent, readCookieConsent, saveCookieConsent } from "@/lib/analytics-consent";
import type { CookieConsentValue } from "@/lib/cookie-constants";
import { Button } from "@/components/ui/button";

export function CookieConsentBanner() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(readCookieConsent() === null);
    if (!hasAnalyticsConsent()) clearAnalyticsStorage();
    const reopen = () => setIsVisible(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const saveChoice = async (value: CookieConsentValue) => {
    setSaving(true); setError("");
    // Refusal takes effect locally even if the server cannot be reached.
    if (value === "essential") saveCookieConsent(value);
    try {
      const response = await fetch("/api/consents/analytics", { method: "POST", headers: { "Content-Type": "application/json", ...buildCsrfHeaders() }, body: JSON.stringify({ choice: value, documentVersion: LEGAL_VERSION }) });
      if (!response.ok) throw new Error("Не удалось сохранить выбор на сервере. Аналитика отключена; повторите позже.");
      saveCookieConsent(value); setIsVisible(false);
    } catch (error) {
      saveCookieConsent("essential");
      setError(error instanceof Error ? error.message : "Повторите позже.");
    } finally { setSaving(false); }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-10 z-[80] px-3 sm:bottom-14 sm:px-6">
      <div
        data-cookie-consent-banner="true"
        role="region"
        aria-label="Выбор файлов cookie"
        className="relative mx-auto flex w-full max-w-[920px] overflow-hidden rounded-[24px] border border-white/16 bg-[#050505] text-white shadow-[0_22px_80px_rgba(0,0,0,0.46)] sm:rounded-[26px]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-[1.03] bg-[url('/cookie-pit-bg.png')] bg-cover bg-center opacity-45 blur-[6px]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),#c9a44c,#d71920,rgba(255,255,255,0.32),transparent)] shadow-[0_0_18px_rgba(215,25,32,0.22)]"
        />

        <div className="relative z-10 flex w-full flex-col gap-4 px-4 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3.5 sm:gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#c9a44c]/42 bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.16),rgba(12,12,12,0.88)_45%,rgba(0,0,0,0.96)_100%)] text-white shadow-[0_0_22px_rgba(201,164,76,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]">
              <img
                src="/cookie-helmet.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-12 object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-white/88">
                Настройки cookies
              </p>
              <p className="mt-1.5 max-w-[33rem] text-sm leading-6 text-white/84 sm:text-[0.93rem] sm:leading-6">
                Необходимые cookies сохраняют вход, корзину и защищают формы. Аналитика включится только с вашего разрешения. Выбор можно изменить внизу сайта.
              </p>
              <Link href="/consent/analytics" target="_blank" className="mt-2 block text-sm underline underline-offset-4">Отдельное согласие на аналитику</Link>
              {error ? <p role="alert" className="mt-2 text-sm text-white">{error}</p> : null}
              <Link
                href="/privacy"
                className="mt-2 inline-flex text-sm font-semibold text-white/88 underline-offset-4 transition duration-200 hover:-translate-y-px hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
              >
                Политика обработки данных
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end lg:min-w-[240px] lg:flex-col">
            <Button
              variant="secondary"
              className="w-full whitespace-nowrap rounded-full border-white/24 bg-white/92 px-4 text-[0.78rem] font-bold text-black shadow-none transition duration-200 hover:-translate-y-px hover:border-white/50 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:w-auto sm:text-[0.88rem]"
              disabled={saving}
              onClick={() => void saveChoice("essential")}
            >
              Только необходимые
            </Button>
            <Button
              className="w-full whitespace-nowrap rounded-full border border-white/38 bg-black/94 px-4 text-[0.78rem] font-bold text-white shadow-[0_0_26px_rgba(215,25,32,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:-translate-y-px hover:border-[#c9a44c]/68 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:w-auto sm:px-5 sm:text-[0.88rem]"
              disabled={saving}
              onClick={() => void saveChoice("all")}
            >
              Разрешить аналитику
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
