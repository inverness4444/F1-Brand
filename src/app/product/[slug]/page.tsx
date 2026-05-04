import { ProductDetailShell } from "@/components/product-detail-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ product?: string }>;
};

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { product }] = await Promise.all([params, searchParams]);
  return <ProductDetailShell slug={slug} productId={product} />;
}
