"use client";

import Link from "next/link";

import { getRecommendedProducts, useCatalogProducts } from "@/hooks/use-catalog-products";
import { ProductPage } from "@/components/product-page";
import { buttonClassName } from "@/components/ui/button";

export function ProductDetailShell({ slug, productId }: { slug: string; productId?: string }) {
  const { hasHydrated, products } = useCatalogProducts();

  if (!hasHydrated) {
    return (
      <section className="container-shell py-12">
        <div className="rounded-[1.8rem] border border-[var(--line)] bg-white p-8">
          <p className="section-kicker">Товар</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-4xl font-semibold tracking-[-0.06em] text-[#111111]">
            Загружаем товар
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">
            Подготавливаем карточку товара и синхронизируем локальный каталог.
          </p>
        </div>
      </section>
    );
  }

  const product = products.find((item) => item.id === productId) ?? products.find((item) => item.slug === slug);

  if (!product) {
    return (
      <section className="container-shell py-12">
        <div className="rounded-[1.8rem] border border-[var(--line)] bg-white p-8 text-center">
          <p className="section-kicker">Товар не найден</p>
          <h1 className="mt-3 font-[var(--font-heading)] text-4xl font-semibold tracking-[-0.06em] text-[#111111]">
            Этот товар больше недоступен
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#5f615f]">
            Возможно, товар был удалён из локального каталога или изменился его адрес.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={buttonClassName({})}>
              Вернуться в каталог
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <ProductPage key={product.id} product={product} recommendedProducts={getRecommendedProducts(products, product)} />;
}
