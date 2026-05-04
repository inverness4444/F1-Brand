import type { Product, ShopFilters } from "@/lib/types";
import {
  collectionLabelRu,
  getProductDescription,
  getProductDisplayName,
  getProductShortDescription,
  productTypeLabelRu,
} from "@/lib/storefront-text";
import { getProductSearchTerms, normalizeSearchText } from "@/lib/search-utils";

function featuredBadgeWeight(product: Product) {
  switch (product.badge) {
    case "Hit":
      return 40;
    case "Limited":
      return 30;
    case "Preorder":
      return 25;
    case "OutOfStock":
      return 0;
    case "New":
      return 20;
    default:
      return 10;
  }
}

export function filterProducts(products: Product[], filters: ShopFilters) {
  const query = normalizeSearchText(filters.search);
  const [minPrice, maxPrice] = filters.priceRange;

  return products.filter((product) => {
    const matchesCategory = filters.category === "All" ? true : product.category === filters.category;
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
    const matchesColors =
      filters.colors.length === 0 || filters.colors.some((color) => product.colors.includes(color));
    const matchesTeams =
      filters.teams.length === 0 || (product.teamName ? filters.teams.includes(product.teamName) : false);
    const matchesDrivers =
      filters.drivers.length === 0 ||
      (product.driverName ? filters.drivers.includes(product.driverName) : false);
    const matchesLegends =
      filters.legends.length === 0 ||
      (product.legendName ? filters.legends.includes(product.legendName) : false);
    const matchesTypes = filters.types.length === 0 || filters.types.includes(product.type);
    const matchesSizes =
      filters.sizes.length === 0 || filters.sizes.some((size) => product.sizes.includes(size));
    const matchesCollections =
      filters.collections.length === 0 ||
      filters.collections.some((collection) => product.collectionTags.includes(collection));
    const matchesSearch =
      query.length === 0
        ? true
        : [
            product.name,
            getProductDisplayName(product),
            product.shortDescription,
            getProductShortDescription(product),
            product.description,
            getProductDescription(product),
            product.driverName,
            product.teamName,
            product.legendName,
            product.collection,
            collectionLabelRu[product.collection],
            product.type,
            productTypeLabelRu[product.type],
            ...getProductSearchTerms(product),
          ]
            .filter(Boolean)
            .some((value) => normalizeSearchText(String(value)).includes(query));

    return (
      matchesCategory &&
      matchesPrice &&
      matchesColors &&
      matchesTeams &&
      matchesDrivers &&
      matchesLegends &&
      matchesTypes &&
      matchesSizes &&
      matchesCollections &&
      matchesSearch
    );
  });
}

export function sortProducts(products: Product[], sort: ShopFilters["sort"]) {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "Newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "Price Low to High":
        return a.price - b.price;
      case "Price High to Low":
        return b.price - a.price;
      case "Best Selling":
        return b.popularity - a.popularity;
      case "Featured":
      default:
        return featuredBadgeWeight(b) + b.popularity - (featuredBadgeWeight(a) + a.popularity);
    }
  });
}
