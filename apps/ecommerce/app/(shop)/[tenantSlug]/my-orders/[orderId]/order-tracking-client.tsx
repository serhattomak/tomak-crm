"use client";

import { useCallback, useEffect, useState } from "react";
import { EcommerceClient, type OrderTrackingDto } from "@/lib/ecommerce-client";

interface OrderTrackingClientProps {
  orderId: string;
  tenantSlug: string;
}

export function OrderTrackingClient({
  orderId,
  tenantSlug,
}: OrderTrackingClientProps) {
  const [tracking, setTracking] = useState<OrderTrackingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    setError(null);
    try {
      const res = await EcommerceClient.getOrderTracking(orderId, tenantSlug);
      if (res.success && res.data) {
        setTracking(res.data);
      } else {
        setError(res.message ?? "Takip bilgisi yüklenemedi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takip yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [orderId, tenantSlug]);

  useEffect(() => {
    void fetchTracking();
    const interval = setInterval(() => {
      void fetchTracking();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <p className="rounded-xl bg-rose-50 p-4 text-rose-700 text-sm">
        {error ?? "Takip bulunamadı"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
          {tracking.orderNumber}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Durum:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {tracking.status}
          </span>{" "}
          · Kargo: {tracking.carrier ?? "—"} · Takip No:{" "}
          {tracking.trackingNumber ?? "—"}
        </p>
        {tracking.estimatedDelivery ? (
          <p className="text-xs text-zinc-500">
            Tahmini teslimat:{" "}
            {new Date(tracking.estimatedDelivery).toLocaleDateString("tr-TR")}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-400">
          GET /api/public/orders/{orderId}/tracking?tenantSlug={tenantSlug} —
          CRM shipments → tracking
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Kargo hareketleri
        </h2>
        {tracking.events.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            Henüz kargo hareketi yok.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {tracking.events.map((ev) => (
              <li className="flex gap-3" key={`${ev.timestamp}-${ev.status}`}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-600" />
                <div>
                  <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    {ev.status}
                  </p>
                  <p className="text-xs text-zinc-500">{ev.description}</p>
                  <p className="text-[11px] text-zinc-400">
                    {new Date(ev.timestamp).toLocaleString("tr-TR")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-[11px] text-zinc-400">
          30s polling fallback ile güncellenir.
        </p>
      </div>
    </div>
  );
}
