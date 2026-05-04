"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { filterProducts, sortProducts } from "@/lib/filter-products";
import type { CatalogCategory, FeaturedCollection, ProductType } from "@/lib/types";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { FilterSidebar } from "@/components/filter-sidebar";
import { MobileFilterDrawer } from "@/components/mobile-filters-drawer";
import { ProductGrid } from "@/components/product-grid";
import { SortDropdown } from "@/components/sort-dropdown";
import { buttonClassName } from "@/components/ui/button";
import { productTypeOptions } from "@/lib/data/roster";
import { useShopStore } from "@/store/shop-store";

const categoryValues: Array<CatalogCategory | "All"> = ["All", "Pilots", "Teams", "Legends", "Essentials", "Gifts"];
const typeValues: ProductType[] = [...productTypeOptions];
const collectionValues: FeaturedCollection[] = [
  "New Arrivals",
  "Teamwear",
  "Driver Collection",
  "Legends",
  "Essentials",
  "Sale",
];

export function ShopShell() {
  const searchParams = useSearchParams();
  const { hasHydrated, products, driverOptions, legendOptions, teamOptions } = useCatalogProducts();
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

  useEffect(() => {
    initializeFromParams({
      category: categoryValues.includes(searchParams.get("category") as CatalogCategory | "All")
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
  }, [initializeFromParams, searchParams]);

  const filteredProducts = useMemo(
    () =>
      sortProducts(
        filterProducts(products, {
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
        }),
        sort,
      ),
    [products, category, priceRange, colors, teams, drivers, legends, types, sizes, collections, search, sort],
  );

  const activeFilterCount =
    colors.length +
    teams.length +
    drivers.length +
    legends.length +
    types.length +
    sizes.length +
    collections.length +
    (category !== "All" ? 1 : 0);
  const normalizedSearch = search.trim();
  const hasFiltersOrSearch = activeFilterCount > 0 || normalizedSearch.length > 0;

  return (
    <div className="pb-16">
      <section className="container-shell grid gap-8 pt-8 lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-8">
        <FilterSidebar
          category={category}
          priceRange={priceRange}
          colors={colors}
          availableTeams={teamOptions}
          availableDrivers={driverOptions}
          availableLegends={legendOptions}
          teams={teams}
          drivers={drivers}
          legends={legends}
          types={types}
          sizes={sizes}
          collections={collections}
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
        />

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

            <div className="mt-4 lg:hidden">
              <MobileFilterDrawer
                open={mobileFiltersOpen}
                category={category}
                priceRange={priceRange}
                colors={colors}
                availableTeams={teamOptions}
                availableDrivers={driverOptions}
                availableLegends={legendOptions}
                teams={teams}
                drivers={drivers}
                legends={legends}
                types={types}
                sizes={sizes}
                collections={collections}
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
              />
            </div>
          </div>

          <ProductGrid
            products={filteredProducts}
            empty={
              hasHydrated && products.length === 0 ? (
                <EmptyCatalogState compact />
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
