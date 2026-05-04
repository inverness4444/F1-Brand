import type {
  BalanceTransactionType,
  GiftCertificateStatus,
} from "@/lib/account-types";
import type { Driver, Legend, Product, ProductColor, Team } from "@/lib/types";

export const productTypeLabelRu: Record<Product["type"], string> = {
  "T-shirt": "Футболка",
  Hoodie: "Худи",
  Longsleeve: "Лонгслив",
  Jacket: "Куртка",
  Polo: "Поло",
  Pants: "Брюки",
  Scarf: "Шарф",
  Lego: "Лего",
  Cap: "Кепка",
  Accessory: "Аксессуар",
  Calendar: "Календарь",
  Poster: "Постер",
  "Gift Certificate": "Подарочный сертификат",
};

export const collectionLabelRu: Record<Product["collection"], string> = {
  "New Arrivals": "Новинки",
  Teamwear: "Командная коллекция",
  "Driver Collection": "Коллекция пилота",
  Legends: "Легенды",
  Essentials: "Базовая коллекция",
  Sale: "Распродажа",
};

export const colorLabelRu: Record<ProductColor, string> = {
  Black: "Чёрный",
  White: "Белый",
  Navy: "Тёмно-синий",
  Grey: "Серый",
  Red: "Красный",
  Orange: "Оранжевый",
  Green: "Зелёный",
  Blue: "Синий",
  Yellow: "Жёлтый",
  Silver: "Серебристый",
  Beige: "Бежевый",
  Pink: "Розовый",
};

export function sizeLabelRu(size: string) {
  return size === "One Size" ? "Один размер" : size;
}

export const sortLabelRu: Record<"Featured" | "Newest" | "Price Low to High" | "Price High to Low" | "Best Selling", string> = {
  Featured: "Рекомендуем",
  Newest: "Сначала новые",
  "Price Low to High": "Сначала дешевле",
  "Price High to Low": "Сначала дороже",
  "Best Selling": "Хиты продаж",
};

export const categoryLabelRu = {
  All: "Все товары",
  Pilots: "Пилоты",
  Teams: "Команды",
  Legends: "Легенды",
  Essentials: "База",
  Gifts: "Подарочные сертификаты",
} as const;

export const giftCertificateStatusLabelRu: Record<GiftCertificateStatus, string> = {
  purchased: "Не активирован",
  activated: "Активирован",
  expired: "Истёк",
  cancelled: "Отменён",
};

export const balanceTransactionTypeLabelRu: Record<BalanceTransactionType, string> = {
  gift_certificate_activation: "Активация сертификата",
  purchase_payment: "Оплата заказа",
  refund: "Возврат",
  manual_adjustment: "Ручная корректировка",
};

const phraseReplacements: Array<[string, string]> = [
  ["Women's ", ""],
  ["Performance Tee", "футболка Performance"],
  ["Race Day Polo", "поло Race Day"],
  ["Travel Tee", "футболка Travel"],
  ["Track Jacket", "куртка Track"],
  ["Tech Jacket", "куртка Tech"],
  ["Club Jacket", "куртка Club"],
  ["Team Jacket", "командная куртка"],
  ["Travel Jacket", "куртка Travel"],
  ["Pit Lane Cap", "кепка Pit Lane"],
  ["Club Cap", "кепка Club"],
  ["Driver Cap", "кепка пилота"],
  ["Heritage Cap", "кепка Heritage"],
  ["Grid Hoodie", "худи Grid"],
  ["Team Hoodie", "командное худи"],
  ["Race Club Hoodie", "худи Race Club"],
  ["Team Polo", "командное поло"],
  ["Silver Polo", "поло Silver"],
  ["Heritage Polo", "поло Heritage"],
  ["Grand Prix Polo", "поло Grand Prix"],
  ["Performance Polo", "поло Performance"],
  ["Track Pants", "брюки Track"],
  ["Performance Pants", "брюки Performance"],
  ["Scarf", "шарф"],
  ["Lego", "лего"],
  ["Track Longsleeve", "лонгслив Track"],
  ["Heritage Longsleeve", "лонгслив Heritage"],
  ["Grid Longsleeve", "лонгслив Grid"],
  ["Precision Longsleeve", "лонгслив Precision"],
  ["Performance Tee", "футболка Performance"],
  ["Archive Tee", "футболка Archive"],
  ["Champion Tee", "футболка Champion"],
  ["World Champion Tee", "футболка чемпиона"],
  ["Legacy Tee", "футболка Legacy"],
  ["Scuderia Tee", "футболка Scuderia"],
  ["No.1 Tee", "футболка No.1"],
  ["Launch Tee", "футболка Launch"],
  ["Future Tee", "футболка Future"],
  ["Pace Tee", "футболка Pace"],
  ["Precision Tee", "футболка Precision"],
  ["Travel Tee", "футболка Travel"],
  ["Track Tee", "футболка Track"],
  ["Core Tee", "футболка Core"],
  ["Tee", "футболка"],
  ["Hoodie", "худи"],
  ["Polo", "поло"],
  ["Jacket", "куртка"],
  ["Longsleeve", "лонгслив"],
  ["Pants", "брюки"],
  ["Cap", "кепка"],
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getProductDisplayName(product: Pick<Product, "name" | "type">) {
  let result = product.name;

  for (const [from, to] of phraseReplacements) {
    result = result.replaceAll(from, to);
  }

  result = normalizeWhitespace(result);

  if (result === product.name) {
    if (/[А-Яа-яЁё]/.test(product.name)) {
      return result;
    }

    return `${productTypeLabelRu[product.type]} ${product.name}`;
  }

  return result;
}

export function getProductShortDescription(product: Pick<Product, "teamName" | "driverName" | "legendName" | "type" | "collection">) {
  if (product.type === "Gift Certificate") {
    return "Цифровой подарочный сертификат: активируйте код в личном кабинете и оплачивайте любые товары балансом частями.";
  }

  if (product.driverName) {
    return `${productTypeLabelRu[product.type]} из коллекции ${product.driverName} в стилистике фирменного магазина спортивной одежды.`;
  }

  if (product.teamName) {
    return `${productTypeLabelRu[product.type]} из командной коллекции ${product.teamName} с чистой спортивной подачей.`;
  }

  if (product.legendName) {
    return `${productTypeLabelRu[product.type]} из архивной коллекции ${product.legendName} в выверенном стиле.`;
  }

  return `${productTypeLabelRu[product.type]} из раздела «${collectionLabelRu[product.collection]}» с акцентом на чистый спортивный дизайн.`;
}

export function getProductDescription(product: Pick<Product, "teamName" | "driverName" | "legendName" | "type" | "collection">) {
  if (product.type === "Gift Certificate") {
    return "Подарочный сертификат работает как цифровой товар: после покупки вы получите одноразовый код, который можно активировать в аккаунте и использовать баланс частями для оплаты любых товаров магазина.";
  }

  if (product.driverName) {
    return `${productTypeLabelRu[product.type]} из коллекции ${product.driverName}. Модель выполнена в эстетике фирменного магазина командной одежды: чистый силуэт, спортивная посадка и аккуратные акценты, вдохновлённые культурой Formula 1.`;
  }

  if (product.teamName) {
    return `${productTypeLabelRu[product.type]} из коллекции ${product.teamName}. Это вещь в духе официального магазина спортивной одежды: минималистичная подача, качественная структура и уверенный командный характер без перегруза.`;
  }

  if (product.legendName) {
    return `${productTypeLabelRu[product.type]} из коллекции легенд ${product.legendName}. В основе спокойный, выверенный подход: архивное вдохновение Formula 1, аккуратная типографика и современная спортивная подача.`;
  }

  return `${productTypeLabelRu[product.type]} из раздела «${collectionLabelRu[product.collection]}». Базовая модель с чистой коммерческой подачей, вдохновлённой официальными магазинами спортивной одежды.`;
}

export function getTeamDescription(team: Team) {
  return `Коллекция ${team.name} с чистой спортивной подачей, аккуратными цветовыми акцентами и ощущением официального магазина командной одежды.`;
}

export function getDriverDescription(driver: Driver) {
  return `Коллекция ${driver.name} в стиле современной спортивной одежды, вдохновлённая командой ${driver.teamName} и сезоном Formula 1 2026.`;
}

export function getLegendDescription(legend: Legend) {
  return `Архивная капсула ${legend.name} с чистой спортивной подачей, вдохновлённой наследием Formula 1 и современным спортивным ритейлом.`;
}
