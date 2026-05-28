"use client";

import { create } from "zustand";

import { sortOptions } from "@/lib/catalog-ui";
import { priceBounds } from "@/lib/data/products";
import { colorOptions, productTypeOptions, sizeOptions } from "@/lib/data/roster";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import type {
  CatalogCategory,
  FeaturedCollection,
  ProductColor,
  ProductSize,
  ProductType,
  ShopFilters,
  SortKey,
} from "@/lib/types";

type FilterSize = Exclude<ProductSize, "One Size">;
type FilterParamValue = string | string[] | undefined;
type FilterParams = {
  category?: FilterParamValue;
  team?: FilterParamValue;
  driver?: FilterParamValue;
  legend?: FilterParamValue;
  color?: FilterParamValue;
  type?: FilterParamValue;
  size?: FilterParamValue;
  collection?: FilterParamValue;
  q?: FilterParamValue;
  sort?: FilterParamValue;
  minPrice?: FilterParamValue;
  maxPrice?: FilterParamValue;
};

type ShopState = ShopFilters & {
  mobileFiltersOpen: boolean;
  setCategory: (value: ShopState["category"]) => void;
  setPriceRange: (value: [number, number]) => void;
  toggleColor: (value: ProductColor) => void;
  toggleTeam: (value: string) => void;
  toggleDriver: (value: string) => void;
  toggleLegend: (value: string) => void;
  toggleType: (value: ProductType) => void;
  toggleCollection: (value: FeaturedCollection) => void;
  toggleSize: (value: FilterSize) => void;
  setSearch: (value: string) => void;
  setSort: (value: SortKey) => void;
  clearAll: () => void;
  setMobileFiltersOpen: (value: boolean) => void;
  initializeFromParams: (params: FilterParams) => void;
};

const defaultState: ShopFilters = {
  category: "All",
  priceRange: [priceBounds.min, priceBounds.max],
  colors: [],
  teams: [],
  drivers: [],
  legends: [],
  types: [],
  sizes: [],
  collections: [],
  search: "",
  sort: "Featured",
};
const categoryOptions: Array<CatalogCategory | "All"> = ["All", "Pilots", "Teams", "Legends", "Accessories", "Essentials", "Gifts"];
const colorOptionSet = new Set<ProductColor>(colorOptions);
const productTypeOptionSet = new Set<ProductType>(productTypeOptions);
const sizeOptionSet = new Set<FilterSize>(sizeOptions);
const sortOptionSet = new Set<SortKey>(sortOptions);

function toggleValue<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function getParamValues(value: FilterParamValue) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

function getAllowedParamValues<T extends string>(value: FilterParamValue, allowedValues: Set<T>) {
  return uniqueValues(getParamValues(value).filter((item): item is T => allowedValues.has(item as T)));
}

function getTextParamValues(value: FilterParamValue) {
  return uniqueValues(
    getParamValues(value)
      .map((item) => sanitizeSearchQuery(item))
      .filter(Boolean),
  );
}

function getFirstParamValue(value: FilterParamValue) {
  return getParamValues(value)[0];
}

function getPriceParam(value: FilterParamValue, fallback: number) {
  const parsedValue = Number(getFirstParamValue(value));

  return Number.isFinite(parsedValue) ? Math.round(parsedValue) : fallback;
}

function getPriceRangeFromParams(params: FilterParams): [number, number] {
  const minPrice = Math.max(priceBounds.min, getPriceParam(params.minPrice, defaultState.priceRange[0]));
  const maxPrice = Math.min(priceBounds.max, getPriceParam(params.maxPrice, defaultState.priceRange[1]));

  return [Math.min(minPrice, maxPrice), Math.max(minPrice, maxPrice)];
}

export const useShopStore = create<ShopState>((set) => ({
  ...defaultState,
  mobileFiltersOpen: false,
  setCategory: (value) => set({ category: value }),
  setPriceRange: (value) => set({ priceRange: value }),
  toggleColor: (value) => set((state) => ({ colors: toggleValue(state.colors, value) })),
  toggleTeam: (value) => set((state) => ({ teams: toggleValue(state.teams, value) })),
  toggleDriver: (value) => set((state) => ({ drivers: toggleValue(state.drivers, value) })),
  toggleLegend: (value) => set((state) => ({ legends: toggleValue(state.legends, value) })),
  toggleType: (value) => set((state) => ({ types: toggleValue(state.types, value) })),
  toggleCollection: (value) =>
    set((state) => ({ collections: toggleValue(state.collections, value) })),
  toggleSize: (value) => set((state) => ({ sizes: toggleValue(state.sizes, value) })),
  setSearch: (value) => set({ search: sanitizeSearchQuery(value) }),
  setSort: (value) => set({ sort: value }),
  clearAll: () => set({ ...defaultState, mobileFiltersOpen: false }),
  setMobileFiltersOpen: (value) => set({ mobileFiltersOpen: value }),
  initializeFromParams: (params) => {
    const categoryParam = getFirstParamValue(params.category);
    const category = categoryOptions.includes(categoryParam as CatalogCategory | "All")
      ? (categoryParam as CatalogCategory | "All")
      : "All";
    const sortParam = getFirstParamValue(params.sort);

    set({
      ...defaultState,
      category,
      priceRange: getPriceRangeFromParams(params),
      colors: getAllowedParamValues(params.color, colorOptionSet),
      teams: getTextParamValues(params.team),
      drivers: getTextParamValues(params.driver),
      legends: getTextParamValues(params.legend),
      types: getAllowedParamValues(params.type, productTypeOptionSet),
      sizes: getAllowedParamValues(params.size, sizeOptionSet),
      collections: getTextParamValues(params.collection),
      search: sanitizeSearchQuery(getFirstParamValue(params.q) ?? ""),
      sort: sortOptionSet.has(sortParam as SortKey) ? (sortParam as SortKey) : defaultState.sort,
    });
  },
}));
