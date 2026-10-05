"use client";
import { emptyProductCompliance, productComplianceIssues, type ProductCompliance } from "@/lib/product-compliance";
import type { Product } from "@/lib/types";

export function ProductComplianceEditor({ product, onChange }: { product: Product; onChange: (value: ProductCompliance) => void }) {
  if (product.productType === "gift_certificate") return null;
  const value = product.compliance ?? emptyProductCompliance;
  const issues = productComplianceIssues(product);
  const set = (key: keyof ProductCompliance, next: string) => onChange({ ...value, [key]: next });
  return <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
    <h3 className="text-lg font-semibold">Обязательные сведения о товаре</h3>
    <p className="text-sm leading-6 text-slate-600">Заполняйте по документам изготовителя. Перед продажей проверьте применимость техрегламента, статус документа в реестре, маркировку и права на изображения. Данные без подтверждения не подставляются автоматически.</p>
    <div className="grid gap-4 md:grid-cols-2">
      {([["composition", "Состав / материал с долями волокон"], ["manufacturer", "Изготовитель"], ["manufacturerAddress", "Адрес изготовителя"], ["countryOfOrigin", "Страна производства"], ["careInstructions", "Инструкция по уходу"], ["conformityNumber", "Номер сертификата / декларации"], ["conformityRegistryUrl", "Ссылка на запись pub.fsa.gov.ru"], ["exemptionReason", "Основание освобождения от подтверждения соответствия"], ["markingBasis", "Основание / подтверждение проверки маркировки"], ["rightsBasis", "Основание прав: номер разрешения, правообладатель / автор"]] as const).map(([key, label]) => <label key={key} className="space-y-2"><span className="text-sm font-medium">{label}</span><input className="input-base rounded-2xl" value={value[key]} maxLength={2000} onChange={(event) => set(key, event.target.value)} /></label>)}
      <label className="space-y-2"><span className="text-sm font-medium">Документ соответствия</span><select className="input-base rounded-2xl" value={value.conformityKind} onChange={(event) => set("conformityKind", event.target.value)}><option value="pending">Не проверено</option><option value="certificate">Сертификат</option><option value="declaration">Декларация</option><option value="not_required">Не требуется — с основанием</option></select></label>
      <label className="space-y-2"><span className="text-sm font-medium">Маркировка «Честный знак»</span><select className="input-base rounded-2xl" value={value.markingStatus} onChange={(event) => set("markingStatus", event.target.value)}><option value="pending">Не проверено</option><option value="required_verified">Требуется, процесс и коды проверены</option><option value="not_required">Не требуется — с основанием</option></select></label>
      <label className="space-y-2"><span className="text-sm font-medium">Права на дизайн и изображения</span><select className="input-base rounded-2xl" value={value.rightsStatus} onChange={(event) => set("rightsStatus", event.target.value)}><option value="pending">Не подтверждены</option><option value="own">Собственные права, без чужих обозначений</option><option value="licensed">Есть разрешения всех необходимых правообладателей</option></select></label>
    </div>
    {issues.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="text-sm text-emerald-800">Обязательные поля заполнены. Подлинность и область действия документов проверяет продавец.</p>}
  </section>;
}
