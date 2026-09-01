import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderTrackingClient } from "./order-tracking-client";

interface OrderTrackingPageProps {
  params: Promise<{ tenantSlug: string; orderId: string }>;
}

export async function generateMetadata({
  params,
}: OrderTrackingPageProps): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Sipariş ${orderId} — Takip` };
}

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidTenantSlug(slug: string): boolean {
  return (
    TENANT_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 64
  );
}

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const { tenantSlug, orderId } = await params;

  if (!(isValidTenantSlug(tenantSlug) && orderId)) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-xs text-zinc-500 hover:text-zinc-900"
        href={`/${tenantSlug}/my-orders`}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Siparişlerime dön
      </Link>
      <OrderTrackingClient orderId={orderId} tenantSlug={tenantSlug} />
    </div>
  );
}
