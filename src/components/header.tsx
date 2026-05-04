"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { MegaMenu } from "@/components/mega-menu";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SearchField } from "@/components/ui/search-field";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useMounted } from "@/hooks/use-mounted";
import { drivers, legends, teams } from "@/lib/data/roster";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import { getProductDisplayName } from "@/lib/storefront-text";
import { getProductSearchTerms, normalizeSearchText, resolveSmartSearchTarget } from "@/lib/search-utils";
import { cn, formatPrice, getProductHref } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const navItems = [
  { label: "НОВИНКИ", href: "/new" },
  { label: "КОМАНДЫ", href: "/teams" },
  { label: "ПИЛОТЫ", href: "/pilots" },
  { label: "ЛЕГЕНДЫ", href: "/legends" },
  { label: "АКСЕССУАРЫ", href: "/accessories" },
] as const;

type MegaMenuLink = {
  label: string;
  href: string;
};

type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

function chunkLinks(links: MegaMenuLink[], columnCount: number) {
  const chunkSize = Math.ceil(links.length / columnCount);

  return Array.from({ length: columnCount }, (_, index) =>
    links.slice(index * chunkSize, (index + 1) * chunkSize),
  ).filter((chunk) => chunk.length > 0);
}

function buildMenuColumns(title: string, links: MegaMenuLink[], columnCount: number): MegaMenuColumn[] {
  return chunkLinks(links, columnCount).map((chunk) => ({
    title,
    links: chunk,
  }));
}

const teamLinks: MegaMenuLink[] = [
  ...teams.map((team) => ({
    label: team.name,
    href: `/teams/${team.slug}`,
  })),
  { label: "Смотреть всё", href: "/teams" },
];

const pilotLinks: MegaMenuLink[] = [
  ...drivers.map((driver) => ({
    label: driver.name,
    href: `/pilots/${driver.slug}`,
  })),
  { label: "Смотреть всё", href: "/pilots" },
];

const legendLinks: MegaMenuLink[] = [
  ...legends.map((legend) => ({
    label: legend.name,
    href: `/legends/${legend.slug}`,
  })),
  { label: "Смотреть всё", href: "/legends" },
];

const accessoryLinks: MegaMenuLink[] = [
  { label: "Кепки", href: "/shop?type=Cap" },
  { label: "Шарфы", href: "/shop?type=Scarf" },
  { label: "Лего", href: "/shop?type=Lego" },
  { label: "Funko Pop", href: "/shop?q=funko%20pop" },
  { label: "Аксессуары", href: "/shop?type=Accessory" },
  { label: "Постеры", href: "/shop?type=Poster" },
  { label: "Календари", href: "/shop?type=Calendar" },
  { label: "Подарочные сертификаты", href: "/gift-cards" },
  { label: "Смотреть всё", href: "/accessories" },
];

const megaMenus = {
  "КОМАНДЫ": {
    columns: buildMenuColumns("Команды", teamLinks, 2),
  },
  "ПИЛОТЫ": {
    columns: buildMenuColumns("Пилоты", pilotLinks, 3),
  },
  "ЛЕГЕНДЫ": {
    columns: buildMenuColumns("Легенды", legendLinks, 3),
  },
  "АКСЕССУАРЫ": {
    columns: buildMenuColumns("Аксессуары", accessoryLinks, 1),
  },
} as const;

const mobileGroups = [
  {
    title: "КОМАНДЫ",
    links: megaMenus["КОМАНДЫ"].columns.flatMap((column) => column.links),
  },
  {
    title: "ПИЛОТЫ",
    links: megaMenus["ПИЛОТЫ"].columns.flatMap((column) => column.links),
  },
  {
    title: "ЛЕГЕНДЫ",
    links: megaMenus["ЛЕГЕНДЫ"].columns.flatMap((column) => column.links),
  },
  {
    title: "АКСЕССУАРЫ",
    links: megaMenus["АКСЕССУАРЫ"].columns.flatMap((column) => column.links),
  },
];

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

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const { products, bestsellers } = useCatalogProducts();
  const [query, setQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<keyof typeof megaMenus | null>(null);
  const [hoveredNavLabel, setHoveredNavLabel] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { items, openCart } = useCartStore();
  useBodyScrollLock(mobileOpen);

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  useEffect(() => {
    const updateScrolled = () => {
      setIsScrolled(window.scrollY > 24);
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrolled);
    };
  }, []);

  useEffect(() => {
    if (!desktopSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!desktopSearchRef.current?.contains(event.target as Node)) {
        setDesktopSearchOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [desktopSearchOpen]);

  useEffect(() => {
    setDesktopSearchOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
    setMobileGroup(null);
  }, [pathname]);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
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

  const isLightTopBar = pathname === "/" && !isScrolled;
  const isHeroOverlay =
    pathname === "/" && !isScrolled && !searchOpen && !desktopSearchOpen && !mobileOpen && !openMenu;
  const shouldUseDarkHeroNav =
    isLightTopBar && (hoveredNavLabel !== null || openMenu !== null || desktopSearchOpen);
  const isTransparentDesktopSearch = isHeroOverlay && !desktopSearchOpen;
  const brandTitleClassName = isHeroOverlay ? "text-white" : undefined;
  const brandMarkClassName = isHeroOverlay ? "brightness-0 invert" : undefined;
  const navItemClassName = isLightTopBar
    ? "text-[0.8rem] font-bold tracking-[0.16em] transition"
    : "text-[0.8rem] font-bold tracking-[0.16em] text-[#3f413f] transition hover:text-[#111111]";
  const accountFavoriteClassName = isHeroOverlay
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/28 bg-white/8 text-white transition hover:border-white/60 hover:bg-white/14"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111] transition hover:border-[#111111]";
  const desktopIconClassName = isHeroOverlay
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/28 bg-white/8 text-white transition hover:border-white/60 hover:bg-white/14"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111] transition hover:border-[#111111]";
  const mobileIconClassName = isHeroOverlay
    ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/28 bg-white/8 text-white"
    : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#111111]";
  const desktopActionIconClassName = isHeroOverlay ? "text-white" : "text-[#111111]";
  const mobileActionIconClassName = isHeroOverlay ? "text-white" : "text-[#111111]";
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = sanitizeSearchQuery(query);

    if (!trimmedQuery) {
      router.push("/shop");
      setDesktopSearchOpen(false);
      setSearchOpen(false);
      setMobileOpen(false);
      return;
    }

    const smartTarget = resolveSmartSearchTarget(trimmedQuery);

    if (smartTarget) {
      router.push(smartTarget);
      setDesktopSearchOpen(false);
      setSearchOpen(false);
      setMobileOpen(false);
      return;
    }

    const params = new URLSearchParams();

    params.set("q", trimmedQuery);

    router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
    setDesktopSearchOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-colors duration-300",
          isHeroOverlay
            ? "border-b border-transparent bg-transparent"
            : "border-b border-[var(--line)] bg-white",
        )}
        onMouseLeave={() => {
          setOpenMenu(null);
          setHoveredNavLabel(null);
        }}
      >
        <div className="container-shell flex min-h-[74px] items-center justify-between gap-2 sm:gap-4">
          <BrandLogo
            showTagline={false}
            className="min-w-0"
            markClassName={brandMarkClassName}
            titleClassName={brandTitleClassName}
          />

          <nav className="hidden items-center gap-7 xl:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const hasMega = item.label in megaMenus;

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    setHoveredNavLabel(item.label);
                    setOpenMenu(hasMega ? (item.label as keyof typeof megaMenus) : null);
                  }}
                  onMouseLeave={() => {
                    if (!hasMega) {
                      setHoveredNavLabel((current) => (current === item.label ? null : current));
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    style={isLightTopBar ? { color: shouldUseDarkHeroNav ? "#111111" : "#ffffff" } : undefined}
                    className={cn(
                      navItemClassName,
                      active && (isLightTopBar ? "text-white" : "text-[#111111]"),
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <div ref={desktopSearchRef} className="relative">
              <SearchField
                value={query}
                onChange={(value) => setQuery(sanitizeSearchQuery(value))}
                onSubmit={submitSearch}
                onFocus={() => {
                  setDesktopSearchOpen(true);
                  setOpenMenu(null);
                  setHoveredNavLabel(null);
                }}
                placeholder="Search ..."
                className={cn(
                  "min-h-[2.85rem] w-[12.5rem] border-[#e3e2dc] pl-4 pr-2 shadow-none",
                  isTransparentDesktopSearch
                    ? "border-white/28 bg-transparent"
                    : isHeroOverlay
                      ? "border-white/40 bg-white/94"
                      : "bg-white",
                )}
                inputClassName={cn(
                  "text-[0.92rem] font-medium sm:text-[0.92rem]",
                  isTransparentDesktopSearch
                    ? "text-white placeholder:text-white/70"
                    : "text-[#111111] placeholder:text-[#9d9d98]",
                )}
                iconClassName={cn(
                  "h-8 w-8 border-0 hover:bg-transparent",
                  isTransparentDesktopSearch ? "text-white hover:text-white" : "text-[#111111] hover:text-[#111111]",
                )}
              />

              <AnimatePresence>
                {desktopSearchOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full z-50 mt-3 w-[46rem] overflow-hidden rounded-[1.45rem] border border-[var(--line)] bg-white shadow-[0_28px_80px_rgba(17,17,17,0.12)]"
                  >
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
                                setQuery(item.label);
                                setDesktopSearchOpen(false);
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
                              onClick={() => setDesktopSearchOpen(false)}
                              className="flex items-start gap-3 rounded-[1rem] p-2 transition hover:bg-[#f7f6f2]"
                            >
                              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#f5f4f0] p-2">
                                <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
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
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <Link
              href={currentUser ? "/account" : "/login"}
              className={accountFavoriteClassName}
              aria-label="Аккаунт"
            >
              <User className={cn("size-4.5", desktopActionIconClassName)} />
            </Link>
            <Link
              href="/account/favorites"
              className={accountFavoriteClassName}
              aria-label="Избранное"
            >
              <Heart className={cn("size-4.5", desktopActionIconClassName)} />
            </Link>
            <button
              type="button"
              onClick={openCart}
              className={cn("relative", desktopIconClassName)}
              aria-label="Корзина"
            >
              <ShoppingBag className={cn("size-4.5", desktopActionIconClassName)} />
              {mounted && cartCount > 0 ? (
                <span className={cn(
                  "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold",
                  isHeroOverlay ? "bg-white text-[#111111]" : "bg-[#111111] text-white",
                )}>
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 xl:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen((current) => !current)}
              className={mobileIconClassName}
              aria-label={searchOpen ? "Закрыть поиск" : "Открыть поиск"}
            >
              <Search className={cn("size-4.5", mobileActionIconClassName)} />
            </button>
            <button
              type="button"
              onClick={openCart}
              className={cn("relative", mobileIconClassName)}
              aria-label="Корзина"
            >
              <ShoppingBag className={cn("size-4.5", mobileActionIconClassName)} />
              {mounted && cartCount > 0 ? (
                <span className={cn(
                  "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold",
                  isHeroOverlay ? "bg-white text-[#111111]" : "bg-[#111111] text-white",
                )}>
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMobileOpen(true);
              }}
              className={mobileIconClassName}
              aria-label="Открыть меню"
            >
              <Menu className={cn("size-4.5", mobileActionIconClassName)} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border-t border-[var(--line)] bg-[#fbfaf6]"
            >
              <div className="container-shell py-4">
                <SearchField
                  value={query}
                  onChange={(value) => setQuery(sanitizeSearchQuery(value))}
                  onSubmit={submitSearch}
                  placeholder="Search ..."
                  className="w-full"
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {openMenu && !desktopSearchOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <MegaMenu columns={megaMenus[openMenu].columns} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/35"
              aria-label="Закрыть меню"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-[60] flex h-[100dvh] w-full max-w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden bg-white p-4 shadow-2xl sm:p-5"
            >
              <div className="flex items-center justify-between">
                <BrandLogo showTagline={false} className="min-w-0" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[#111111]"
                  aria-label="Закрыть меню"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <SearchField
                value={query}
                onChange={(value) => setQuery(sanitizeSearchQuery(value))}
                onSubmit={submitSearch}
                placeholder="Search ..."
                className="mt-5 min-h-[3.75rem] pl-4 pr-3 sm:min-h-[4rem] sm:pl-5"
                inputClassName="text-base sm:text-base"
                iconClassName="h-10 w-10"
              />

              <div className="mt-6 flex-1 overflow-y-auto overscroll-contain pr-1">
                <div className="space-y-2 border-t border-[var(--line)] pt-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-2xl px-1 py-2.5 text-[0.82rem] font-bold tracking-[0.16em] text-[#111111]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-5">
                  {mobileGroups.map((group) => (
                    <div key={group.title} className="rounded-[1.2rem] border border-[var(--line)]">
                      <button
                        type="button"
                        onClick={() =>
                          setMobileGroup((current) => (current === group.title ? null : group.title))
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#111111]"
                      >
                        <span>{group.title}</span>
                        <span>{mobileGroup === group.title ? "−" : "+"}</span>
                      </button>
                      {mobileGroup === group.title ? (
                        <div className="space-y-3 border-t border-[var(--line)] px-4 py-4 text-sm text-[#5f615f]">
                          {group.links.map((link) => (
                            <Link
                              key={link.label}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="block break-words"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-2 border-t border-[var(--line)] pt-5">
                <Link
                  href={currentUser ? "/account" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className="button-base button-secondary w-full"
                >
                  Аккаунт
                </Link>
                <Link
                  href="/account/favorites"
                  onClick={() => setMobileOpen(false)}
                  className="button-base button-secondary w-full"
                >
                  Избранное
                </Link>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
