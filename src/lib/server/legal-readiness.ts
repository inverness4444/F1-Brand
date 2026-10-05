import "server-only";
import { seller } from "@/lib/legal";
import { PublicApiError } from "@/lib/server/public-error";

export function assertPersonalDataReady() {
  if (process.env.NODE_ENV === "production" && (process.env.PERSONAL_DATA_RF_VERIFIED !== "true" || process.env.RKN_NOTIFICATION_VERIFIED !== "true" || process.env.RETENTION_JOB_VERIFIED !== "true")) {
    throw new PublicApiError("Сервис временно недоступен. Свяжитесь с магазином по адресу velocityclub@mail.ru.", 503);
  }
}

export function assertCommerceReady() {
  if (process.env.NODE_ENV !== "production") return;
  assertPersonalDataReady();
  if (!seller.address || !seller.registrationAuthority || !seller.returnAddress || !seller.returnRecipient || process.env.FISCAL_PROCESS_VERIFIED !== "true") {
    throw new PublicApiError("Онлайн-оплата временно недоступна. Свяжитесь с магазином по адресу velocityclub@mail.ru.", 503);
  }
}
