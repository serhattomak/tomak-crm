import type { Metadata } from "next";
import { CartView } from "./cart-view";

interface CartPageProps {
  params: Promise<{ tenantSlug: string }>;
}

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64;
}

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  return { title: `Sepet — ${tenantSlug}` };
}

export default async function CartPage({ params }: CartPageProps) {
  const { tenantSlug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Geçersiz mağaza kodu.
      </div>
    );
  }

  return <CartView tenantSlug={tenantSlug} />;
}
