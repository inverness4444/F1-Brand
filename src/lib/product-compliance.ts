export type ProductCompliance = {
  composition: string;
  manufacturer: string;
  manufacturerAddress: string;
  countryOfOrigin: string;
  careInstructions: string;
  conformityKind: "pending" | "certificate" | "declaration" | "not_required";
  conformityNumber: string;
  conformityRegistryUrl: string;
  exemptionReason: string;
  markingStatus: "pending" | "required_verified" | "not_required";
  markingBasis: string;
  rightsStatus: "pending" | "own" | "licensed";
  rightsBasis: string;
};

export const emptyProductCompliance: ProductCompliance = {
  composition: "", manufacturer: "", manufacturerAddress: "", countryOfOrigin: "", careInstructions: "",
  conformityKind: "pending", conformityNumber: "", conformityRegistryUrl: "", exemptionReason: "",
  markingStatus: "pending", markingBasis: "", rightsStatus: "pending", rightsBasis: "",
};

export function isConformityRegistryUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "pub.fsa.gov.ru" && !url.username && !url.password;
  } catch { return false; }
}

export function productComplianceIssues(product: { productType?: string; productKind?: string; compliance?: ProductCompliance | null }) {
  if ((product.productType ?? product.productKind) === "gift_certificate") return [];
  const c = product.compliance;
  if (!c) return ["Не заполнены обязательные сведения и подтверждения по товару."];
  const issues: string[] = [];
  for (const [key, label] of [["composition", "Состав / материал"], ["manufacturer", "Изготовитель"], ["manufacturerAddress", "Адрес изготовителя"], ["countryOfOrigin", "Страна производства"], ["careInstructions", "Уход"]] as const) {
    if (!c[key]?.trim()) issues.push(`Укажите: ${label}.`);
  }
  if (c.conformityKind === "pending") issues.push("Проверьте сертификат / декларацию или основание освобождения.");
  else if (c.conformityKind === "not_required") {
    if (!c.exemptionReason?.trim()) issues.push("Укажите основание, по которому документ соответствия не требуется.");
  } else if (!c.conformityNumber?.trim() || !isConformityRegistryUrl(c.conformityRegistryUrl)) {
    issues.push("Укажите номер и прямую ссылку на документ в реестре Росаккредитации.");
  }
  if (c.markingStatus === "pending" || !c.markingBasis?.trim()) issues.push("Проверьте маркировку «Честный знак» и укажите основание / запись проверки.");
  if (c.rightsStatus === "pending" || !c.rightsBasis?.trim()) issues.push("Подтвердите права на дизайн, фотографии и обозначения ссылкой на разрешение или записью об авторстве.");
  return issues;
}
