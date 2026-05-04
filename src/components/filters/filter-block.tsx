import type { PropsWithChildren } from "react";
import { ChevronDown } from "lucide-react";

export function FilterBlock({
  title,
  defaultOpen = true,
  children,
}: PropsWithChildren<{ title: string; defaultOpen?: boolean }>) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">
        {title}
        <ChevronDown className="size-4 text-slate-400" />
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}
