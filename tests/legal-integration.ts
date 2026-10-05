import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LEGAL_VERSION } from "../src/lib/legal";
import { emptyProductCompliance } from "../src/lib/product-compliance";
import { COOKIE_CONSENT_COOKIE_NAME, ANALYTICS_CONSENT_COOKIE_NAME, ROLE_COOKIE_NAME } from "../src/lib/cookie-constants";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../src/lib/security-utils";

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function main() {
  const withoutDeliveryDeadline = process.argv.includes("--without-delivery-deadline");
  const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
  if (pgConfig.status !== 0) throw new Error("Для изолированной проверки требуется установленный PostgreSQL (pg_config).");
  const pgBin = pgConfig.stdout.trim();
  const dir = mkdtempSync(path.join(tmpdir(), "velocity-legal-test-"));
  const dbPort = await freePort();
  const appPort = await freePort();
  const tsconfigBefore = readFileSync("tsconfig.json", "utf8");
  const nextEnvBefore = readFileSync("next-env.d.ts", "utf8");
  const distDir = `.next-legal-test-${process.pid}`;
  const url = `postgresql://velocity_legal_test@127.0.0.1:${dbPort}/velocity_legal_test?schema=public`;
  const base = `http://127.0.0.1:${appPort}`;
  const secret = "isolated-legal-test-secret-never-for-production";
  const testEnv = { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url, AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, AUTH_URL: base, NEXTAUTH_URL: base,
    APP_URL: base, NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_SITE_INDEXABLE: "false", NEXT_DIST_DIR: distDir, CATALOG_SOURCE: "auto", COOKIE_SECURE: "false",
    YOOKASSA_SHOP_ID: "", YOOKASSA_SECRET_KEY: "", YOOKASSA_WEBHOOK_SECRET: "", YOOKASSA_RECEIPT_ENABLED: "true", ENABLE_MOCK_PAYMENTS: "false",
    RATE_LIMIT_REDIS_REST_URL: "", RATE_LIMIT_REDIS_REST_TOKEN: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "",
    NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS: withoutDeliveryDeadline ? "" : "10", NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS: withoutDeliveryDeadline ? "" : "5", NEXT_PUBLIC_SELLER_ADDRESS: "ТЕСТОВЫЙ АДРЕС — не реальные реквизиты",
    NEXT_PUBLIC_SELLER_REGISTRATION_AUTHORITY: "ТЕСТОВЫЙ ОРГАН", NEXT_PUBLIC_RETURN_ADDRESS: "ТЕСТОВЫЙ АДРЕС ВОЗВРАТА", NEXT_PUBLIC_RETURN_RECIPIENT: "ТЕСТОВЫЙ ПОЛУЧАТЕЛЬ",
    PERSONAL_DATA_RF_VERIFIED: "true", RKN_NOTIFICATION_VERIFIED: "true", FISCAL_PROCESS_VERIFIED: "true", RETENTION_JOB_VERIFIED: "true" };
  const run = (command: string, args: string[], env: NodeJS.ProcessEnv = testEnv) => {
    const result = spawnSync(command, args, { env, encoding: "utf8", timeout: 120_000 });
    if (result.status !== 0) throw new Error(`${path.basename(command)} failed: ${result.stderr || result.stdout}`);
    return result.stdout;
  };
  let pgStarted = false;
  let app: ReturnType<typeof spawn> | undefined;
  let appLog = "";
  const db = new PrismaClient({ datasources: { db: { url } } });
  let checks = 0;
  const check = (label: string) => { checks++; console.log(`✓ ${label}`); };
  try {
    run(path.join(pgBin, "initdb"), ["-D", path.join(dir, "pg"), "-U", "velocity_legal_test", "-A", "trust", "--encoding=UTF8", "--locale=C"]);
    run(path.join(pgBin, "pg_ctl"), ["-D", path.join(dir, "pg"), "-l", path.join(dir, "pg.log"), "-o", `-p ${dbPort} -h 127.0.0.1 -k ${dir}`, "-w", "start"]);
    pgStarted = true;
    run(path.join(pgBin, "createdb"), ["-h", "127.0.0.1", "-p", String(dbPort), "-U", "velocity_legal_test", "velocity_legal_test"]);
    run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    check("все миграции применяются к пустой изолированной PostgreSQL");
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(appPort), "--hostname", "127.0.0.1"], { env: { ...testEnv, NODE_ENV: "development" }, stdio: ["ignore", "pipe", "pipe"] });
    const keepLog = (chunk: Buffer) => { appLog = (appLog + chunk.toString()).slice(-12000); };
    app.stdout?.on("data", keepLog); app.stderr?.on("data", keepLog);
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      try { if ((await fetch(`${base}/api/catalog`)).ok) { ready = true; break; } } catch { /* Server is starting. */ }
      if (app.exitCode !== null) throw new Error(`Test site stopped: ${appLog}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(ready, `Сайт не запустился: ${appLog}`);
    const jar = new Map<string, string>([[CSRF_COOKIE_NAME, "isolated-test-csrf"]]);
    async function request(route: string, body?: unknown, method = body === undefined ? "GET" : "POST", cookies = jar) {
      const response = await fetch(`${base}${route}`, { method, headers: { Origin: base, [CSRF_HEADER_NAME]: cookies.get(CSRF_COOKIE_NAME) || "isolated-test-csrf", Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "manual" });
      for (const value of response.headers.getSetCookie()) {
        const [pair] = value.split(";"); const split = pair.indexOf("=");
        const name = pair.slice(0, split); const cookieValue = pair.slice(split + 1);
        if (value.includes("Max-Age=0")) cookies.delete(name); else cookies.set(name, cookieValue);
      }
      return response;
    }
    const register = { name: "ТЕСТОВЫЙ ПОКУПАТЕЛЬ", email: "isolated@example.org", phone: "+79995553322", password: "Isolated-test-12345", acceptedLegal: true, termsVersion: LEGAL_VERSION };
    assert.equal((await request("/api/auth/register", { ...register, acceptedLegal: false })).status, 400);
    assert.equal((await request("/api/auth/register", { ...register, termsVersion: "old" })).status, 400);
    assert.equal(await db.user.count(), 0);
    const registration = await request("/api/auth/register", register);
    assert.equal(registration.status, 200);
    const user = (await registration.json()).user;
    const terms = await db.consentRecord.findFirstOrThrow({ where: { userId: user.id, kind: "terms" } });
    assert.equal(terms.documentVersion, LEGAL_VERSION); assert.ok(terms.documentText.includes("Стороны"));
    assert.equal(await db.newsletterSubscriber.count(), 0);
    check("регистрация отклоняет старую / непринятую редакцию и сохраняет соглашение без рекламной подписки");

    const legacyLogin = { email: "legacy-login@example.org", password: "Legacy-test-password-123", rememberMe: false };
    const legacyUser = await db.user.create({ data: { name: "ТЕСТОВЫЙ СТАРЫЙ АККАУНТ", email: legacyLogin.email, passwordHash: await bcrypt.hash(legacyLogin.password, 10) } });
    const legacyJar = new Map([[CSRF_COOKIE_NAME, "legacy-login-test-csrf"]]);
    assert.equal((await request("/api/auth/login", { ...legacyLogin, password: "Incorrect-test-password" }, "POST", legacyJar)).status, 401);
    assert.equal(await db.session.count({ where: { userId: legacyUser.id } }), 0);
    const loginResponse = await request("/api/auth/login", legacyLogin, "POST", legacyJar);
    assert.equal(loginResponse.status, 200);
    assert.equal((await loginResponse.json()).user.profileConsentGranted, false);
    const legacySession = await (await request("/api/auth/session", undefined, "GET", legacyJar)).json();
    assert.equal(legacySession.user.id, legacyUser.id);
    assert.ok(await db.cart.findUnique({ where: { userId: legacyUser.id } }));
    assert.ok(await db.userBalance.findUnique({ where: { userId: legacyUser.id } }));
    assert.equal(await db.consentRecord.count({ where: { userId: legacyUser.id } }), 0);
    await db.user.update({ where: { id: legacyUser.id }, data: { status: "DISABLED" } });
    assert.equal((await request("/api/auth/login", legacyLogin, "POST", legacyJar)).status, 403);
    assert.equal((await (await request("/api/auth/session", undefined, "GET", legacyJar)).json()).user, null);
    check("вход старого аккаунта без новых согласий работает; неверный пароль и отключённый аккаунт отклоняются; сессия проверяется");

    const profile = { name: register.name, email: register.email, phone: register.phone, birthday: "1990-01-01", favoriteDriver: "Тест", favoriteTeam: "Тест", profileConsent: true, consentVersion: LEGAL_VERSION };
    assert.equal((await request("/api/account/profile", profile, "PATCH")).status, 200);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: user.id } })).birthday);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).profileConsentVersion, LEGAL_VERSION);
    assert.equal((await request("/api/account/profile", { ...profile, profileConsent: false }, "PATCH")).status, 200);
    const cleared = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(cleared.birthday, null); assert.equal(cleared.favoriteTeam, null); assert.equal(cleared.profileConsentVersion, null);
    assert.ok((await db.consentRecord.findFirstOrThrow({ where: { kind: "profile" } })).revokedAt);
    check("отзыв персонализации удаляет необязательные данные и сохраняет аккаунт");

    const newsletter = { email: "subscriber@example.org", source: "homepage", dataConsent: true, adsConsent: true, consentVersion: LEGAL_VERSION };
    assert.equal((await request("/api/newsletter/subscribe", { ...newsletter, adsConsent: false })).status, 400);
    assert.equal((await request("/api/newsletter/subscribe", { ...newsletter, dataConsent: false })).status, 400);
    assert.equal(await db.newsletterSubscriber.count(), 0);
    assert.equal((await request("/api/newsletter/subscribe", newsletter)).status, 200);
    const subscriber = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email: newsletter.email } });
    assert.equal(await db.consentRecord.count({ where: { newsletterSubscriberId: subscriber.id, revokedAt: null } }), 2);
    await db.newsletterSubscriber.create({ data: { email: "legacy@example.org", status: "ACTIVE" } });
    await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    jar.set(ROLE_COOKIE_NAME, `ADMIN.${createHmac("sha256", secret).update("ADMIN").digest("hex")}`);
    const exportResponse = await request("/api/admin/newsletter-subscribers?status=ACTIVE");
    assert.equal(exportResponse.status, 200);
    const exported = (await exportResponse.json()).subscribers;
    assert.equal(exported.length, 1); assert.equal(exported[0].email, newsletter.email);
    const token = new URL(exported[0].unsubscribeUrl).searchParams.get("token");
    assert.ok(token);
    await request(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
    assert.equal((await db.newsletterSubscriber.findUniqueOrThrow({ where: { id: subscriber.id } })).status, "ACTIVE");
    assert.equal((await request("/api/newsletter/unsubscribe", { token: `${token.slice(0, -1)}z` })).status, 400);
    assert.equal((await request("/api/newsletter/unsubscribe", { token })).status, 200);
    assert.equal((await request("/api/newsletter/unsubscribe", { token })).status, 200);
    assert.equal((await db.newsletterSubscriber.findUniqueOrThrow({ where: { id: subscriber.id } })).status, "UNSUBSCRIBED");
    assert.equal(await db.consentRecord.count({ where: { newsletterSubscriberId: subscriber.id, revokedAt: null } }), 0);
    assert.equal((await (await request("/api/admin/newsletter-subscribers?status=ACTIVE")).json()).subscribers.length, 0);
    check("два согласия записаны отдельно; старые подписки исключены; просмотр ссылки не отписывает; отказ прекращает допуск к рассылке");

    const analytics = { eventType: "add_to_cart", entityType: "product", entityName: "ТЕСТ", path: "/shop?email=private@example.org" };
    assert.equal((await request("/api/analytics/events", analytics)).status, 403);
    jar.set(COOKIE_CONSENT_COOKIE_NAME, "all");
    assert.equal((await (await request("/api/analytics/events", analytics)).json()).ok, false);
    assert.equal(await db.analyticsEvent.count(), 0);
    assert.equal((await request("/api/consents/analytics", { choice: "all", documentVersion: "old" })).status, 400);
    assert.equal((await request("/api/consents/analytics", { choice: "all", documentVersion: LEGAL_VERSION })).status, 200);
    const replayJar = new Map(jar);
    assert.ok(jar.get(ANALYTICS_CONSENT_COOKIE_NAME));
    assert.equal((await (await request("/api/analytics/events", analytics)).json()).ok, true);
    const event = await db.analyticsEvent.findFirstOrThrow();
    assert.equal(event.path, "/shop"); assert.equal(event.userId, null);
    assert.equal((await request("/api/consents/analytics", { choice: "essential", documentVersion: LEGAL_VERSION })).status, 200);
    assert.equal(await db.analyticsEvent.count(), 0);
    assert.equal((await request("/api/analytics/events", analytics)).status, 403);
    assert.equal((await (await request("/api/analytics/events", analytics, "POST", replayJar)).json()).ok, false);
    check("аналитика требует подтверждённое согласие; отказ удаляет события; старый токен после отзыва не работает");

    const category = await db.category.create({ data: { name: "Essentials", slug: "test" } });
    const size = await db.size.create({ data: { value: "S", label: "S" } });
    const color = await db.color.create({ data: { value: "Black", label: "Чёрный" } });
    const physical = await db.product.create({ data: { name: "ТЕСТОВЫЙ ТОВАР", slug: "isolated-test", description: "Фиктивная проверочная карточка", shortDescription: "Тест", priceCents: 1000, categoryId: category.id,
      images: { create: { url: "/hero-racing-collection-rotated.jpg", isPrimary: true } }, variants: { create: { sku: "TEST-S", sizeId: size.id, colorId: color.id, stock: 10 } } } });
    assert.equal((await (await request("/api/catalog")).json()).products.length, 1);
    const cart = await db.cart.findUniqueOrThrow({ where: { userId: user.id } });
    await db.cartItem.create({ data: { cartId: cart.id, productId: physical.id, color: "Black", size: "S", quantity: 1 } });
    const deadline = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) + "T12:00:00Z");
    deadline.setUTCDate(deadline.getUTCDate() + 15);
    const address = { country: "Россия", city: "ТЕСТОВЫЙ ГОРОД", street: "ТЕСТОВАЯ УЛИЦА", house: "1", apartment: "", postalCode: "101000", recipient: register.name, recipientPhone: register.phone, courierComment: "" };
    const checkout = { userId: user.id, customer: { name: register.name, email: register.email, phone: register.phone }, shippingAddress: address, deliveryMethod: "СДЭК", paymentMethod: "Банковская карта", comment: "", selections: [{ productId: physical.id, color: "Black", size: "S", quantity: 1 }], useBalance: false, requestedBalanceAmount: null, offerVersion: LEGAL_VERSION, deliveryDeadline: withoutDeliveryDeadline ? null : deadline.toISOString().slice(0, 10) };
    const unavailable = await request("/api/cart", { items: [{ ...checkout.selections[0], productId: "missing-file-product" }] }, "PUT");
    assert.equal(unavailable.status, 409);
    assert.ok((await unavailable.json()).error.includes("недоступен"));
    assert.equal(await db.cartItem.count({ where: { cartId: cart.id } }), 1);
    const limitedVariant = await db.productVariant.findFirstOrThrow({ where: { productId: physical.id } });
    await db.productVariant.update({ where: { id: limitedVariant.id }, data: { stock: 1 } });
    assert.equal((await request("/api/cart", { items: [{ ...checkout.selections[0], quantity: 2 }] }, "PUT")).status, 409);
    assert.equal((await db.cartItem.findFirstOrThrow({ where: { cartId: cart.id } })).quantity, 1);
    await db.productVariant.update({ where: { id: limitedVariant.id }, data: { stock: 10 } });
    check("недоступные варианты и нехватка остатка возвращают понятную ошибку и сохраняют прежнюю корзину");
    assert.equal((await request("/api/checkout/create-payment", { ...checkout, deliveryDeadline: "2020-01-01" })).status, 409);
    assert.equal(await db.order.count(), 0);
    const withoutMetadata = await request("/api/checkout/create-payment", checkout);
    assert.equal(withoutMetadata.status, 200);
    const firstOrder = (await withoutMetadata.json()).order;
    const firstStored = await db.order.findUniqueOrThrow({ where: { id: firstOrder.id }, include: { items: true } });
    assert.equal(firstStored.items[0].productInfoSnapshot, null);
    for (const route of ["/api/checkout", "/api/checkout/create-payment"]) {
      const emptyCart = await request(route, checkout);
      assert.equal(emptyCart.status, 409);
      assert.equal((await emptyCart.json()).error, "Корзина пуста. Добавьте товары и повторите оформление.");
    }
    await db.cartItem.create({ data: { cartId: cart.id, productId: physical.id, color: "Black", size: "S", quantity: 1 } });
    const compliance = { ...emptyProductCompliance, composition: "ФИКТИВНЫЙ ТЕСТОВЫЙ СОСТАВ", manufacturer: "ТЕСТОВЫЙ ИЗГОТОВИТЕЛЬ", manufacturerAddress: "ТЕСТОВЫЙ АДРЕС", countryOfOrigin: "Россия", careInstructions: "ТЕСТОВАЯ ИНСТРУКЦИЯ", conformityKind: "not_required", exemptionReason: "Фиктивное основание только для теста", markingStatus: "not_required", markingBasis: "Фиктивное основание только для теста", rightsStatus: "own", rightsBasis: "Фиктивное авторство только для теста" };
    await db.product.update({ where: { id: physical.id }, data: { compliance } });
    assert.equal((await (await request("/api/catalog")).json()).products.length, 1);
    assert.equal((await request("/api/checkout/create-payment", { ...checkout, deliveryDeadline: "2020-01-01" })).status, 409);
    assert.equal(await db.order.count(), 1);
    const placed = await request("/api/checkout/create-payment", checkout);
    assert.equal(placed.status, 200);
    const order = (await placed.json()).order;
    const stored = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    assert.equal(stored.offerVersion, LEGAL_VERSION); assert.ok(stored.returnInstructions?.includes("10 дней")); assert.ok(stored.items[0].productInfoSnapshot);
    assert.equal(stored.deliveryDeadline ? stored.deliveryDeadline.toISOString().slice(0, 10) : null, checkout.deliveryDeadline);
    if (withoutDeliveryDeadline) check("локальный заказ без настроенного срока создаётся с пустым сроком, без выдуманной даты");
    const documentResponse = await request(`/api/account/orders/${order.id}/confirmation`);
    assert.equal(documentResponse.status, 200);
    const document = await documentResponse.text();
    assert.ok(document.includes("ТЕСТОВЫЙ ИЗГОТОВИТЕЛЬ")); assert.ok(document.includes("14 дней")); assert.ok(document.includes("ТЕСТОВЫЙ АДРЕС ВОЗВРАТА"));
    const guestJar = new Map([[CSRF_COOKIE_NAME, "isolated-test-csrf"]]);
    assert.equal((await request(`/api/account/orders/${order.id}/confirmation`, undefined, "GET", guestJar)).status, 403);
    check("товары и покупка без новых полей доступны; подмена срока отклоняется; условия сохранены; доступ к подтверждению защищён");

    const fileCatalogDir = path.join(dir, "file-catalog");
    run(process.execPath, ["--conditions=react-server", "--import", "tsx", "--eval", `
      const fs = require("node:fs"); const path = require("node:path");
      const root = process.cwd(); const workingDir = ${JSON.stringify(fileCatalogDir)};
      const product = { ...JSON.parse(fs.readFileSync("data/catalog-products.json", "utf8"))[0], id: "isolated-file-product", slug: "isolated-file-product", name: "ТЕСТОВАЯ ФУТБОЛКА", stock: 3, price: 3200, oldPrice: null, status: "ACTIVE", badge: "Hit", sizes: ["XS"], colors: ["Black", "White"], colorways: ["Black", "White"], colorwayImages: {}, image: "/mockups/tshirt.svg", gallery: [], productType: "standard", requiresShipping: true, compliance: null, variants: undefined };
      fs.mkdirSync(path.join(workingDir, "data"), { recursive: true });
      fs.writeFileSync(path.join(workingDir, "data/catalog-products.json"), JSON.stringify([product]));
      fs.writeFileSync(path.join(workingDir, "data/catalog-collections.json"), "[]");
      process.chdir(workingDir);
      (async () => {
        const { prisma } = require(path.join(root, "src/lib/prisma.ts"));
        try {
          const { upsertProductFromCatalogPayload, replaceCatalogInDb } = require(path.join(root, "src/lib/server/catalog-db.ts"));
          await upsertProductFromCatalogPayload(product);
          const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } });
          if (saved.variants.length !== 2 || saved.priceCents !== 3200) throw new Error("File product did not reach order database");
          await replaceCatalogInDb([{ ...product, price: 3500 }], []);
          if ((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).priceCents !== 3500) throw new Error("Bulk save did not reach database");
          if (JSON.parse(fs.readFileSync("data/catalog-products.json", "utf8"))[0].price !== 3500) throw new Error("File price was not saved");
        } finally { await prisma.$disconnect(); }
      })().catch(error => { console.error(error.message); process.exitCode = 1; });
    `], { ...testEnv, CATALOG_SOURCE: "file", NODE_PATH: path.join(process.cwd(), "node_modules/next/dist/compiled"), TSX_TSCONFIG_PATH: path.join(process.cwd(), "tsconfig.json") });
    const fileSelection = { productId: "isolated-file-product", color: "White", size: "XS", quantity: 1 };
    assert.equal((await request("/api/cart", { items: [fileSelection] }, "PUT")).status, 200);
    const fileCheckout = await request("/api/checkout/create-payment", { ...checkout, selections: [fileSelection] });
    assert.equal(fileCheckout.status, 200);
    const fileOrder = (await fileCheckout.json()).order;
    const filePayment = await db.payment.findUniqueOrThrow({ where: { orderId: fileOrder.id } });
    assert.equal(filePayment.provider, "MOCK");
    assert.equal(filePayment.amount, 3890);
    const paymentRequest = filePayment.rawRequest as { amount: { value: string }; receipt: { items: Array<{ amount: { value: string }; quantity: number }> } };
    assert.equal(paymentRequest.amount.value, "3890.00");
    assert.equal(paymentRequest.receipt.items.length, 2);
    assert.equal(paymentRequest.receipt.items.reduce((sum, item) => sum + Number(item.amount.value) * item.quantity, 0), 3890);
    check("файловый каталог сохраняется также в базе; белая XS оформляется с суммой 3890 ₽ и двумя позициями чека без реального платежа");

    const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const held = await db.order.create({ data: { orderNumber: "TEST-HELD", customerName: "ТЕСТ", customerEmail: "held@example.org", customerPhone: register.phone, deliveryMethod: "СДЭК", paymentMethod: "Банковская карта", subtotalAmount: 1000, totalAmount: 1000, createdAt: old, legalHold: true } });
    const abandoned = await db.order.create({ data: { orderNumber: "TEST-ABANDONED", customerName: "ТЕСТ", customerEmail: "old@example.org", customerPhone: register.phone, deliveryMethod: "СДЭК", paymentMethod: "Банковская карта", subtotalAmount: 1000, totalAmount: 1000, createdAt: old } });
    await db.analyticsEvent.create({ data: { eventType: "add_to_cart", entityType: "product", path: "/", deviceType: "desktop", createdAt: old } });
    const expiredAnalytics = await db.consentRecord.create({ data: { kind: "analytics", documentVersion: LEGAL_VERSION, documentText: "ТЕСТОВЫЙ ТЕКСТ", source: "/test", grantedAt: old } });
    const legacyUnsubscribe = await db.newsletterSubscriber.create({ data: { email: "legacy-optout@example.org", status: "UNSUBSCRIBED" } });
    await db.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: old } });
    run(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/retention.ts"]);
    assert.ok(await db.order.findUnique({ where: { id: abandoned.id } }));
    run(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/retention.ts", "--execute"]);
    assert.equal(await db.order.findUnique({ where: { id: abandoned.id } }), null);
    assert.ok(await db.order.findUnique({ where: { id: held.id } })); assert.ok(await db.order.findUnique({ where: { id: stored.id } }));
    assert.equal(await db.newsletterSubscriber.findUnique({ where: { id: subscriber.id } }), null);
    assert.equal(await db.analyticsEvent.count(), 0);
    assert.equal((await db.consentRecord.findUniqueOrThrow({ where: { id: expiredAnalytics.id } })).revokedAt?.getTime(), old.getTime() + 180 * 24 * 60 * 60 * 1000);
    assert.ok((await db.newsletterSubscriber.findUniqueOrThrow({ where: { id: legacyUnsubscribe.id } })).unsubscribedAt);
    check("обработка сроков по умолчанию не удаляет; выполнение удаляет истёкшие данные и сохраняет заказ со спором");
    console.log(`Пройдено ${checks} интеграционных сценариев. Рабочая база и реальные платежи не использовались.`);
  } finally {
    await db.$disconnect();
    if (app && app.exitCode === null) {
      app.kill("SIGTERM");
      await new Promise<void>((resolve) => { app?.once("exit", () => resolve()); setTimeout(() => { app?.kill("SIGKILL"); resolve(); }, 5000).unref(); });
    }
    if (pgStarted) run(path.join(pgBin, "pg_ctl"), ["-D", path.join(dir, "pg"), "-m", "fast", "-w", "stop"]);
    rmSync(dir, { recursive: true, force: true });
    rmSync(distDir, { recursive: true, force: true });
    const nextEnvCurrent = readFileSync("next-env.d.ts", "utf8");
    if (nextEnvCurrent.includes(`${distDir}/types/routes.d.ts`)) writeFileSync("next-env.d.ts", nextEnvBefore);
    // Next adds its temporary types directory to the shared tsconfig. Remove only our entry.
    const currentConfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    const previousConfig = JSON.parse(tsconfigBefore);
    currentConfig.include = currentConfig.include.filter((item: string) => !item.startsWith(`${distDir}/`));
    const signature = (config: { include: string[] }) => JSON.stringify({ ...config, include: [...config.include].sort() });
    if (signature(currentConfig) === signature(previousConfig)) writeFileSync("tsconfig.json", tsconfigBefore);
    else writeFileSync("tsconfig.json", JSON.stringify(currentConfig, null, 2) + "\n");
  }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Проверка не завершилась."); process.exitCode = 1; });
