import assert from "node:assert/strict";
import test from "node:test";
import { LEGAL_VERSION } from "../src/lib/legal";
import { newsletterSubscriptionSchema, registerPayloadSchema } from "../src/lib/validation-schemas";
import { emptyProductCompliance, productComplianceIssues, isConformityRegistryUrl } from "../src/lib/product-compliance";
import { isPublicProduct } from "../src/lib/product-visibility";
import { getDeliveryDeadline, deliveryPromiseConfig, canCheckoutWithDeliveryDeadline } from "../src/lib/delivery-promise";
import { COOKIE_CONSENT_COOKIE_NAME } from "../src/lib/cookie-constants";
import { hasAnalyticsConsent, saveCookieConsent } from "../src/lib/analytics-consent";
import { trackAnalyticsEvent } from "../src/services/analytics-service";

test("рассылка отклоняется без любого из двух отдельных согласий и с устаревшей версией", () => {
  const payload = { email: "test@example.org", source: "homepage", dataConsent: true, adsConsent: true, consentVersion: LEGAL_VERSION };
  assert.equal(newsletterSubscriptionSchema.safeParse(payload).success, true);
  for (const changed of [{ adsConsent: false }, { dataConsent: false }, { consentVersion: "old" }, { dataConsent: undefined }]) {
    assert.equal(newsletterSubscriptionSchema.safeParse({ ...payload, ...changed }).success, false);
  }
});

test("регистрация требует принятия конкретного соглашения и не принимает объединённое старое подтверждение", () => {
  const payload = { name: "Тест", email: "test@example.org", phone: "+79995553322", password: "Test-password-123", acceptedLegal: true, termsVersion: LEGAL_VERSION };
  assert.equal(registerPayloadSchema.safeParse(payload).success, true);
  assert.equal(registerPayloadSchema.safeParse({ ...payload, termsVersion: undefined }).success, false);
  assert.equal(registerPayloadSchema.safeParse({ ...payload, acceptedLegal: false }).success, false);
});

test("действующие товары остаются видимыми; внутренний чеклист отмечает отсутствующие документы", () => {
  const product = { status: "ACTIVE" as const, productType: "standard" as const, compliance: { ...emptyProductCompliance } };
  assert.ok(productComplianceIssues(product).length > 0);
  assert.equal(isPublicProduct(product), true);
  const ready = { ...product, compliance: { ...emptyProductCompliance, composition: "Фиктивные тестовые материалы", manufacturer: "Тестовый изготовитель", manufacturerAddress: "Тестовый адрес", countryOfOrigin: "Россия", careInstructions: "Тестовая инструкция", conformityKind: "declaration" as const, conformityNumber: "Тестовый номер", conformityRegistryUrl: "https://pub.fsa.gov.ru/rds/declaration/view/123", markingStatus: "not_required" as const, markingBasis: "Тестовое основание", rightsStatus: "own" as const, rightsBasis: "Тестовый собственный дизайн" } };
  assert.equal(productComplianceIssues(ready).length, 0);
  assert.equal(isPublicProduct(ready), true);
  assert.equal(isPublicProduct({ ...ready, status: "DRAFT" }), false);
  const pendingRights = { ...ready, compliance: { ...ready.compliance, rightsStatus: "pending" as const } };
  assert.equal(isPublicProduct(pendingRights), true);
  assert.ok(productComplianceIssues(pendingRights).length > 0);
  assert.equal(isPublicProduct({ status: "ACTIVE" }), true);
});

test("ссылка на сертификат допускает официальный реестр и отвергает подмену домена", () => {
  assert.equal(isConformityRegistryUrl("https://pub.fsa.gov.ru/rss/certificate/view/123"), true);
  for (const value of ["javascript:alert(1)", "http://pub.fsa.gov.ru/", "https://pub.fsa.gov.ru.evil.example/", "https://pub.fsa.gov.ru@evil.example/", "https://evil.example/"]) assert.equal(isConformityRegistryUrl(value), false);
});

test("срок передачи учитывает московскую дату и календарные дни, пустые настройки не заменяются предположением", () => {
  const saved = [process.env.NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS, process.env.NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS];
  try {
    delete process.env.NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS;
    delete process.env.NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS;
    assert.equal(getDeliveryDeadline(), null);
    process.env.NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS = "10";
    process.env.NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS = "5";
    assert.equal(getDeliveryDeadline(new Date("2026-12-31T21:30:00Z")), "2027-01-16");
    process.env.NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS = "-1";
    assert.equal(deliveryPromiseConfig(), null);
  } finally {
    for (const [index, key] of ["NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS", "NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS"].entries()) {
      if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index];
    }
  }
});

test("локальное оформление доступно без срока, production требует срок для доставки", () => {
  assert.equal(canCheckoutWithDeliveryDeadline(true, null, "development"), true);
  assert.equal(canCheckoutWithDeliveryDeadline(true, null, "production"), false);
  assert.equal(canCheckoutWithDeliveryDeadline(true, null, "test"), false);
  assert.equal(canCheckoutWithDeliveryDeadline(true, "2026-10-20", "production"), true);
  assert.equal(canCheckoutWithDeliveryDeadline(false, null, "production"), true);
});

test("до согласия нет сетевой аналитики; отказ между событием и отправкой отменяет очередь и очищает старый идентификатор", () => {
  const savedWindow = globalThis.window;
  const savedDocument = globalThis.document;
  const savedFetch = globalThis.fetch;
  const pending: Array<() => void> = [];
  const removed: string[] = [];
  let requests = 0;
  const documentStub = { cookie: "", referrer: "" };
  const windowStub = { location: { protocol: "https:", pathname: "/shop", search: "?email=private@example.org" }, innerWidth: 1200, localStorage: { removeItem: (key: string) => removed.push(key) }, dispatchEvent: () => true, setTimeout: (callback: () => void) => { pending.push(callback); return 1; } };
  try {
    globalThis.document = documentStub as unknown as Document;
    globalThis.window = windowStub as unknown as Window & typeof globalThis;
    globalThis.fetch = (() => { requests++; return Promise.resolve(new Response()); }) as typeof fetch;
    const event = { eventType: "add_to_cart" as const, entityType: "product" as const };
    trackAnalyticsEvent(event);
    assert.equal(requests, 0); assert.equal(pending.length, 0);
    documentStub.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=essential`;
    assert.equal(hasAnalyticsConsent(), false);
    documentStub.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=all`;
    trackAnalyticsEvent(event);
    assert.equal(pending.length, 1);
    saveCookieConsent("essential");
    pending.shift()?.();
    assert.equal(requests, 0); assert.ok(removed.length > 0);
  } finally { globalThis.window = savedWindow; globalThis.document = savedDocument; globalThis.fetch = savedFetch; }
});
