interface ReturnsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ReturnsPage({ params }: ReturnsPageProps) {
  const { tenantSlug } = await params;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          İadeler
        </h2>
        <p className="text-xs text-zinc-500">
          Placeholder — Faz2&apos;de iade workflow eklenecek.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-300 border-dashed bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          İade talebi yakında
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Mevcut siparişleriniz için iade talebi oluşturma Faz2&apos;de aktif
          olacak. Şimdilik{" "}
          <a
            className="font-medium text-violet-600 underline"
            href={`/${tenantSlug}/my-orders/support`}
          >
            Destek
          </a>{" "}
          üzerinden bize ulaşabilirsiniz.
        </p>
        <p className="mt-3 text-[11px] text-zinc-400">
          Hesabım 4 sayfa: my-orders / addresses / support / returns —
          tenantSlug: {tenantSlug}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300">Not</p>
        <p className="mt-1 leading-relaxed">
          İadeler CRM tarafında <code>orders.status=Refunded</code> ve{" "}
          <code>shipments</code> takibi ile yönetilecek. Bu sayfa placeholder
          olarak bırakıldı; API hazır olduğunda{" "}
          <code>GET /api/public/orders/mine</code> +{" "}
          <code>POST /api/public/returns</code> ile doldurulacak.
        </p>
      </div>
    </div>
  );
}
