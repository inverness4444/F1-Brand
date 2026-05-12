"use client";

import Link from "next/link";

import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { ProductImage } from "@/components/product-image";
import { imageByType } from "@/lib/data/products";
import { useCatalogProducts } from "@/hooks/use-catalog-products";

const tiles = [
  {
    title: "Командная коллекция",
    href: "/teams",
    description: "Коллекции команд Formula 1 в стиле официального магазина спортивной одежды.",
    source: "teamwearProducts" as const,
    imageSrc: "/category-team-collection-2.jpg",
    imageClassName: "h-full w-full object-cover object-[center_42%]",
  },
  {
    title: "Коллекции пилотов",
    href: "/pilots",
    description: "Одежда, вдохновлённая составом пилотов Formula 1 сезона 2026.",
    source: "driverCollectionProducts" as const,
    imageSrc: "/category-team-collection.jpg",
    imageClassName: "h-full w-full object-cover object-[center_56%]",
  },
  {
    title: "Аксессуары",
    href: "/accessories",
    description: "Кепки, дорожные аксессуары и аккуратные функциональные дополнения.",
    source: "saleProducts" as const,
    imageSrc: "/category-accessories.jpg",
    imageClassName: "h-full w-full object-cover object-[center_38%]",
  },
];

export function CategoryTiles() {
  const catalog = useCatalogProducts();

  if (catalog.hasHydrated && catalog.products.length === 0) {
    return (
      <section className="container-shell mt-14">
        <div className="mb-6">
          <p className="section-kicker">Категории</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-semibold tracking-[-0.06em] text-[#111111]">
            Основные разделы магазина в подаче современного спортивного ритейла.
          </h2>
        </div>
        <EmptyCatalogState compact />
      </section>
    );
  }

  return (
    <section className="container-shell mt-14">
      <div className="mb-6">
        <p className="section-kicker">Категории</p>
        <h2 className="mt-3 font-[var(--font-heading)] text-4xl font-semibold tracking-[-0.06em] text-[#111111]">
          Основные разделы магазина в подаче современного спортивного ритейла.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {tiles.map((tile) => {
          const product = catalog[tile.source][0];
          const imageSrc = tile.imageSrc ?? product?.image;
          const imageClassName =
            tile.imageClassName ??
            "h-full w-full translate-y-4 scale-[1.28] object-contain transition duration-300 group-hover:translate-y-5 group-hover:scale-[1.33]";

          return (
            <Link
              key={tile.title}
              href={tile.href}
              className="group overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-white"
            >
              <div className="relative flex aspect-[4/4.8] items-end justify-center overflow-hidden bg-[linear-gradient(180deg,#f8f5ef_0%,#efeadf_100%)] p-0">
                {imageSrc ? (
                  <ProductImage
                    src={imageSrc}
                    fallbackSrc={product ? imageByType[product.type] : undefined}
                    alt={product?.name ?? tile.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className={imageClassName}
                  />
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
                  {tile.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5f615f]">{tile.description}</p>
                <span className="mt-5 inline-flex text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[#111111]">
                  Смотреть
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
