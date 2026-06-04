export const adminNavigation = [
  { href: "/admin/products", label: "Редактор каталога" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/orders", label: "Заказы" },
  { href: "/admin/addresses", label: "Адреса/доставка" },
  { href: "/admin/newsletter", label: "Рассылка" },
  { href: "/admin/analytics", label: "Аналитика" },
] as const;

export const adminUserRoleOptions = [
  { value: "USER", label: "Покупатель" },
  { value: "ADMIN", label: "Администратор" },
] as const;

export const adminUserStatusOptions = [
  { value: "ACTIVE", label: "Активен" },
  { value: "DISABLED", label: "Отключён" },
] as const;

export const adminOrderStatusOptions = [
  { value: "PENDING", label: "Создан" },
  { value: "AWAITING_PAYMENT", label: "Ожидает оплаты" },
  { value: "PAID", label: "Оплачен" },
  { value: "PROCESSING", label: "В обработке" },
  { value: "SHIPPED", label: "Передан в доставку" },
  { value: "DELIVERED", label: "Доставлен" },
  { value: "CANCELLED", label: "Отменён" },
  { value: "REFUNDED", label: "Возврат" },
] as const;

export const adminPaymentStatusOptions = [
  { value: "NOT_STARTED", label: "Не начата" },
  { value: "PENDING", label: "Ожидает оплаты" },
  { value: "WAITING_FOR_CAPTURE", label: "Ожидает списания" },
  { value: "SUCCEEDED", label: "Оплачено" },
  { value: "CANCELED", label: "Отменена" },
  { value: "REFUNDED", label: "Возврат" },
  { value: "FAILED", label: "Ошибка оплаты" },
] as const;

export const adminFulfillmentStatusOptions = [
  { value: "NOT_FULFILLED", label: "Не собран" },
  { value: "PROCESSING", label: "Собирается" },
  { value: "SHIPPED", label: "Передан в доставку" },
  { value: "DELIVERED", label: "Доставлен" },
  { value: "RETURNED", label: "Возвращён" },
  { value: "CANCELLED", label: "Отменён" },
] as const;

export const adminNewsletterSubscriberStatusOptions = [
  { value: "ACTIVE", label: "Активен" },
  { value: "UNSUBSCRIBED", label: "Отписан" },
] as const;

export const adminUserRoleLabel = Object.fromEntries(
  adminUserRoleOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminUserRoleOptions)[number]["value"], string>;

export const adminUserStatusLabel = Object.fromEntries(
  adminUserStatusOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminUserStatusOptions)[number]["value"], string>;

export const adminOrderStatusLabel = Object.fromEntries(
  adminOrderStatusOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminOrderStatusOptions)[number]["value"], string>;

export const adminPaymentStatusLabel = Object.fromEntries(
  adminPaymentStatusOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminPaymentStatusOptions)[number]["value"], string>;

export const adminFulfillmentStatusLabel = Object.fromEntries(
  adminFulfillmentStatusOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminFulfillmentStatusOptions)[number]["value"], string>;

export const adminNewsletterSubscriberStatusLabel = Object.fromEntries(
  adminNewsletterSubscriberStatusOptions.map((option) => [option.value, option.label]),
) as Record<(typeof adminNewsletterSubscriberStatusOptions)[number]["value"], string>;
