"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { CatalogCategory, FeaturedCollection, ProductColor, ProductType } from "@/lib/types";
import { FilterSidebar } from "@/components/filter-sidebar";
import { Button } from "@/components/ui/button";

type DrawerProps = {
  open: boolean;
  category: CatalogCategory | "All";
  priceRange: [number, number];
  colors: ProductColor[];
  availableTeams: string[];
  availableDrivers: string[];
  availableLegends: string[];
  teams: string[];
  drivers: string[];
  legends: string[];
  types: ProductType[];
  sizes: Array<"XS" | "S" | "M" | "L" | "XL" | "XXL">;
  collections: FeaturedCollection[];
  setOpen: (value: boolean) => void;
  setCategory: (value: CatalogCategory | "All") => void;
  setPriceRange: (value: [number, number]) => void;
  toggleColor: (value: ProductColor) => void;
  toggleTeam: (value: string) => void;
  toggleDriver: (value: string) => void;
  toggleLegend: (value: string) => void;
  toggleType: (value: ProductType) => void;
  toggleCollection: (value: FeaturedCollection) => void;
  toggleSize: (value: "XS" | "S" | "M" | "L" | "XL" | "XXL") => void;
  clearAll: () => void;
};

export function MobileFilterDrawer(props: DrawerProps) {
  useBodyScrollLock(props.open);

  return (
    <>
      <Button variant="secondary" className="w-full lg:hidden sm:w-auto" onClick={() => props.setOpen(true)}>
        Фильтры
      </Button>
      <AnimatePresence>
        {props.open ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => props.setOpen(false)}
              className="fixed inset-0 z-50 bg-black/30 lg:hidden"
              aria-label="Закрыть фильтры"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-[60] h-[100dvh] w-full max-w-[min(calc(100vw-1rem),24rem)] overflow-y-auto overscroll-contain bg-[#fbfaf6] p-4 lg:hidden"
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
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export { MobileFilterDrawer as MobileFiltersDrawer };
