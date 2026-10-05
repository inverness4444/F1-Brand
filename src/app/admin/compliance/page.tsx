import Link from "next/link";
import { legalConfigurationChecks } from "@/lib/legal-checks";
import { productComplianceIssues } from "@/lib/product-compliance";
import { readAdminCatalogProductsFromDb } from "@/lib/server/catalog-db";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const products = await readAdminCatalogProductsFromDb();
  const pending = products.map((product) => ({ product, issues: productComplianceIssues(product) })).filter(({ issues }) => issues.length);
  return <section className="container-shell space-y-6 py-8">
    <div className="card-panel space-y-4 p-6"><h1 className="text-3xl font-semibold">Готовность магазина</h1>
      <p className="text-sm leading-7 text-slate-600">Заполненность полей не подтверждает законность документов. Отметки по инфраструктуре и кассе включаются только после проверки с сохранением доказательств. Сайт не подаёт уведомления и не выдаёт сертификаты автоматически.</p>
      <ul className="space-y-2">{legalConfigurationChecks().map((check) => <li key={check.label} className={check.ready ? "text-emerald-800" : "text-amber-800"}>{check.ready ? "✓" : "○"} {check.label}</li>)}</ul>
      <p className="text-sm leading-7 text-slate-600">Покупки маркируемых товаров, сертификатов и оплата балансом через текущую интеграцию заблокированы до внедрения соответствующих фискальных сценариев. Возврат оплаченного аванса остаётся обязательным и принимается через поддержку. Перед отгрузкой вкладывайте письменные правила возврата с реальным адресом.</p>
    </div>
    <div className="card-panel space-y-4 p-6"><h2 className="text-2xl font-semibold">Товары, требующие проверки: {pending.length}</h2>
      <p className="text-sm text-slate-600">Действующие товары сохранены в публичном каталоге. Этот список помогает заполнить сведения и проверить документы.</p>
      {pending.map(({ product, issues }) => <div key={product.id} className="border-t border-slate-200 pt-4"><Link href={`/admin/products?product=${encodeURIComponent(product.id)}`} className="font-semibold underline">{product.name}</Link><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>)}
    </div>
  </section>;
}
