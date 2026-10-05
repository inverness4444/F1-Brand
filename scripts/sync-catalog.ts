import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Не настроено подключение к базе данных.");
  process.env.DATABASE_URL = databaseUrl;
  const { prisma } = await import("../src/lib/prisma");
  const { catalogProductsPayloadSchema } = await import("../src/lib/validation-schemas");
  const { upsertProductInDatabase } = await import("../src/lib/server/catalog-db");
  try {
    const products = catalogProductsPayloadSchema.parse({ products: JSON.parse(readFileSync("data/catalog-products.json", "utf8")) }).products;
    const existing = await prisma.product.findMany({ select: { id: true, slug: true } });
    const ids = new Set(existing.map((product) => product.id));
    const missing = products.filter((product) => !ids.has(product.id));
    const conflicts = missing.filter((product) => existing.some((row) => row.slug === product.slug));
    console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", databaseProducts: existing.length, missing: missing.map(({ id, slug }) => ({ id, slug })), slugConflicts: conflicts.map(({ slug }) => slug) }, null, 2));
    if (conflicts.length) throw new Error("Есть совпадения адресов товаров с другими ID. Сначала сопоставьте их вручную.");
    if (!process.argv.includes("--apply") || missing.length === 0) return;

    const pgConfig = spawnSync("pg_config", ["--bindir"], { encoding: "utf8" });
    if (pgConfig.status !== 0) throw new Error("Для резервной копии требуется PostgreSQL с pg_dump.");
    const pgBin = pgConfig.stdout.trim();
    const backupDir = path.join(os.homedir(), ".codex", "backups", "velocityclub", new Date().toISOString().replace(/[:.]/g, "-"));
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    chmodSync(backupDir, 0o700);
    const backup = path.join(backupDir, "before-catalog-sync.dump");
    const url = new URL(databaseUrl);
    const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get("sslmode") || "prefer" };
    const dump = spawnSync(path.join(pgBin, "pg_dump"), ["--format=custom", "--no-owner", "--no-acl", "--file", backup], { env: pgEnv, encoding: "utf8", timeout: 120_000 });
    if (dump.status !== 0) throw new Error("Резервная копия не создана. Каталог не изменён.");
    chmodSync(backup, 0o600);
    const validation = spawnSync(path.join(pgBin, "pg_restore"), ["--list", backup], { encoding: "utf8" });
    if (validation.status !== 0 || !validation.stdout.includes("TABLE DATA")) throw new Error("Не удалось проверить резервную копию. Каталог не изменён.");
    const before = { users: await prisma.user.count(), products: await prisma.product.count(), orders: await prisma.order.count(), payments: await prisma.payment.count() };
    writeFileSync(path.join(backupDir, "before.json"), JSON.stringify({ counts: before, missing: missing.map(({ id, slug }) => ({ id, slug })) }, null, 2), { mode: 0o600 });
    console.log(`Резервная копия: ${backup}`);
    for (const product of missing) {
      // Existing products, their prices, inventory and status are never overwritten by this repair.
      if (await prisma.product.findUnique({ where: { id: product.id }, select: { id: true } })) continue;
      await upsertProductInDatabase(product);
      console.log(`Добавлен: ${product.slug}`);
    }
    const after = { users: await prisma.user.count(), products: await prisma.product.count(), orders: await prisma.order.count(), payments: await prisma.payment.count() };
    if (after.users !== before.users || after.orders !== before.orders || after.payments !== before.payments) throw new Error("Количество аккаунтов, заказов или оплат изменилось во время проверки; проверьте текущие данные.");
    console.log(JSON.stringify({ before, after }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => { console.error("Синхронизация не завершена. Проверьте подключение, резервную копию и каталог; уже добавленные товары сохраняются, повторный запуск пропускает их."); process.exitCode = 1; });
