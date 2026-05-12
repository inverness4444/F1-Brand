import { ShopShell } from "@/components/shop-shell";

type TeamsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  return <ShopShell section="teams" initialParams={await searchParams} />;
}
