"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { collectionOptions } from "@/lib/catalog-ui";
import { filterProducts, sortProducts } from "@/lib/filter-products";
import { priceBounds } from "@/lib/data/products";
import type { CatalogCategory, FeaturedCollection, Product, ProductSize, ProductType } from "@/lib/types";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { FilterSidebar } from "@/components/filter-sidebar";
import { MobileFilterDrawer } from "@/components/mobile-filters-drawer";
import { ProductGrid } from "@/components/product-grid";
import { SortDropdown } from "@/components/sort-dropdown";
import { buttonClassName } from "@/components/ui/button";
import { colorOptions, productTypeOptions, sizeOptions } from "@/lib/data/roster";
import { useShopStore } from "@/store/shop-store";

type FilterSize = Exclude<ProductSize, "One Size">;
type ShopSection = "all" | "teams" | "pilots" | "legends" | "accessories";

const categoryFilterOptions: Array<{ label: string; value: CatalogCategory | "All" }> = [
  { label: "Все товары", value: "All" },
  { label: "Пилоты", value: "Pilots" },
  { label: "Команды", value: "Teams" },
  { label: "Легенды", value: "Legends" },
  { label: "База", value: "Essentials" },
  { label: "Подарки", value: "Gifts" },
];
const categoryValues = categoryFilterOptions.map((option) => option.value);
const typeValues: ProductType[] = [...productTypeOptions];
const collectionValues: FeaturedCollection[] = [...collectionOptions];
const accessoryTypeValues = new Set<ProductType>([
  "Scarf",
  "Lego",
  "Cap",
  "Accessory",
  "Calendar",
  "Poster",
  "Gift Certificate",
]);
const sectionFilterConfig: Record<
  ShopSection,
  {
    showCategoryFilter: boolean;
    showTeamFilter: boolean;
    showDriverFilter: boolean;
    showLegendFilter: boolean;
  }
> = {
  all: {
    showCategoryFilter: true,
    showTeamFilter: true,
    showDriverFilter: true,
    showLegendFilter: true,
  },
  teams: {
    showCategoryFilter: false,
    showTeamFilter: true,
    showDriverFilter: false,
    showLegendFilter: false,
  },
  pilots: {
    showCategoryFilter: false,
    showTeamFilter: true,
    showDriverFilter: true,
    showLegendFilter: false,
  },
  legends: {
    showCategoryFilter: false,
    showTeamFilter: false,
    showDriverFilter: false,
    showLegendFilter: true,
  },
  accessories: {
    showCategoryFilter: false,
    showTeamFilter: false,
    showDriverFilter: false,
    showLegendFilter: false,
  },
};

function matchesShopSection(product: Product, section: ShopSection) {
  if (section === "all") {
    return true;
  }

  if (section === "teams") {
    return product.category === "Teams" || product.collectionTags.includes("Teamwear");
  }

  if (section === "pilots") {
    return product.category === "Pilots" || product.collectionTags.includes("Driver Collection");
  }

  if (section === "legends") {
    return product.category === "Legends" || product.collectionTags.includes("Legends") || Boolean(product.legendName);
  }

  return accessoryTypeValues.has(product.type) || product.category === "Gifts";
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right, "ru"));
}

function orderedValues<T>(order: readonly T[], values: T[]) {
  const present = new Set(values);
  return order.filter((value) => present.has(value));
}

function scopeValues<T>(values: T[], availableValues: T[]) {
  const available = new Set(availableValues);
  return values.filter((value) => available.has(value));
}

function getPriceBounds(products: Product[]): [number, number] {
  if (products.length === 0) {
    return [priceBounds.min, priceBounds.max];
  }

  const prices = products.map((product) => product.price);
  return [Math.min(...prices), Math.max(...prices)];
}

function clampPriceRange(range: [number, number], bounds: [number, number]): [number, number] {
  const min = Math.max(bounds[0], Math.min(range[0], bounds[1]));
  const max = Math.max(min, Math.min(range[1], bounds[1]));
  return [min, max];
}

export function ShopShell({ section = "all" }: { section?: ShopSection }) {
  const searchParams = useSearchParams();
  const { hasHydrated, products } = useCatalogProducts();
  const {
    category,
    priceRange,
    colors,
    teams,
    drivers,
    legends,
    types,
    sizes,
    collections,
    search,
    sort,
    mobileFiltersOpen,
    initializeFromParams,
    setCategory,
    setPriceRange,
    toggleColor,
    toggleTeam,
    toggleDriver,
    toggleLegend,
    toggleType,
    toggleCollection,
    toggleSize,
    setSort,
    clearAll,
    setMobileFiltersOpen,
  } = useShopStore();
  const config = sectionFilterConfig[section];

  useEffect(() => {
    initializeFromParams({
      category: section === "all" && categoryValues.includes(searchParams.get("category") as CatalogCategory | "All")
        ? (searchParams.get("category") as CatalogCategory | "All")
        : undefined,
      team: searchParams.get("team") ?? undefined,
      driver: searchParams.get("driver") ?? undefined,
      legend: searchParams.get("legend") ?? undefined,
      type: typeValues.includes(searchParams.get("type") as ProductType)
        ? (searchParams.get("type") as ProductType)
        : undefined,
      collection: collectionValues.includes(searchParams.get("collection") as FeaturedCollection)
        ? (searchParams.get("collection") as FeaturedCollection)
        : undefined,
      q: searchParams.get("q") ?? undefined,
    });
  }, [initializeFromParams, searchParams, section]);

  const sectionProducts = useMemo(
    () => products.filter((product) => matchesShopSection(product, section)),
    [products, section],
  );

  const filterOptions = useMemo(() => {
    const availableCategoryValues = new Set(sectionProducts.map((product) => product.category));
    const availableCollectionValues = sectionProducts.flatMap((product) => product.collectionTags);
    const availableTypeValues = sectionProducts.map((product) => product.type);
    const availableColorValues = sectionProducts.flatMap((product) => product.colors);
    const availableSizeValues = sectionProducts.flatMap((product) => product.sizes);

    return {
      categories: categoryFilterOptions.filter(
        (option) => option.value === "All" || availableCategoryValues.has(option.value),
      ),
      collections: orderedValues(collectionValues, availableCollectionValues),
      colors: orderedValues(colorOptions, availableColorValues),
      teams: uniqueSorted(sectionProducts.map((product) => product.teamName)),
      drivers: uniqueSorted(sectionProducts.map((product) => product.driverName)),
      legends: uniqueSorted(sectionProducts.map((product) => product.legendName)),
      types: orderedValues(typeValues, availableTypeValues),
      sizes: orderedValues(sizeOptions, availableSizeValues) as FilterSize[],
      priceBounds: getPriceBounds(sectionProducts),
    };
  }, [sectionProducts]);

  const scopedCategory = section === "all" ? category : "All";
  const scopedColors = scopeValues(colors, filterOptions.colors);
  const scopedTeams = scopeValues(teams, filterOptions.teams);
  const scopedDrivers = scopeValues(drivers, filterOptions.drivers);
  const scopedLegends = scopeValues(legends, filterOptions.legends);
  const scopedTypes = scopeValues(types, filterOptions.types);
  const scopedSizes = scopeValues(sizes, filterOptions.sizes);
  const scopedCollections = scopeValues(collections, filterOptions.collections);
  const scopedPriceRange = clampPriceRange(priceRange, filterOptions.priceBounds);

  const filteredProducts = useMemo(
    () =>
      sortProducts(
        filterProducts(sectionProducts, {
          category: scopedCategory,
          priceRange: scopedPriceRange,
          colors: scopedColors,
          teams: scopedTeams,
          drivers: scopedDrivers,
          legends: scopedLegends,
          types: scopedTypes,
          sizes: scopedSizes,
          collections: scopedCollections,
          search,
          sort,
        }),
        sort,
      ),
    [
      sectionProducts,
      scopedCategory,
      scopedPriceRange,
      scopedColors,
      scopedTeams,
      scopedDrivers,
      scopedLegends,
      scopedTypes,
      scopedSizes,
      scopedCollections,
      search,
      sort,
    ],
  );

  const activeFilterCount =
    scopedColors.length +
    scopedTeams.length +
    scopedDrivers.length +
    scopedLegends.length +
    scopedTypes.length +
    scopedSizes.length +
    scopedCollections.length +
    (section === "all" && scopedCategory !== "All" ? 1 : 0);
  const normalizedSearch = search.trim();
  const hasFiltersOrSearch = activeFilterCount > 0 || normalizedSearch.length > 0;
  const sectionIsEmpty = hasHydrated && sectionProducts.length === 0 && !hasFiltersOrSearch;
  const showPriceFilter = sectionProducts.length > 0 && filterOptions.priceBounds[0] < filterOptions.priceBounds[1];
  const hasFilterControls =
    (config.showCategoryFilter && filterOptions.categories.length > 0) ||
    filterOptions.collections.length > 0 ||
    filterOptions.types.length > 0 ||
    (config.showTeamFilter && filterOptions.teams.length > 0) ||
    (config.showDriverFilter && filterOptions.drivers.length > 0) ||
    (config.showLegendFilter && filterOptions.legends.length > 0) ||
    filterOptions.sizes.length > 0 ||
    filterOptions.colors.length > 0 ||
    showPriceFilter;

  return (
    <div className="pb-16">
      <section
        className={
          hasFilterControls
            ? "container-shell grid gap-8 pt-8 lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-8"
            : "container-shell pt-8"
        }
      >
        {hasFilterControls ? (
          <FilterSidebar
            category={category}
            priceRange={scopedPriceRange}
            colors={scopedColors}
            availableCategories={filterOptions.categories}
            availableCollections={filterOptions.collections}
            availableColors={filterOptions.colors}
            availableTypes={filterOptions.types}
            availableSizes={filterOptions.sizes}
            availableTeams={filterOptions.teams}
            availableDrivers={filterOptions.drivers}
            availableLegends={filterOptions.legends}
            teams={scopedTeams}
            drivers={scopedDrivers}
            legends={scopedLegends}
            types={scopedTypes}
            sizes={scopedSizes}
            collections={scopedCollections}
            setCategory={setCategory}
            setPriceRange={setPriceRange}
            toggleColor={toggleColor}
            toggleTeam={toggleTeam}
            toggleDriver={toggleDriver}
            toggleLegend={toggleLegend}
            toggleType={toggleType}
            toggleCollection={toggleCollection}
            toggleSize={toggleSize}
            clearAll={clearAll}
            showCategoryFilter={config.showCategoryFilter}
            showTeamFilter={config.showTeamFilter}
            showDriverFilter={config.showDriverFilter}
            showLegendFilter={config.showLegendFilter}
            showPriceFilter={showPriceFilter}
            priceBounds={filterOptions.priceBounds}
          />
        ) : null}

        <div>
          <div className="mb-8 border-b border-[var(--line)] pb-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-[1.08rem] font-medium text-[#111111]">{filteredProducts.length} товаров</p>
                {normalizedSearch ? (
                  <p className="text-[0.94rem] text-[#666666]">Поиск: “{normalizedSearch}”</p>
                ) : hasFiltersOrSearch ? (
                  <p className="text-[0.94rem] text-[#666666]">Активных фильтров: {activeFilterCount}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/admin"
                  className={buttonClassName({
                    variant: "secondary",
                    className: "min-h-[42px] px-4 py-2 text-[0.85rem]",
                  })}
                >
                  Редактор каталога
                </Link>
                <SortDropdown value={sort} onChange={setSort} />
                {hasFiltersOrSearch ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[0.95rem] font-medium text-[#111111] underline underline-offset-4"
                  >
                    Сбросить
                  </button>
                ) : null}
              </div>
            </div>

            {hasFilterControls ? (
            <div className="mt-4 lg:hidden">
              <MobileFilterDrawer
                open={mobileFiltersOpen}
                category={category}
                priceRange={scopedPriceRange}
                colors={scopedColors}
                availableCategories={filterOptions.categories}
                availableCollections={filterOptions.collections}
                availableColors={filterOptions.colors}
                availableTypes={filterOptions.types}
                availableSizes={filterOptions.sizes}
                availableTeams={filterOptions.teams}
                availableDrivers={filterOptions.drivers}
                availableLegends={filterOptions.legends}
                teams={scopedTeams}
                drivers={scopedDrivers}
                legends={scopedLegends}
                types={scopedTypes}
                sizes={scopedSizes}
                collections={scopedCollections}
                setOpen={setMobileFiltersOpen}
                setCategory={setCategory}
                setPriceRange={setPriceRange}
                toggleColor={toggleColor}
                toggleTeam={toggleTeam}
                toggleDriver={toggleDriver}
                toggleLegend={toggleLegend}
                toggleType={toggleType}
                toggleCollection={toggleCollection}
                toggleSize={toggleSize}
                clearAll={clearAll}
                showCategoryFilter={config.showCategoryFilter}
                showTeamFilter={config.showTeamFilter}
                showDriverFilter={config.showDriverFilter}
                showLegendFilter={config.showLegendFilter}
                showPriceFilter={showPriceFilter}
                priceBounds={filterOptions.priceBounds}
              />
            </div>
            ) : null}
          </div>

          <ProductGrid
            products={filteredProducts}
            empty={
              hasHydrated && products.length === 0 ? (
                <EmptyCatalogState compact />
              ) : sectionIsEmpty ? (
                <div className="border border-[var(--line)] bg-white p-8 text-center">
                  <h3 className="font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                    В этом разделе пока нет товаров
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5f615f]">
                    Добавьте товар с подходящим разделом или тегом в редакторе каталога.
                  </p>
                </div>
              ) : (
                <div className="border border-[var(--line)] bg-white p-8 text-center">
                  <h3 className="font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
                    Ничего не найдено
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5f615f]">
                    Попробуйте изменить сочетание фильтров или поисковый запрос.
                  </p>
                </div>
              )
            }
          />
        </div>
      </section>
    </div>
  );
}
