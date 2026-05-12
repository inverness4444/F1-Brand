"use client";

import { X } from "lucide-react";

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { CatalogCategory, ProductColor, ProductSize, ProductType } from "@/lib/types";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Button } from "@/components/ui/button";

type FilterSize = Exclude<ProductSize, "One Size">;

type DrawerProps = {
  open: boolean;
  category: CatalogCategory | "All";
  priceRange: [number, number];
  colors: ProductColor[];
  availableCategories?: Array<{ label: string; value: CatalogCategory | "All" }>;
  availableColors?: ProductColor[];
  availableTypes?: ProductType[];
  availableSizes?: FilterSize[];
  availableTeams: string[];
  availableDrivers: string[];
  availableLegends: string[];
  availableCollections?: string[];
  teams: string[];
  drivers: string[];
  legends: string[];
  collections: string[];
  types: ProductType[];
  sizes: FilterSize[];
  setOpen: (value: boolean) => void;
  setCategory: (value: CatalogCategory | "All") => void;
  setPriceRange: (value: [number, number]) => void;
  toggleColor: (value: ProductColor) => void;
  toggleTeam: (value: string) => void;
  toggleDriver: (value: string) => void;
  toggleLegend: (value: string) => void;
  toggleCollection: (value: string) => void;
  toggleType: (value: ProductType) => void;
  toggleSize: (value: FilterSize) => void;
  clearAll: () => void;
  showCategoryFilter?: boolean;
  showTeamFilter?: boolean;
  showDriverFilter?: boolean;
  showLegendFilter?: boolean;
  showPriceFilter?: boolean;
  priceBounds?: [number, number];
};

export function MobileFilterDrawer(props: DrawerProps) {
  useBodyScrollLock(props.open);

  return (
    <>
      <Button variant="secondary" className="w-full lg:hidden sm:w-auto" onClick={() => props.setOpen(true)}>
        Фильтры
      </Button>
      {props.open ? (
        <>
            <button
              type="button"
              onClick={() => props.setOpen(false)}
              className="animate-overlay-in fixed inset-0 z-50 bg-black/30 lg:hidden"
              aria-label="Закрыть фильтры"
            />
            <aside
              className="animate-drawer-in fixed right-0 top-0 z-[60] h-[100dvh] w-full max-w-[min(calc(100vw-1rem),24rem)] overflow-y-auto overscroll-contain bg-[#fbfaf6] p-4 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                  Фильтры
                </h3>
                <button
                  type="button"
                  onClick={() => props.setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white"
                  aria-label="Закрыть фильтры"
                >
                  <X className="size-4.5" />
                </button>
              </div>
              <FilterSidebar {...props} mobile />
            </aside>
        </>
      ) : null}
    </>
  );
}

export { MobileFilterDrawer as MobileFiltersDrawer };
