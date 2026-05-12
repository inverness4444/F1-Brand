"use client";

import Link from "next/link";
import { useDeferredValue, useMemo } from "react";

import { ProductImage } from "@/components/product-image";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { imageByType } from "@/lib/data/products";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import { getProductSearchTerms, normalizeSearchText, resolveSmartSearchTarget } from "@/lib/search-utils";
import { getProductDisplayName } from "@/lib/storefront-text";
import { formatPrice, getProductHref } from "@/lib/utils";

const popularSearches = [
  "lewis hamilton",
  "ferrari",
  "charles leclerc",
  "mclaren",
  "mercedes",
  "hoodie",
  "red bull racing",
  "gift certificate",
  "williams",
  "caps",
];

function getSearchHref(query: string) {
  const sanitizedQuery = sanitizeSearchQuery(query);
  const smartTarget = resolveSmartSearchTarget(sanitizedQuery);

  if (smartTarget) {
    return smartTarget;
  }

  const params = new URLSearchParams();
  params.set("q", sanitizedQuery);

  return `/shop?${params.toString()}`;
}

export function HeaderSearchPanel({
  query,
  onClose,
  onSuggestionSelect,
}: {
  query: string;
  onClose: () => void;
  onSuggestionSelect: (label: string) => void;
}) {
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = useMemo(() => normalizeSearchText(deferredQuery), [deferredQuery]);
  const { bestsellers, products } = useCatalogProducts();

  const desktopSearchSuggestions = useMemo(() => {
    const suggestions = popularSearches.map((label) => ({
      label,
      href: getSearchHref(label),
    }));

    if (!normalizedQuery) {
      return suggestions;
    }

    const filteredSuggestions = suggestions.filter((item) =>
      normalizeSearchText(item.label).includes(normalizedQuery),
    );

    return filteredSuggestions.length > 0 ? filteredSuggestions : suggestions;
  }, [normalizedQuery]);

  const desktopSearchProducts = useMemo(() => {
    const sourceProducts = normalizedQuery
      ? products
          .filter((product) =>
            getProductSearchTerms(product).some((term) => term.includes(normalizedQuery)),
          )
          .sort((left, right) => right.popularity - left.popularity)
      : bestsellers;

    const visibleProducts = sourceProducts.slice(0, 6);

    if (visibleProducts.length > 0) {
      return visibleProducts;
    }

    return bestsellers.slice(0, 6);
  }, [bestsellers, normalizedQuery, products]);

  return (
    <div className="grid min-h-[28rem] grid-cols-[15rem_minmax(0,1fr)]">
      <div className="border-r border-[var(--line)] bg-[#f5f4f0] px-5 py-5">
        <p className="text-[0.82rem] font-semibold text-[#111111]">
          {normalizedQuery ? "Suggested Searches" : "Popular Searches"}
        </p>
        <div className="mt-4 space-y-2">
          {desktopSearchSuggestions.slice(0, 10).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => {
                onSuggestionSelect(item.label);
                onClose();
              }}
              className="block text-[0.95rem] leading-7 text-[#2f302d] transition hover:text-[#111111]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="text-[0.82rem] font-semibold text-[#111111]">
          {normalizedQuery ? "Matching Products" : "Trending Products"}
        </p>
        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {desktopSearchProducts.map((product) => (
            <Link
              key={product.id}
              href={getProductHref(product)}
              onClick={onClose}
              className="flex items-start gap-3 rounded-[1rem] p-2 transition hover:bg-[#f7f6f2]"
            >
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#f5f4f0] p-2">
                <ProductImage
                  src={product.image}
                  fallbackSrc={imageByType[product.type]}
                  alt={product.name}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-3 text-[0.95rem] font-semibold leading-6 text-[#111111]">
                  {getProductDisplayName(product)}
                </p>
                <p className="mt-1 text-[0.92rem] font-medium text-[#111111]">
                  {formatPrice(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
