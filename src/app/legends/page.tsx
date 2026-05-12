import { ShopShell } from "@/components/shop-shell";

type LegendsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegendsPage({ searchParams }: LegendsPageProps) {
  return <ShopShell section="legends" initialParams={await searchParams} />;
}
