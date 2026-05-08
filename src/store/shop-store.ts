"use client";

import { create } from "zustand";

import { priceBounds } from "@/lib/data/products";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import { filterParamSchema } from "@/lib/validation-schemas";
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
  initializeFromParams: (params: {
    category?: CatalogCategory | "All";
    team?: string;
    driver?: string;
    legend?: string;
    type?: ProductType;
    collection?: FeaturedCollection;
    q?: string;
  }) => void;
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

function toggleValue<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
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
    const normalizedParams = filterParamSchema.parse(params) as {
      category?: CatalogCategory | "All";
      team?: string;
      driver?: string;
      legend?: string;
      type?: ProductType;
      collection?: FeaturedCollection;
      q?: string;
    };

    set({
      ...defaultState,
      category: normalizedParams.category ?? "All",
      teams: normalizedParams.team ? [normalizedParams.team] : [],
      drivers: normalizedParams.driver ? [normalizedParams.driver] : [],
      legends: normalizedParams.legend ? [normalizedParams.legend] : [],
      types: normalizedParams.type ? [normalizedParams.type] : [],
      collections: normalizedParams.collection ? [normalizedParams.collection] : [],
      search: normalizedParams.q ?? "",
    });
  },
}));
