"use client";

import { Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { imageByType } from "@/lib/data/products";
import type { Product } from "@/lib/types";
import { getProductDisplayName } from "@/lib/storefront-text";
import { formatPrice, getProductHref } from "@/lib/utils";

export function FavoritesGrid({
  products,
  onAddToCart,
  onRemove,
}: {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onRemove: (productId: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="card-panel flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Heart className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">В избранном пока пусто</h2>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          Сохраняйте товары, чтобы быстро вернуться к ним позже перед покупкой.
        </p>
        <Link href="/shop" className="button-base button-primary mt-5 rounded-2xl">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <article key={product.id} className="card-panel flex h-full flex-col p-4">
          <Link
            href={getProductHref(product)}
            className="relative flex aspect-square items-center justify-center rounded-[18px] bg-slate-50 p-4"
          >
            <ProductImage
              src={product.image}
              fallbackSrc={imageByType[product.type]}
              alt={product.name}
              width={420}
              height={420}
              className="h-full w-full object-contain"
            />
          </Link>

          <div className="flex flex-1 flex-col pt-4">
            <Link
              href={getProductHref(product)}
              className="line-clamp-2 text-base font-semibold text-slate-900 transition hover:text-red-600"
            >
              {getProductDisplayName(product)}
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              {product.driverName ?? product.teamName ?? product.legendName}
            </p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{formatPrice(product.price)}</p>

            <div className="mt-auto grid gap-2 pt-5">
              <Button className="rounded-2xl" onClick={() => onAddToCart(product)}>
                <ShoppingCart className="size-4" />
                Добавить в корзину
              </Button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  href={getProductHref(product)}
                  className="button-base button-secondary rounded-2xl text-sm"
                >
                  Открыть
                </Link>
                <Button
                  variant="secondary"
                  className="rounded-2xl text-sm"
                  onClick={() => onRemove(product.id)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
