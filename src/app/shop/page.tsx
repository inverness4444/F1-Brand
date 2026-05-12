import { ShopShell } from "@/components/shop-shell";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  return <ShopShell initialParams={await searchParams} />;
}
