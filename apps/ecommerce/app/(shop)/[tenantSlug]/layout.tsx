import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans antialiased dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-zinc-200/80 border-b bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100"
            href={`/${tenantSlug}/shop`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span>{tenantSlug}</span>
            <span className="hidden font-normal text-xs text-zinc-400 sm:inline">
              · Store
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-xs">
            <Link
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              href={`/${tenantSlug}/shop`}
            >
              Mağaza
            </Link>
            <Link
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              href={`/${tenantSlug}/cart`}
            >
              Sepet
            </Link>
            <Link
              className="rounded-lg bg-zinc-900 px-3 py-1.5 font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              href={`/${tenantSlug}/my-orders`}
            >
              Hesabım
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="border-zinc-200/80 border-t bg-white px-4 py-6 text-center text-[11px] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
        <p>
          Powered by CRM · <span className="font-medium">{tenantSlug}</span>{" "}
          storefront · Public API only (anon + X-Tenant-Slug)
        </p>
      </footer>
    </div>
  );
}
