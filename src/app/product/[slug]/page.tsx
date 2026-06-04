import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProductDetailShell } from "@/components/product-detail-shell";
import { StructuredData } from "@/components/structured-data";
import { readCatalogProductsFromDb } from "@/lib/server/catalog-db";
import { getProductCategoryBreadcrumb } from "@/lib/storefront-text";
import {
  breadcrumbJsonLd,
  buildProductMetadata,
  productJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ product?: string }>;
};

export const revalidate = 300;

async function findProduct(slug: string, productId?: string) {
  const products = await readCatalogProductsFromDb();

  return (
    (productId ? products.find((item) => item.id === productId) : undefined) ??
    products.find((item) => item.slug === slug || item.id === slug)
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, { product: productId }] = await Promise.all([params, searchParams]);
  const product = await findProduct(slug, productId);

  if (!product) {
    notFound();
  }

  return buildProductMetadata(product);
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { product }] = await Promise.all([params, searchParams]);
  const foundProduct = await findProduct(slug, product);
  const categoryBreadcrumb = foundProduct ? getProductCategoryBreadcrumb(foundProduct) : null;

  if (!foundProduct) {
    notFound();
  }

  if (foundProduct && slug !== foundProduct.slug) {
    redirect(`/product/${foundProduct.slug}`);
  }

  return (
    <>
      {foundProduct ? (
        <StructuredData
          data={[
            productJsonLd(foundProduct),
            breadcrumbJsonLd([
              { name: "Главная", path: "/" },
              categoryBreadcrumb
                ? { name: categoryBreadcrumb.label, path: categoryBreadcrumb.href }
                : { name: "Каталог", path: "/shop" },
              {
                name: foundProduct.name,
                path: `/product/${foundProduct.slug}`,
              },
            ]),
          ]}
        />
      ) : null}
      <ProductDetailShell slug={slug} productId={product} />
    </>
  );
}
