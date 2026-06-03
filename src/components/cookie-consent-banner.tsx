"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  COOKIE_CONSENT_COOKIE_NAME,
  cookieConsentValues,
  type CookieConsentValue,
} from "@/lib/cookie-constants";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function isCookieConsentValue(value: string | null): value is CookieConsentValue {
  return cookieConsentValues.includes(value as CookieConsentValue);
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const rawCookie = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name}=`));

  if (!rawCookie) {
    return null;
  }

  return decodeURIComponent(rawCookie.slice(name.length + 1));
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!isCookieConsentValue(readCookie(COOKIE_CONSENT_COOKIE_NAME)));
  }, []);

  const saveChoice = (value: CookieConsentValue) => {
    writeCookie(COOKIE_CONSENT_COOKIE_NAME, value);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-10 z-[80] px-3 sm:bottom-14 sm:px-6">
      <div
        data-cookie-consent-banner="true"
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

        <div className="relative z-10 flex w-full flex-col gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
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
                Pit stop cookies
              </p>
              <p className="mt-1.5 max-w-[33rem] text-sm leading-6 text-white/84 sm:text-[0.93rem] sm:leading-6">
                Используем cookies, чтобы сайт работал быстрее{" "}
                <span className="whitespace-nowrap">пит-стопа</span>: сохраняем корзину, настройки и улучшаем сервис. Необязательные — только после согласия.
              </p>
              <Link
                href="/privacy"
                className="mt-2 inline-flex text-sm font-semibold text-white/88 underline-offset-4 transition duration-200 hover:-translate-y-px hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
              >
                Политика конфиденциальности
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-[290px] sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full whitespace-nowrap rounded-full border-white/24 bg-white/92 px-4 text-[0.78rem] font-bold text-black shadow-none transition duration-200 hover:-translate-y-px hover:border-white/50 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:w-auto sm:text-[0.88rem]"
              onClick={() => saveChoice("essential")}
            >
              Только необходимые
            </Button>
            <Button
              className="w-full whitespace-nowrap rounded-full border border-white/38 bg-black/94 px-4 text-[0.78rem] font-bold text-white shadow-[0_0_26px_rgba(215,25,32,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:-translate-y-px hover:border-[#c9a44c]/68 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:w-auto sm:px-5 sm:text-[0.88rem]"
              onClick={() => saveChoice("all")}
            >
              Принять все
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
