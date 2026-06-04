export const analyticsEventTypes = [
  "product_view",
  "product_click",
  "add_to_cart",
  "remove_from_cart",
  "checkout_start",
  "hero_cta_click",
  "section_click",
  "category_open",
  "filter_click",
  "search_click",
  "search_query",
  "newsletter_subscribe_success",
  "newsletter_subscribe_duplicate",
  "newsletter_subscribe_error",
  "order_created",
  "payment_succeeded",
  "payment_canceled",
  "payment_failed",
] as const;

export const analyticsEntityTypes = [
  "product",
  "category",
  "section",
  "cart",
  "checkout",
  "newsletter",
  "order",
  "payment",
  "search",
  "filter",
] as const;

export const analyticsDeviceTypes = ["mobile", "tablet", "desktop"] as const;

export type AnalyticsEventType = (typeof analyticsEventTypes)[number];
export type AnalyticsEntityType = (typeof analyticsEntityTypes)[number];
export type AnalyticsDeviceType = (typeof analyticsDeviceTypes)[number];

export const analyticsEventLabels: Record<AnalyticsEventType, string> = {
  product_view: "Просмотр товара",
  product_click: "Клик по товару",
  add_to_cart: "Добавление в корзину",
  remove_from_cart: "Удаление из корзины",
  checkout_start: "Переход к checkout",
  hero_cta_click: "Клик по hero-кнопке",
  section_click: "Клик по секции",
  category_open: "Открытие категории",
  filter_click: "Клик по фильтру",
  search_click: "Клик по поиску",
  search_query: "Поисковый запрос",
  newsletter_subscribe_success: "Подписка оформлена",
  newsletter_subscribe_duplicate: "Повторная подписка",
  newsletter_subscribe_error: "Ошибка подписки",
  order_created: "Заказ создан",
  payment_succeeded: "Оплата успешна",
  payment_canceled: "Оплата отменена",
  payment_failed: "Ошибка оплаты",
};

export const analyticsEntityLabels: Record<AnalyticsEntityType, string> = {
  product: "Товар",
  category: "Категория",
  section: "Секция",
  cart: "Корзина",
  checkout: "Checkout",
  newsletter: "Подписка",
  order: "Заказ",
  payment: "Оплата",
  search: "Поиск",
  filter: "Фильтр",
};
