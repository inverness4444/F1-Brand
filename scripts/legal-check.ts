import { loadEnvConfig } from "@next/env";

async function main() {
loadEnvConfig(process.cwd());
const { legalConfigurationChecks } = await import("../src/lib/legal-checks");
const { productComplianceIssues } = await import("../src/lib/product-compliance");
const { PrismaClient } = await import("@prisma/client");

const checks = legalConfigurationChecks();
for (const check of checks) console.log(`${check.ready ? "✓" : "○"} ${check.label}`);
let missingProducts = false;
if (process.argv.includes("--products")) {
  // An explicitly requested, read-only inspection of the configured database.
  const db = new PrismaClient();
  try {
    const products = await db.product.findMany({ where: { status: "ACTIVE" } });
    for (const product of products) {
      const issues = productComplianceIssues({ productKind: product.productKind, compliance: product.compliance as never });
      if (issues.length) { missingProducts = true; console.log(`○ ${product.name}: ${issues.join(" ")}`); }
    }
  } finally { await db.$disconnect(); }
}
if (checks.some((check) => !check.ready) || missingProducts) process.exitCode = 1;
console.log("Проверка настроек не заменяет проверку фактических документов и инфраструктуры. См. docs/legal-release-checklist.md.");

}
void main().catch(() => { console.error("Проверка не завершена. Проверьте настройки и доступ к базе."); process.exitCode = 1; });
