import type { DeliveryMethod, OrderStatus, PaymentMethod } from "@/lib/account-types";

export const favoriteDrivers2026 = [
  "Lando Norris",
  "Oscar Piastri",
  "Charles Leclerc",
  "Lewis Hamilton",
  "Max Verstappen",
  "Isack Hadjar",
  "George Russell",
  "Kimi Antonelli",
  "Fernando Alonso",
  "Lance Stroll",
  "Pierre Gasly",
  "Franco Colapinto",
  "Esteban Ocon",
  "Oliver Bearman",
  "Liam Lawson",
  "Arvid Lindblad",
  "Carlos Sainz",
  "Alex Albon",
  "Nico Hülkenberg",
  "Gabriel Bortoleto",
  "Sergio Pérez",
  "Valtteri Bottas",
] as const;

export const favoriteTeams2026 = [
  "McLaren",
  "Ferrari",
  "Red Bull Racing",
  "Mercedes",
  "Aston Martin",
  "Alpine",
  "Haas",
  "Racing Bulls",
  "Williams",
  "Audi",
  "Cadillac",
] as const;

export const orderStatuses: OrderStatus[] = [
  "Новый",
  "Ожидает оплаты",
  "Оплачен",
  "В производстве",
  "Отправлен",
  "Доставлен",
  "Отменён",
  "Возвращён",
];

export const digitalDeliveryMethod: DeliveryMethod = "Цифровой сертификат";
export const balancePaymentMethod: PaymentMethod = "Баланс аккаунта";

export const deliveryMethods = ["СДЭК", "Почта России", "Курьер", "Самовывоз"] as const satisfies readonly DeliveryMethod[];

export const paymentMethods = [
  "Банковская карта",
  "СБП",
  "Telegram Wallet",
  "Криптовалюта",
] as const satisfies readonly PaymentMethod[];

export const accountNavigation = [
  { href: "/account", label: "Обзор" },
  { href: "/account/orders", label: "Мои заказы" },
  { href: "/account/gift-cards", label: "Баланс и сертификаты" },
  { href: "/account/favorites", label: "Избранное" },
  { href: "/account/addresses", label: "Адреса доставки" },
  { href: "/account/profile", label: "Профиль" },
  { href: "/account/settings", label: "Настройки" },
] as const;
