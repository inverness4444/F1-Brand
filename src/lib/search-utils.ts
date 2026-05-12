import { productTypeLabels } from "@/lib/catalog-ui";
import { drivers, legends, productTypeOptions, teams } from "@/lib/data/roster";
import type { Product, ProductType } from "@/lib/types";

const entityAliases: Record<string, string[]> = {
  ferrari: ["феррари", "скудерия"],
  mclaren: ["макларен", "мкларен"],
  "red-bull-racing": ["ред булл", "редбулл", "ред булл рейсинг"],
  mercedes: ["мерседес", "мерс"],
  "aston-martin": ["астон мартин", "астон"],
  alpine: ["альпин", "алпин"],
  haas: ["хаас"],
  "racing-bulls": ["рейсинг буллс", "рэйсинг буллс", "rb"],
  williams: ["уильямс", "вильямс"],
  audi: ["ауди"],
  cadillac: ["кадиллак"],
  "lando-norris": ["ландо", "норрис"],
  "oscar-piastri": ["оскар", "пиастри"],
  "charles-leclerc": ["шарль", "леклер", "леклерк"],
  "lewis-hamilton": ["льюис", "люис", "хамильтон", "гамильтон", "льюис гамильтон", "люис хамилтон"],
  "max-verstappen": ["макс", "ферстаппен", "верстаппен"],
  "isack-hadjar": ["айзек", "исак", "хаджар"],
  "george-russell": ["джордж", "рассел", "расселл"],
  "kimi-antonelli": ["кими", "антонелли"],
  "fernando-alonso": ["фернандо", "алонсо"],
  "lance-stroll": ["ланс", "стролл", "строл"],
  "pierre-gasly": ["пьер", "гасли"],
  "franco-colapinto": ["франко", "колапинто"],
  "esteban-ocon": ["эстебан", "окон"],
  "oliver-bearman": ["оливер", "бирман", "берман"],
  "liam-lawson": ["лиам", "лоусон"],
  "arvid-lindblad": ["арвид", "линдблад"],
  "carlos-sainz": ["карлос", "сайнс"],
  "alex-albon": ["алекс", "албон"],
  "nico-hulkenberg": ["нико", "хюлькенберг", "хюлкенберг", "хюльк"],
  "gabriel-bortoleto": ["габриэль", "габриел", "бортолето"],
  "sergio-perez": ["серхио", "серхио", "перес", "чеко"],
  "valtteri-bottas": ["вальттери", "боттас"],
  "michael-schumacher": ["михаэль", "шумахер", "шумахер"],
  "ayrton-senna": ["айртон", "сенна"],
  "alain-prost": ["алан прост", "ален прост", "прост"],
  "niki-lauda": ["ники лауда", "лауда"],
  "mika-hakkinen": ["мика хаккинен", "хаккинен", "хяккинен"],
  "kimi-raikkonen": ["кими райкконен", "райкконен", "райконен", "айсмен"],
  "sebastian-vettel": ["себастьян", "веттель"],
  "jenson-button": ["дженсон", "баттон"],
};

const productTypeAliases: Record<ProductType, string[]> = {
  "T-shirt": ["футболка", "футболки", "tee", "tshirt", "t shirt"],
  Hoodie: ["худи"],
  Longsleeve: ["лонгслив", "long sleeve"],
  Jacket: ["куртка", "куртки"],
  Polo: ["поло"],
  Pants: ["брюки", "штаны"],
  Scarf: ["шарф", "шарфы"],
  Lego: ["лего"],
  Cap: ["кепка", "кепки"],
  Keychain: ["брелок", "брелки", "keychain"],
  Accessory: ["аксессуар", "аксессуары"],
  Wallet: ["кошелек", "кошелёк", "кошельки", "wallet"],
  Cardholder: ["картхолдер", "картхолдеры", "cardholder"],
  Calendar: ["календарь", "календари"],
  Poster: ["постер", "постеры"],
  "Gift Certificate": ["подарочный сертификат", "сертификат", "gift card"],
};

function stripDiacritics(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => normalizeSearchText(value ?? "")).filter(Boolean))];
}

function getEntityTerms(name: string, slug: string) {
  return uniqueNormalized([
    name,
    slug,
    ...name.split(" "),
    ...slug.split("-"),
    ...(entityAliases[slug] ?? []),
  ]);
}

function getProductTypeTerms(type: ProductType) {
  return uniqueNormalized([type, productTypeLabels[type], ...(productTypeAliases[type] ?? [])]);
}

function getMatchScore(query: string, terms: string[]) {
  let bestScore = 0;

  for (const term of terms) {
    if (term === query) {
      return 160;
    }

    if (term.startsWith(query) && query.length >= 2) {
      bestScore = Math.max(bestScore, 130);
      continue;
    }

    if (term.includes(query) && query.length >= 3) {
      bestScore = Math.max(bestScore, 80);
    }
  }

  return bestScore;
}

export function resolveSmartSearchTarget(rawQuery: string) {
  const query = normalizeSearchText(rawQuery);

  if (query.length < 2) {
    return null;
  }

  const candidates = [
    ...drivers.map((driver) => ({
      href: `/pilots/${driver.slug}`,
      score: getMatchScore(query, getEntityTerms(driver.name, driver.slug)),
      priority: 4,
    })),
    ...teams.map((team) => ({
      href: `/teams/${team.slug}`,
      score: getMatchScore(query, getEntityTerms(team.name, team.slug)),
      priority: 3,
    })),
    ...legends.map((legend) => ({
      href: `/legends/${legend.slug}`,
      score: getMatchScore(query, getEntityTerms(legend.name, legend.slug)),
      priority: 2,
    })),
    ...productTypeOptions.map((type) => ({
      href: `/shop?type=${encodeURIComponent(type)}`,
      score: getMatchScore(query, getProductTypeTerms(type)),
      priority: 1,
    })),
  ]
    .filter((candidate) => candidate.score >= 110)
    .sort((left, right) => right.score - left.score || right.priority - left.priority);

  return candidates[0]?.href ?? null;
}

function getEntityAliasesByName(name: string | null, list: Array<{ name: string; slug: string }>) {
  if (!name) {
    return [];
  }

  const match = list.find((item) => item.name === name);
  return match ? getEntityTerms(match.name, match.slug) : uniqueNormalized([name]);
}

const productSearchTermsCache = new WeakMap<Product, string[]>();

export function getProductSearchTerms(product: Product) {
  const cachedTerms = productSearchTermsCache.get(product);

  if (cachedTerms) {
    return cachedTerms;
  }

  const terms = uniqueNormalized([
    product.name,
    product.shortDescription,
    product.description,
    product.driverName,
    product.teamName,
    product.legendName,
    product.collection,
    product.type,
    productTypeLabels[product.type],
    ...getEntityAliasesByName(product.driverName, drivers),
    ...getEntityAliasesByName(product.teamName, teams),
    ...getEntityAliasesByName(product.legendName, legends),
    ...getProductTypeTerms(product.type),
  ]);

  productSearchTermsCache.set(product, terms);
  return terms;
}
