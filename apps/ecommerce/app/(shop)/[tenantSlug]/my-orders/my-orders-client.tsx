"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EcommerceClient, type PublicOrderDto } from "@/lib/ecommerce-client";
import { createClient } from "@/lib/supabase/client";

interface MyOrdersClientProps {
  tenantSlug: string;
}

export function MyOrdersClient({ tenantSlug }: MyOrdersClientProps) {
  const [orders, setOrders] = useState<PublicOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      // auth_user_id → customerId mapping is done server-side via token; guest sees empty
      const res = await EcommerceClient.getMyOrders(tenantSlug, token ?? undefined);
      if (res.success && res.data) {
        const data: unknown = res.data;
        const list = Array.isArray(data)
          ? (data as PublicOrderDto[])
          : ((data as { items?: PublicOrderDto[] })?.items ?? []);
        setOrders(list);
      } else if (res.errorCode === "HTTP_401" || res.errorCode === "HTTP_403") {
        setError(`Giriş yapmanız gerekiyor — auth_user_id → customerId eşleşmesi için oturum açın. [Giriş: /${tenantSlug}/auth/login]`);
      } else {
        setError(res.message ?? "Siparişler yüklenemedi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Siparişler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void fetchOrders();
    // 30s polling fallback (Q13) when Realtime unavailable — also sync with lib/realtime.ts
    const interval = setInterval(() => {
      void fetchOrders();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Siparişlerim</h2>
        <span className="text-xs text-zinc-500">{orders.length} sipariş · 30s polling fallback</span>
      </div>

      {error ? (
        <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <p>{error}</p>
          {(error.includes("Giriş") || error.includes("HTTP_401")) && (
            <Link
              className="mt-2 inline-flex rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white"
              href={`/${tenantSlug}/auth/login`}
            >
              Giriş Yap →
            </Link>
          )}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Henüz siparişiniz yok</p>
          <p className="mt-1 text-xs text-zinc-500">
            Siparişler <code>GET /api/public/orders/mine?tenantSlug={tenantSlug}</code> ile CRM&apos;den gelir.
          </p>
          <Link
            className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
            href={`/${tenantSlug}/shop`}
          >
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
              href={`/${tenantSlug}/my-orders/${order.id}`}
              key={order.id}
            >
              <div>
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{order.orderNumber}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(order.createdAt).toLocaleDateString("tr-TR")} · {order.status} · {order.paymentStatus}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ₺{order.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {order.currency}
                </p>
                <span className="text-xs text-violet-600">Takip →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-[11px] text-zinc-400">
        Realtime <code>postgres_changes</code> + 30s polling fallback ile canlı güncellenir (lib/realtime.ts).
      </p>
    </div>
  );
}
