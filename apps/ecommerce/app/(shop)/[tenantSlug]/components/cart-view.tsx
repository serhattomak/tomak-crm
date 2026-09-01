"use client";

import { Price } from "@workspace/ui/components/price";
import { QuantityStepper } from "@workspace/ui/components/quantity-stepper";
import { Check, ImageOff, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { type CartDto, EcommerceClient } from "@/lib/ecommerce-client";
import { getGuestToken } from "@/lib/guest-token";
import { EmptyIllustration } from "./empty-illustration";

export type CartViewVariant = "drawer" | "page";

export interface CartViewProps {
  className?: string;
  onCheckout?: () => void;
  tenantSlug: string;
  variant?: CartViewVariant;
}

function dispatchCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart-updated"));
  }
}

function getProductHref(tenantSlug: string, slug?: string) {
  if (!slug) {
    return `/${tenantSlug}/shop`;
  }
  return `/${tenantSlug}/product/${slug}`;
}

export function CartView({
  className,
  onCheckout,
  tenantSlug,
  variant = "page",
}: CartViewProps) {
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [pulseId, setPulseId] = React.useState<string | null>(null);
  const [justAddedId, setJustAddedId] = React.useState<string | null>(null);
  const [justRemovedIds, setJustRemovedIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const fetchCart = React.useCallback(async () => {
    const guestToken = getGuestToken() ?? undefined;
    if (!guestToken) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await EcommerceClient.getCart(tenantSlug, guestToken);
      if (res.success && res.data) {
        setCart(res.data);
      } else if (res.errorCode === "HTTP_404") {
        setCart(null);
      } else {
        setError(res.message ?? "Sepet yüklenemedi");
        setCart(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sepet yüklenemedi");
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => {
    fetchCart().catch(() => {});
    const onUpdated = () => {
      fetchCart().catch(() => {});
    };
    const onStorage = () => {
      fetchCart().catch(() => {});
    };
    if (typeof window !== "undefined") {
      window.addEventListener("cart-updated", onUpdated as EventListener);
      window.addEventListener("storage", onStorage);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cart-updated", onUpdated as EventListener);
        window.removeEventListener("storage", onStorage);
      }
    };
  }, [fetchCart]);

  const handleQuantity = async (itemId: string, nextQuantity: number) => {
    const guestToken = getGuestToken() ?? undefined;
    if (nextQuantity < 1) {
      return handleRemove(itemId);
    }
    setUpdatingId(itemId);
    setPulseId(itemId);
    try {
      const res = await EcommerceClient.updateCartItem(
        itemId,
        { quantity: nextQuantity },
        tenantSlug,
        guestToken
      );
      if (res.success && res.data) {
        setCart(res.data);
        dispatchCartUpdated();
        setJustAddedId(itemId);
        setTimeout(() => setJustAddedId(null), 1000);
      } else {
        setError(res.message ?? "Miktar güncellenemedi");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Miktar güncellenemedi");
    } finally {
      setUpdatingId(null);
      setTimeout(() => setPulseId(null), 300);
    }
  };

  const handleRemove = async (itemId: string) => {
    const guestToken = getGuestToken() ?? undefined;
    setRemovingId(itemId);
    try {
      const res = await EcommerceClient.removeCartItem(
        itemId,
        tenantSlug,
        guestToken
      );
      if (res.success) {
        // fade-out animation before state update
        setJustRemovedIds((prev) => new Set(prev).add(itemId));
        setTimeout(() => {
          if (res.data) {
            setCart(res.data);
          } else {
            fetchCart().catch(() => {});
          }
          dispatchCartUpdated();
          setJustRemovedIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, 200);
      } else {
        setError(res.message ?? "Ürün sepetten silinemedi");
        setRemovingId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ürün sepetten silinemedi");
      setRemovingId(null);
    } finally {
      // keep removing state briefly for animation
      setTimeout(() => setRemovingId(null), 220);
    }
  };

  const isEmpty = !cart || cart.items.length === 0;

  const subtotal = cart?.subtotal ?? cart?.totalAmount ?? 0;
  const totalAmount = cart?.totalAmount ?? subtotal;
  const currency = cart?.currency ?? "TRY";
  const count = cart?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  if (loading) {
    return (
      <div
        aria-busy="true"
        className={`flex flex-col gap-3 ${className ?? ""}`}
        role="status"
      >
        <div className="flex items-center gap-2 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm">
          <Loader2
            aria-hidden="true"
            className="h-4 w-4 animate-spin text-store-muted-foreground"
            strokeWidth={1.5}
          />
          <span className="text-sm text-store-muted-foreground">
            Sepet yükleniyor…
          </span>
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              className="h-24 animate-pulse rounded-[1rem] border border-store-border bg-white shadow-store-sm"
              key={i}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={className}>
        {error ? (
          <p
            className="mb-3 rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <EmptyIllustration tenantSlug={tenantSlug} variant="cart" />
        {variant === "drawer" ? (
          <p className="mt-3 text-center font-mono text-[11px] text-store-muted-foreground">
            {count} ürün · {tenantSlug}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {error ? (
        <div
          className="flex items-center justify-between gap-2 rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-xs"
          role="alert"
        >
          <span>{error}</span>
          <button
            aria-label="Hata mesajını kapat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-700 transition-all duration-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            onClick={() => setError(null)}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      ) : null}

      {/* Items list — rounded-[1rem] card bg-white border-store-border */}
      <div className="flex flex-col gap-3">
        {cart.items.map((item) => {
          const isUpdating = updatingId === item.id;
          const isRemoving = removingId === item.id;
          const isPulsing = pulseId === item.id;
          const isJustAdded = justAddedId === item.id;
          const isFading = justRemovedIds.has(item.id);
          return (
            <div
              className={`group flex gap-3 rounded-[1rem] border bg-white p-3 shadow-store-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-store-ring hover:shadow-store ${
                isFading
                  ? "fade-out animate-out opacity-0 duration-200"
                  : "fade-in slide-in-from-right-2 animate-in duration-200"
              } ${isRemoving ? "opacity-60" : ""} border-store-border`}
              key={item.id}
              style={{
                opacity: isFading ? 0 : undefined,
                transform: isFading ? "translateX(8px)" : undefined,
              }}
            >
              {/* thumb aspect-square */}
              <Link
                aria-label={`${item.productName} ürün detayına git`}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.75rem] border border-store-border bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={getProductHref(tenantSlug, item.slug)}
                onClick={onCheckout}
              >
                {item.imageUrl ? (
                  <Image
                    alt={item.productName}
                    className="object-cover"
                    fill
                    sizes="80px"
                    src={item.imageUrl}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-store-muted text-store-muted-foreground">
                    <ImageOff
                      aria-hidden="true"
                      className="h-5 w-5"
                      strokeWidth={1.5}
                    />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Link
                  className="line-clamp-2 font-semibold text-sm text-store-ink transition-colors hover:text-store-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  href={getProductHref(tenantSlug, item.slug)}
                  onClick={onCheckout}
                >
                  {item.productName}
                </Link>
                <div className="flex items-center gap-2">
                  <Price currency={currency} price={item.unitPrice} size="sm" />
                  <span className="font-mono text-[11px] text-store-muted-foreground">
                    × {item.quantity}
                  </span>
                  {isJustAdded ? (
                    <span className="fade-in slide-in-from-top-1 inline-flex animate-in items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-[11px] text-emerald-700 ring-1 ring-emerald-200 transition-all duration-200">
                      <Check
                        aria-hidden="true"
                        className="h-3 w-3"
                        strokeWidth={1.5}
                      />
                      Eklendi
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={`transition-all duration-200 ${isPulsing ? "scale-[1.02] animate-pulse" : ""}`}
                  >
                    <QuantityStepper
                      disabled={isUpdating || isRemoving}
                      max={99}
                      min={1}
                      onChange={(v) => {
                        handleQuantity(item.id, v).catch(() => {});
                      }}
                      value={item.quantity}
                    />
                  </span>
                  {isUpdating ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin text-store-muted-foreground"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <button
                    aria-label={`${item.productName} sepetten sil`}
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-store-border bg-white text-store-muted-foreground transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring disabled:opacity-50"
                    disabled={isRemoving || isUpdating}
                    onClick={() => {
                      handleRemove(item.id).catch(() => {});
                    }}
                    type="button"
                  >
                    <Trash2
                      aria-hidden="true"
                      className="h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>

                <p className="font-mono text-[11px] text-store-muted-foreground">
                  Ara toplam:{" "}
                  <span className="font-semibold text-store-ink">
                    {(item.unitPrice * item.quantity).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currency}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary — rounded-[1rem] shadow-store toplam store-primary */}
      <div className="rounded-[1rem] border border-store-border bg-white p-4 shadow-store transition-all duration-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-store-muted-foreground">Ara toplam</span>
          <span className="font-medium font-mono text-store-ink">
            {subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}{" "}
            {currency}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-sm text-store-ink">Toplam</span>
          <span className="font-bold text-lg text-store-primary tracking-tight">
            {totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}{" "}
            {currency}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-store-muted-foreground">
          {count} ürün · Kargo ödeme adımında hesaplanır
        </p>

        {variant === "page" ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex flex-1 items-center justify-center rounded-full border border-store-border bg-white px-4 py-2.5 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              href={`/${tenantSlug}/shop#catalog`}
            >
              Alışverişe devam et
            </Link>
            <Link
              className="inline-flex flex-1 items-center justify-center rounded-full bg-store-primary px-4 py-2.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              href={`/${tenantSlug}/checkout`}
            >
              Ödemeye geç
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <Link
              className="inline-flex w-full items-center justify-center rounded-full bg-store-primary px-4 py-2.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              href={`/${tenantSlug}/checkout`}
              onClick={onCheckout}
            >
              Ödemeye geç
            </Link>
            <Link
              className="inline-flex w-full items-center justify-center rounded-full border border-store-border bg-white px-4 py-2.5 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
              href={`/${tenantSlug}/cart`}
              onClick={onCheckout}
            >
              Sepeti görüntüle
            </Link>
          </div>
        )}
      </div>

      {/* footer meta */}
      <p className="text-center font-mono text-[11px] text-store-muted-foreground/70">
        Guest-token ile korunur · X-Guest-Token · toplam store-primary
      </p>
    </div>
  );
}

export default CartView;
