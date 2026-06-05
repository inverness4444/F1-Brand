import type { Product } from "@/lib/types";

export function isPublicProduct(product: Pick<Product, "status">) {
  return (product.status ?? "ACTIVE") === "ACTIVE";
}

export function filterPublicProducts<T extends Pick<Product, "status">>(products: T[]) {
  return products.filter(isPublicProduct);
}
