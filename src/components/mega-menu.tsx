import Link from "next/link";

export function MegaMenu({
  columns,
}: {
  columns: ReadonlyArray<{
    title: string;
    links: ReadonlyArray<{ label: string; href: string }>;
  }>;
}) {
  const gridClassName =
    columns.length >= 3
      ? "lg:grid-cols-3"
      : columns.length === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-[260px]";

  return (
    <div className="absolute inset-x-0 top-full border-t border-[var(--line)] bg-white">
      <div className={`container-shell grid gap-8 py-8 ${gridClassName}`}>
        {columns.map((column, index) => (
          <div key={`${column.title}-${column.links[0]?.href ?? index}`}>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#7b7a75]">
              {column.title}
            </p>
            <div className="mt-4 space-y-3">
              {column.links.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="block text-sm font-medium text-[#111111] transition hover:text-[#7b2220]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
