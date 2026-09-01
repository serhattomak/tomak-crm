"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EcommerceClient } from "@/lib/ecommerce-client";
import { getGuestToken } from "@/lib/guest-token";
import { CartView } from "./cart-view";

export interface CartDrawerProps {
  tenantSlug: string;
}

export function CartDrawer({ tenantSlug }: CartDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchCount = React.useCallback(async () => {
    const guestToken = getGuestToken() ?? undefined;
    if (!guestToken) {
      setCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await EcommerceClient.getCart(tenantSlug, guestToken);
      if (res.success && res.data) {
        const total = res.data.items.reduce(
          (acc, item) => acc + item.quantity,
          0
        );
        setCount(total);
      } else if (res.errorCode === "HTTP_404") {
        setCount(0);
      }
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => {
    fetchCount().catch(() => {});
    function onUpdated() {
      fetchCount().catch(() => {});
    }
    function onStorage() {
      fetchCount().catch(() => {});
    }
    window.addEventListener("cart-updated", onUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(() => {
      fetchCount().catch(() => {});
    }, 30_000);
    return () => {
      window.removeEventListener("cart-updated", onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [fetchCount]);

  // lock scroll when open + Esc close + focus trap minimal
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const showBadge = count > 0;
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <>
      {/* Trigger — header sepet ikon click → sağ drawer */}
      <button
        aria-label={
          showBadge ? `Sepet, ${count} ürün — drawer aç` : "Sepet — drawer aç"
        }
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-store-border bg-white text-store-ink transition-all duration-200 hover:bg-store-muted hover:shadow-store-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
        onClick={() => setOpen(true)}
        type="button"
      >
        <ShoppingBag aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
        {showBadge ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex min-h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-store-primary px-1 font-bold text-[10px] text-store-primary-foreground leading-none shadow-store-sm transition-all duration-200"
          >
            {loading ? "·" : displayCount}
          </span>
        ) : null}
      </button>

      {/* Overlay + Drawer — Sheet slide-in backdrop-blur */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 flex justify-end transition-all duration-200 ${open ? "visible" : "invisible"}`}
      >
        {/* backdrop blur overlay */}
        <button
          aria-label="Sepet drawer kapat"
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-all duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          type="button"
        />

        {/* panel slide-in right */}
        <div
          aria-label="Sepet"
          aria-modal="true"
          className={`relative flex h-full w-full max-w-md flex-col border-store-border border-l bg-store-surface shadow-store-xl transition-all duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"} motion-reduce:transition-none`}
          role="dialog"
        >
          {/* header */}
          <div className="flex items-center justify-between border-store-border border-b bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-store-primary text-store-primary-foreground">
                <ShoppingBag
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={1.5}
                />
              </span>
              <div className="flex flex-col">
                <h2 className="font-serif text-base text-store-ink leading-none">
                  Sepet
                </h2>
                <span className="font-mono text-[11px] text-store-muted-foreground">
                  {count} ürün · {tenantSlug}
                </span>
              </div>
            </div>
            <button
              aria-label="Kapat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-store-border bg-white text-store-ink transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* content — aynı view cart/page ile paylaşılan cart-items list */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <CartView
              onCheckout={() => setOpen(false)}
              tenantSlug={tenantSlug}
              variant="drawer"
            />
          </div>

          {/* footer quick links — page'e de erişim */}
          <div className="border-store-border border-t bg-white px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <Link
                className="font-medium text-store-muted-foreground underline-offset-4 hover:text-store-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={`/${tenantSlug}/shop`}
                onClick={() => setOpen(false)}
              >
                Mağazaya dön
              </Link>
              <Link
                className="inline-flex items-center rounded-full bg-store-primary px-3 py-1.5 font-semibold text-store-primary-foreground text-xs transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={`/${tenantSlug}/cart`}
                onClick={() => setOpen(false)}
              >
                Sepet sayfasına git
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CartDrawer;
