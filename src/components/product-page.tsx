"use client";

import Link from "next/link";

import type { Product } from "@/lib/types";
import { getProductDisplayName } from "@/lib/storefront-text";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductInfo } from "@/components/product-info";

export function ProductPage({
  product,
  recommendedProducts,
}: {
  product: Product;
  recommendedProducts: Product[];
}) {
  const isGiftCertificate = product.productType === "gift_certificate";
  const completeTheLook = recommendedProducts.slice(0, 4);
  const alsoLike = recommendedProducts.slice(4, 8).length > 0 ? recommendedProducts.slice(4, 8) : recommendedProducts.slice(0, 4);

  return (
    <div className="pb-14">
      <section className="container-shell pt-6">
        <nav className="mb-5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#7b7a75]">
          <Link href="/" className="transition hover:text-[#111111]">
            Главная
          </Link>
          <span>/</span>
          <Link href="/shop" className="transition hover:text-[#111111]">
            Каталог
          </Link>
          <span>/</span>
          <span className="min-w-0 break-words text-[#111111]">{getProductDisplayName(product)}</span>
        </nav>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_500px]">
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </div>
      </section>

      <section className="container-shell mt-12 sm:mt-16">
        <div className="mb-6">
          <p className="section-kicker">Подборка</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(1.9rem,7vw,2.25rem)] font-semibold tracking-[-0.06em] text-[#111111] sm:text-4xl">
            {isGiftCertificate ? "Другие номиналы" : "Дополните образ"}
          </h2>
        </div>
        <ProductGrid variant="showcase" layout="carousel" products={completeTheLook} />
      </section>

      <section className="container-shell mt-12 sm:mt-16">
        <div className="mb-6">
          <p className="section-kicker">Рекомендации</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(1.9rem,7vw,2.25rem)] font-semibold tracking-[-0.06em] text-[#111111] sm:text-4xl">
            {isGiftCertificate ? "Что ещё можно подарить" : "Вам может понравиться"}
          </h2>
        </div>
        <ProductGrid variant="showcase" layout="carousel" products={alsoLike} />
      </section>
    </div>
  );
}
