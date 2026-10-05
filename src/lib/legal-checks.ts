import { seller } from "@/lib/legal";
import { deliveryPromiseConfig } from "@/lib/delivery-promise";

export function legalConfigurationChecks() {
  return [
    { label: "Адрес продавца", ready: Boolean(seller.address) },
    { label: "Регистрирующий орган ИП", ready: Boolean(seller.registrationAuthority) },
    { label: "Адрес и получатель возвратов", ready: Boolean(seller.returnAddress && seller.returnRecipient) },
    { label: "Гарантированный срок производства и доставки", ready: Boolean(deliveryPromiseConfig()) },
    { label: "Российское размещение сайта, базы, копий, журналов и Redis подтверждено", ready: process.env.PERSONAL_DATA_RF_VERIFIED === "true" },
    { label: "Уведомление Роскомнадзора и его сведения проверены", ready: process.env.RKN_NOTIFICATION_VERIFIED === "true" },
    { label: "Касса, чеки на оплату, зачёт предоплаты и возврат проверены", ready: process.env.FISCAL_PROCESS_VERIFIED === "true" && process.env.YOOKASSA_RECEIPT_ENABLED === "true" },
    { label: "Ежедневное удаление данных по срокам настроено", ready: process.env.RETENTION_JOB_VERIFIED === "true" },
  ];
}
