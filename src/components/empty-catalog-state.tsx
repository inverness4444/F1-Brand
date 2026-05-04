import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

export function EmptyCatalogState({
  title = "Каталог пока пуст",
  description = "Добавьте первые товары через редактор каталога, и они сразу появятся на витрине.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[1.8rem] border border-[var(--line)] bg-white p-8 text-center ${compact ? "" : "mt-6"}`}>
      <h3 className="font-[var(--font-heading)] text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#5f615f]">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={buttonClassName({ variant: "secondary" })}>
          Открыть каталог
        </Link>
      </div>
    </div>
  );
}
