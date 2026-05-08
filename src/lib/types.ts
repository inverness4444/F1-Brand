export type CatalogCategory = "Pilots" | "Teams" | "Legends" | "Accessories" | "Essentials" | "Gifts";

export type CommerceProductKind = "standard" | "gift_certificate";

export type FeaturedCollection = string;

export type CatalogCollection = {
  id: string;
  slug: string;
  name: string;
  productIds: string[];
  createdAt: string;
};

export type ProductType =
  | "T-shirt"
  | "Hoodie"
  | "Longsleeve"
  | "Jacket"
  | "Polo"
  | "Pants"
  | "Scarf"
  | "Lego"
  | "Cap"
  | "Accessory"
  | "Calendar"
  | "Poster"
  | "Gift Certificate";

export type ProductBadge = "New" | "Hit" | "Limited" | "Preorder" | "OutOfStock" | "Sale";

export type ProductColor =
  | "Black"
  | "White"
  | "Navy"
  | "Grey"
  | "Red"
  | "Orange"
  | "Green"
  | "Blue"
  | "Yellow"
  | "Silver"
  | "Beige"
  | "Pink";

export type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "One Size";
export type ProductGender = "Men" | "Women" | "Unisex";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: CatalogCategory;
  collection: FeaturedCollection;
  collectionTags: FeaturedCollection[];
  driverName: string | null;
  driverSlug: string | null;
  teamName: string | null;
  teamSlug: string | null;
  legendName: string | null;
  legendSlug: string | null;
  gender: ProductGender;
  price: number;
  productType: CommerceProductKind;
  requiresShipping: boolean;
  colors: ProductColor[];
  sizes: ProductSize[];
  type: ProductType;
  badge: ProductBadge;
  image: string;
  gallery: string[];
  description: string;
  shortDescription: string;
  popularity: number;
  createdAt: string;
  number?: number;
  hexPalette: string[];
};

export type Team = {
  name: string;
  slug: string;
  colors: ProductColor[];
  hexPalette: string[];
  drivers: string[];
  label: string;
};

export type Driver = {
  name: string;
  slug: string;
  teamName: string;
  teamSlug: string;
  number: number;
  colors: ProductColor[];
  hexPalette: string[];
  label: string;
};

export type Legend = {
  name: string;
  slug: string;
  colors: ProductColor[];
  hexPalette: string[];
  era: string;
  label: string;
};

export type SortKey =
  | "Featured"
  | "Newest"
  | "Price Low to High"
  | "Price High to Low"
  | "Best Selling";

export type ShopFilters = {
  category: CatalogCategory | "All";
  priceRange: [number, number];
  colors: ProductColor[];
  teams: string[];
  drivers: string[];
  legends: string[];
  types: ProductType[];
  sizes: Exclude<ProductSize, "One Size">[];
  collections: FeaturedCollection[];
  search: string;
  sort: SortKey;
};
