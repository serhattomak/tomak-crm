"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { getGuestToken } from "@/lib/guest-token";

export function CartBadge({ tenantSlug }: { tenantSlug: string }) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      if (typeof window === "undefined") {
        return;
      }
      const guestToken = getGuestToken() ?? undefined;
      // No token yet → count 0, avoid unauth call noise
      if (!guestToken) {
        if (!cancelled) {
          setCount(0);
        }
        return;
      }
      setLoading(true);
      try {
        const res = await EcommerceClient.getCart(tenantSlug, guestToken);
        if (!cancelled && res.success && res.data) {
          const total = res.data.items.reduce(
            (acc, item) => acc + item.quantity,
            0
          );
          setCount(total);
        } else if (!cancelled && res.errorCode === "HTTP_404") {
          setCount(0);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchCount();

    function onStorage() {
      void fetchCount();
    }

    function onCartUpdated() {
      void fetchCount();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("cart-updated", onCartUpdated as EventListener);
    // Poll lightly every 30s as fallback when cart changes from other tab
    const interval = window.setInterval(() => void fetchCount(), 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "cart-updated",
        onCartUpdated as EventListener
      );
      window.clearInterval(interval);
    };
  }, [tenantSlug]);

  const showBadge = count > 0;
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <Link
      aria-label={showBadge ? `Sepet, ${count} ürün` : "Sepet"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-store-border bg-white text-store-ink transition-colors hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
      href={`/${tenantSlug}/cart`}
    >
      <ShoppingBag aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
      {showBadge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex min-h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-store-primary px-1 font-bold text-[10px] text-store-primary-foreground leading-none shadow-store-sm"
        >
          {loading ? "…" : displayCount}
        </span>
      ) : null}
    </Link>
  );
}
