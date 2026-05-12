import { ShopShell } from "@/components/shop-shell";

type AccessoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccessoriesPage({ searchParams }: AccessoriesPageProps) {
  return <ShopShell section="accessories" initialParams={await searchParams} />;
}
