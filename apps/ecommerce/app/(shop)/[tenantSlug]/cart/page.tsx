import { notFound } from "next/navigation";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { CartView } from "../components/cart-view";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

interface CartPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { tenantSlug } = await params;

  if (!isValidTenantSlug(tenantSlug)) {
    notFound();
  }

  const storefront = await EcommerceClient.getStorefront(tenantSlug).catch(
    () => ({ success: false as const })
  );
  if (
    storefront.success &&
    storefront.data &&
    storefront.data.ecommerceEnabled === false
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[80rem] space-y-6">
      {/* header editorial */}
      <div className="flex flex-col gap-2">
        <h1 className="font-normal font-serif text-3xl text-store-ink tracking-tight sm:text-4xl">
          Sepet
        </h1>
        <p className="max-w-2xl text-sm text-store-muted-foreground leading-relaxed">
          Drawer ile aynı bileşen — rounded-[1rem] card bg-white
          border-store-border. Miktar değiştirme pulse, silme fade-in, Added ✓
          1sn feedback.
        </p>
        <p className="font-mono text-[11px] text-store-muted-foreground/70">
          {tenantSlug} · guest-token korunur · toplam store-primary vurgulu
        </p>
      </div>

      {/* reuse cart-view — drawer ile aynı */}
      <div className="mx-auto max-w-3xl">
        <CartView tenantSlug={tenantSlug} variant="page" />
      </div>
    </div>
  );
}
