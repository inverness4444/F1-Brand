"use client";

import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { MegaMenu } from "@/components/mega-menu";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SearchField } from "@/components/ui/search-field";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useMounted } from "@/hooks/use-mounted";
import { drivers, legends, teams } from "@/lib/data/roster";
import { sanitizeSearchQuery } from "@/lib/security-utils";
import { resolveSmartSearchTarget } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const HeaderSearchPanel = dynamic(
  () => import("@/components/header-search-panel").then((module) => module.HeaderSearchPanel),
  { ssr: false },
);

const navItems = [
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
  { label: "Кошельки", href: "/shop?type=Wallet" },
  { label: "Картхолдеры", href: "/shop?type=Cardholder" },
  { label: "Брелки", href: "/shop?type=Keychain" },
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
    columns: buildMenuColumns("Аксессуары", accessoryLinks, 3),
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

const mobilePrimaryGroups = mobileGroups.filter((group) => group.title !== "АКСЕССУАРЫ");

const mobileQuickLinks = [
  { label: "Доставка и возврат", href: "/delivery" },
  { label: "Таблица размеров", href: "/about#size-guide" },
  { label: "Помощь / FAQ", href: "/faq" },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<keyof typeof megaMenus | null>(null);
  const [hoveredNavLabel, setHoveredNavLabel] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const cartItems = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.openCart);
  useBodyScrollLock(mobileOpen);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
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
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-white transition hover:bg-white/10"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-[#111111] transition hover:bg-black/5";
  const desktopIconClassName = isHeroOverlay
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-white transition hover:bg-white/10"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-[#111111] transition hover:bg-black/5";
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
                  "min-h-[2.85rem] w-[16rem] border-[#e3e2dc] pl-5 pr-2 shadow-none 2xl:w-[21rem]",
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

              {desktopSearchOpen ? (
                <div className="animate-dropdown-in absolute right-0 top-full z-50 mt-3 w-[46rem] overflow-hidden rounded-[1.45rem] border border-[var(--line)] bg-white shadow-[0_28px_80px_rgba(17,17,17,0.12)]">
                  <HeaderSearchPanel
                    query={query}
                    onClose={() => setDesktopSearchOpen(false)}
                    onSuggestionSelect={setQuery}
                  />
                </div>
              ) : null}
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

        {searchOpen ? (
          <div className="animate-dropdown-in border-t border-[var(--line)] bg-[#fbfaf6]">
              <div className="container-shell py-4">
                <SearchField
                  value={query}
                  onChange={(value) => setQuery(sanitizeSearchQuery(value))}
                  onSubmit={submitSearch}
                  placeholder="Search ..."
                  className="w-full"
                />
              </div>
          </div>
        ) : null}

        {openMenu && !desktopSearchOpen ? (
          <div className="animate-dropdown-in">
            <MegaMenu columns={megaMenus[openMenu].columns} />
          </div>
        ) : null}
      </header>

      {mobileOpen ? (
        <>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="animate-overlay-in fixed inset-0 z-50 bg-black/35"
              aria-label="Закрыть меню"
            />
            <aside
              className="animate-drawer-in fixed right-0 top-0 z-[60] flex h-[100dvh] w-full max-w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden bg-white p-4 shadow-2xl sm:p-5"
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
                className="mobile-drawer-search mt-5 min-h-[3.75rem] pl-4 pr-3 sm:min-h-[4rem] sm:pl-5"
                inputClassName="mobile-drawer-search-input text-base sm:text-base"
                iconClassName="mobile-drawer-search-icon h-10 w-10"
              />

              <div className="mt-6 flex-1 overflow-y-auto overscroll-contain pr-1">
                <div className="mobile-clean-menu space-y-3 border-t border-[var(--line)] pt-5">
                  <Link
                    href="/shop"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[#111111]"
                  >
                    Все товары
                  </Link>
                  {mobilePrimaryGroups.map((group) => (
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
                  <Link
                    href="/accessories"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[#111111]"
                  >
                    Аксессуары
                  </Link>
                </div>

                <div className="tablet-drawer-menu">
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
              </div>

              <div className="mobile-quick-links mt-5 grid gap-2 border-t border-[var(--line)] pt-5">
                <Link
                  href={currentUser ? "/account" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className="button-base button-secondary mobile-quick-link w-full"
                >
                  Аккаунт
                </Link>
                <Link
                  href="/account/favorites"
                  onClick={() => setMobileOpen(false)}
                  className="button-base button-secondary mobile-quick-link w-full"
                >
                  Избранное
                </Link>
                {mobileQuickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="button-base button-secondary mobile-quick-link w-full"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="tablet-drawer-actions mt-5 grid gap-2 border-t border-[var(--line)] pt-5">
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
            </aside>
        </>
      ) : null}
    </>
  );
}
