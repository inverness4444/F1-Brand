"use client";

import { collectionLabels, collectionOptions, colorSwatches, productTypeLabels } from "@/lib/catalog-ui";
import { colorOptions, productTypeOptions, sizeOptions } from "@/lib/data/roster";
import type {
  CatalogCategory,
  FeaturedCollection,
  ProductColor,
  ProductType,
} from "@/lib/types";
import { colorLabelRu } from "@/lib/storefront-text";

const categoryOptions: Array<{ label: string; value: CatalogCategory | "All" }> = [
  { label: "Все товары", value: "All" },
  { label: "Пилоты", value: "Pilots" },
  { label: "Команды", value: "Teams" },
  { label: "Легенды", value: "Legends" },
  { label: "База", value: "Essentials" },
  { label: "Подарки", value: "Gifts" },
];

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[0.96rem] text-[#111111]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="inline-flex size-[1.15rem] shrink-0 items-center justify-center border border-[#d8d4cb] bg-white peer-checked:border-[#111111] peer-checked:bg-[#111111]">
        <span className="size-[0.35rem] rounded-full bg-white opacity-0 transition peer-checked:opacity-100" />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function FilterSidebar({
  mobile = false,
  category,
  priceRange,
  colors,
  availableTeams,
  availableDrivers,
  availableLegends,
  teams,
  drivers,
  legends,
  types,
  sizes,
  collections,
  setCategory,
  setPriceRange,
  toggleColor,
  toggleTeam,
  toggleDriver,
  toggleLegend,
  toggleType,
  toggleCollection,
  toggleSize,
  clearAll,
}: {
  mobile?: boolean;
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
}) {
  const asideClassName = mobile
    ? "px-0 pb-8"
    : "sticky top-28 hidden h-fit border-r border-[var(--line)] pr-7 lg:block xl:pr-8";
  const sectionClassName = "border-t border-[var(--line)] pt-5";
  const summaryClassName =
    "flex cursor-pointer list-none items-center justify-between text-[1.02rem] font-medium text-[#111111] [&::-webkit-details-marker]:hidden";

  return (
    <aside className={asideClassName}>
      <div className="space-y-5">
        <details open className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Раздел</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 space-y-3">
            {categoryOptions.map((option) => (
              <CheckboxRow
                key={option.value}
                label={option.label}
                checked={category === option.value}
                onChange={() => setCategory(option.value)}
              />
            ))}
          </div>
        </details>

        <details open className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Коллекция</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 space-y-3">
            {collectionOptions.map((option) => (
              <CheckboxRow
                key={option}
                label={collectionLabels[option]}
                checked={collections.includes(option)}
                onChange={() => toggleCollection(option)}
              />
            ))}
          </div>
        </details>

        <details open className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Категория</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 space-y-3">
            {productTypeOptions.map((type) => (
              <CheckboxRow
                key={type}
                label={productTypeLabels[type]}
                checked={types.includes(type)}
                onChange={() => toggleType(type)}
              />
            ))}
          </div>
        </details>

        <details open className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Команда</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-2">
            {availableTeams.map((option) => (
              <CheckboxRow
                key={option}
                label={option}
                checked={teams.includes(option)}
                onChange={() => toggleTeam(option)}
              />
            ))}
          </div>
        </details>

        <details className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Пилот</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-2">
            {availableDrivers.map((option) => (
              <CheckboxRow
                key={option}
                label={option}
                checked={drivers.includes(option)}
                onChange={() => toggleDriver(option)}
              />
            ))}
          </div>
        </details>

        <details className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Легенды</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-2">
            {availableLegends.map((option) => (
              <CheckboxRow
                key={option}
                label={option}
                checked={legends.includes(option)}
                onChange={() => toggleLegend(option)}
              />
            ))}
          </div>
        </details>

        <details className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Размер</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`h-11 border text-[0.92rem] transition ${
                  sizes.includes(size)
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-[var(--line)] bg-white text-[#111111]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </details>

        <details className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Цвет</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 space-y-3">
            {colorOptions.map((color) => (
              <label key={color} className="flex cursor-pointer items-center gap-3 text-[0.96rem] text-[#111111]">
                <input
                  type="checkbox"
                  checked={colors.includes(color)}
                  onChange={() => toggleColor(color)}
                  className="peer sr-only"
                />
                <span className="inline-flex size-[1.15rem] shrink-0 items-center justify-center border border-[#d8d4cb] bg-white peer-checked:border-[#111111] peer-checked:bg-[#111111]">
                  <span className="size-[0.35rem] rounded-full bg-white opacity-0 transition peer-checked:opacity-100" />
                </span>
                <span
                  className="size-4 rounded-full border border-[#d8d1c6]"
                  style={{ backgroundColor: colorSwatches[color] }}
                />
                <span>{colorLabelRu[color]}</span>
              </label>
            ))}
          </div>
        </details>

        <details open className={sectionClassName}>
          <summary className={summaryClassName}>
            <span>Цена</span>
            <span className="text-[#7c7c7c]">▾</span>
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={990}
                max={24990}
                value={priceRange[0]}
                onChange={(event) => setPriceRange([Number(event.target.value), priceRange[1]])}
                className="h-12 border border-[var(--line)] bg-white px-4 text-[0.95rem] text-[#111111] outline-none"
              />
              <input
                type="number"
                min={990}
                max={24990}
                value={priceRange[1]}
                onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value)])}
                className="h-12 border border-[var(--line)] bg-white px-4 text-[0.95rem] text-[#111111] outline-none"
              />
            </div>
            <input
              type="range"
              min={990}
              max={24990}
              step={100}
              value={priceRange[1]}
              onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value)])}
              className="w-full accent-black"
            />
          </div>
        </details>

        {mobile ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-[#111111] underline underline-offset-4"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    </aside>
  );
}
