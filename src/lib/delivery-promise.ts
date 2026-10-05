function positiveDays(value: string | undefined) {
  const days = Number(value);
  return Number.isInteger(days) && days > 0 && days <= 365 ? days : null;
}

// Calendar days include weekends and holidays. No invented delivery promise is used.
export function deliveryPromiseConfig() {
  const productionDays = positiveDays(process.env.NEXT_PUBLIC_PRODUCTION_MAX_CALENDAR_DAYS);
  const deliveryDays = positiveDays(process.env.NEXT_PUBLIC_DELIVERY_MAX_CALENDAR_DAYS);
  return productionDays && deliveryDays ? { productionDays, deliveryDays } : null;
}

export function getDeliveryDeadline(now = new Date()) {
  const config = deliveryPromiseConfig();
  if (!config) return null;
  const moscowDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const date = new Date(`${moscowDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + config.productionDays + config.deliveryDays);
  return date.toISOString().slice(0, 10);
}

export function canCheckoutWithDeliveryDeadline(
  requiresShipping: boolean,
  deliveryDeadline: string | null,
  runtime = process.env.NODE_ENV,
) {
  return !requiresShipping || Boolean(deliveryDeadline) || runtime === "development";
}

export function formatDeliveryDeadline(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "long" }).format(new Date(`${value.slice(0, 10)}T12:00:00.000Z`));
}
