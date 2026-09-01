import { Search, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { CartDrawer } from "./components/cart-drawer";
import { ThemeToggle } from "./components/theme-toggle";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

export default async function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  // Tenant theme — storefront StorefrontDto.storeTheme + logoUrl (data-store-theme=mercan, light only)
  const storefront = await EcommerceClient.getStorefront(tenantSlug).catch(
    () => ({ success: false as const })
  );
  const rawTheme =
    storefront.success && storefront.data?.storeTheme
      ? storefront.data.storeTheme
      : "mercan";
  const isColorValue =
    rawTheme.startsWith("oklch") ||
    rawTheme.startsWith("#") ||
    rawTheme.startsWith("rgb") ||
    rawTheme.startsWith("hsl");
  const dataStoreTheme = isColorValue ? "custom" : "mercan";
  const storeThemeStyle: CSSProperties = isColorValue
    ? ({ "--store-primary": rawTheme } as CSSProperties)
    : ({ "--store-primary": "oklch(0.64 0.18 35)" } as CSSProperties);

  const logoUrl =
    storefront.success &&
    storefront.data &&
    typeof (storefront.data as { logoUrl?: unknown }).logoUrl === "string"
      ? ((storefront.data as { logoUrl?: string }).logoUrl as string)
      : null;

  return (
    <div
      className="flex min-h-screen flex-col bg-store-surface font-sans antialiased"
      data-store-theme={dataStoreTheme}
      style={storeThemeStyle}
    >
      <header className="sticky top-0 z-30 border-store-border border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[80rem] items-center justify-between gap-4 px-4">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-3">
            <Link
              className="flex items-center gap-2 font-bold text-sm text-store-ink"
              href={`/${tenantSlug}/shop`}
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-store-primary text-store-primary-foreground">
                {logoUrl ? (
                  <Image
                    alt={`${tenantSlug} logo`}
                    height={32}
                    src={logoUrl}
                    width={32}
                  />
                ) : (
                  <ShoppingBag
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={1.5}
                  />
                )}
              </span>
              <span>{tenantSlug}</span>
              <span className="hidden font-normal text-store-muted-foreground text-xs sm:inline">
                · Store
              </span>
            </Link>

            <nav
              aria-label="Mağaza gezinme"
              className="hidden items-center gap-1 text-xs sm:flex"
            >
              <Link
                className="rounded-lg px-3 py-1.5 font-medium text-store-muted-foreground hover:bg-store-muted hover:text-store-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={`/${tenantSlug}/shop`}
              >
                Mağaza
              </Link>
              <Link
                className="rounded-full border border-store-border bg-white px-3 py-1.5 font-medium text-store-ink hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={`/${tenantSlug}/shop#categories`}
              >
                Kategoriler
              </Link>
              <Link
                className="rounded-lg px-3 py-1.5 font-medium text-store-muted-foreground hover:bg-store-muted hover:text-store-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={`/${tenantSlug}/my-orders/support`}
              >
                Hakkında
              </Link>
            </nav>
          </div>

          {/* Center: search rounded-full geniş arama */}
          <form
            action={`/${tenantSlug}/shop`}
            aria-label="Mağazada ara"
            className="hidden max-w-xl flex-1 items-center md:flex"
            method="get"
            role="search"
          >
            <label className="sr-only" htmlFor="header-search">
              Ürün ara
            </label>
            <span className="relative flex w-full items-center">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 h-4 w-4 text-store-muted-foreground"
                strokeWidth={1.5}
              />
              <input
                autoComplete="off"
                className="w-full rounded-full border border-store-border bg-white py-2 pr-4 pl-9 text-store-ink text-xs placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                id="header-search"
                name="search"
                placeholder="Ürün ara…"
                type="search"
              />
            </span>
          </form>

          {/* Right: sepet drawer (header ikon → sağ drawer slide-in backdrop-blur) + Hesabım + tema toggle */}
          <div className="flex items-center gap-1.5">
            <CartDrawer tenantSlug={tenantSlug} />
            <Link
              className="hidden rounded-full bg-store-primary px-3 py-1.5 font-semibold text-store-primary-foreground text-xs hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring sm:inline-flex"
              href={`/${tenantSlug}/my-orders`}
            >
              Hesabım
            </Link>
            <Link
              aria-label="Hesabım"
              className="inline-flex rounded-full bg-store-primary px-3 py-1.5 font-semibold text-store-primary-foreground text-xs hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring sm:hidden"
              href={`/${tenantSlug}/my-orders`}
            >
              Hesap
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile search */}
        <div className="mx-auto max-w-[80rem] px-4 pb-3 md:hidden">
          <form
            action={`/${tenantSlug}/shop`}
            aria-label="Mağazada ara"
            method="get"
            role="search"
          >
            <label className="sr-only" htmlFor="header-search-mobile">
              Ürün ara
            </label>
            <span className="relative flex w-full items-center">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 h-4 w-4 text-store-muted-foreground"
                strokeWidth={1.5}
              />
              <input
                autoComplete="off"
                className="w-full rounded-full border border-store-border bg-white py-2 pr-4 pl-9 text-store-ink text-xs placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                id="header-search-mobile"
                name="search"
                placeholder="Ürün ara…"
                type="search"
              />
            </span>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="border-store-border border-t bg-white px-4 py-6 text-center text-[11px] text-store-muted-foreground">
        <p>
          Powered by CRM · <span className="font-medium">{tenantSlug}</span>{" "}
          storefront · Public API only (anon + X-Tenant-Slug)
        </p>
      </footer>
    </div>
  );
}
