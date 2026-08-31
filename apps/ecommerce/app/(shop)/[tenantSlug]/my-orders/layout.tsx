import Link from "next/link";
import type { ReactNode } from "react";

interface MyOrdersLayoutProps {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

const tabs = [
  { href: "my-orders", label: "Siparişlerim" },
  { href: "my-orders/addresses", label: "Adreslerim" },
  { href: "my-orders/support", label: "Destek" },
  { href: "my-orders/returns", label: "İadeler" },
] as const;

export default async function MyOrdersLayout({ children, params }: MyOrdersLayoutProps) {
  const { tenantSlug } = await params;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Hesabım</h1>
        <p className="mt-1 text-xs text-zinc-500">4 sayfa — auth_user_id → customerId mapping ile CRM&apos;den gelir.</p>
        <nav className="mt-3 flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <Link
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
              href={`/${tenantSlug}/${tab.href}`}
              key={tab.href}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
