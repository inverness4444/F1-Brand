import { ShopShell } from "@/components/shop-shell";

type PilotsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PilotsPage({ searchParams }: PilotsPageProps) {
  return <ShopShell section="pilots" initialParams={await searchParams} />;
}
