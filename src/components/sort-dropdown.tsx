import { sortLabels, sortOptions } from "@/lib/catalog-ui";
import type { SortKey } from "@/lib/types";

export function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <label className="flex w-full min-w-0 items-center gap-3 text-[0.95rem] text-[#5f615f] sm:w-auto">
      <span className="shrink-0">Sort by:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        className="h-10 w-full min-w-0 appearance-none border-0 bg-transparent p-0 pr-6 text-[1rem] font-medium text-[#111111] outline-none sm:w-auto"
      >
        {sortOptions.map((option) => (
          <option key={option} value={option}>
            {sortLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
