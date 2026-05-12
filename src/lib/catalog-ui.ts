import type { FeaturedCollection, ProductBadge, ProductColor, ProductType, SortKey } from "@/lib/types";

export const productTypeLabels: Record<ProductType, string> = {
  "T-shirt": "Футболки",
  Hoodie: "Худи",
  Longsleeve: "Лонгсливы",
  Jacket: "Куртки",
  Polo: "Поло",
  Pants: "Брюки",
  Scarf: "Шарфы",
  Lego: "Лего",
  Cap: "Кепки",
  Keychain: "Брелки",
  Accessory: "Аксессуары",
  Wallet: "Кошельки",
  Cardholder: "Картхолдеры",
  Calendar: "Календари",
  Poster: "Постеры",
  "Gift Certificate": "Подарочные сертификаты",
};

export const badgeLabels: Record<ProductBadge, string> = {
  New: "НОВИНКА",
  Hit: "ХИТ",
  Limited: "ЛИМИТ",
  Preorder: "ПРЕДЗАКАЗ",
  OutOfStock: "НЕТ В НАЛИЧИИ",
  Sale: "РАСПРОДАЖА",
  Original: "ОРИГИНАЛ",
};

export const colorSwatches: Record<ProductColor, string> = {
  Black: "#111111",
  White: "#f7f5ef",
  Navy: "#162540",
  Grey: "#9ea3aa",
  Red: "#d8382e",
  Orange: "#eb6d2f",
  Green: "#16614b",
  Blue: "#1c4fb4",
  Yellow: "#d6b224",
  Silver: "#cfd4da",
  Beige: "#d7c8b7",
  Pink: "#d66597",
};

export const collectionOptions: FeaturedCollection[] = [
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
];

export const collectionLabels: Record<FeaturedCollection, string> = {
  "New Arrivals": "Новинки",
  Teamwear: "Командная коллекция",
  "Driver Collection": "Коллекция пилота",
  Legends: "Легенды",
  Essentials: "База",
  Sale: "Распродажа",
};

export const sortOptions: SortKey[] = [
  "Featured",
  "Newest",
  "Price Low to High",
  "Price High to Low",
  "Best Selling",
];

export const sortLabels: Record<SortKey, string> = {
  Featured: "Рекомендуем",
  Newest: "Сначала новые",
  "Price Low to High": "Сначала дешевле",
  "Price High to Low": "Сначала дороже",
  "Best Selling": "Хиты продаж",
};
