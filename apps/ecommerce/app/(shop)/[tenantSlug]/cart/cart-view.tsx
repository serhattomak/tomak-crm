"use client";

import { Minus, Package, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type CartDto,
  EcommerceClient,
  type EvaluateCartResponse,
} from "@/lib/ecommerce-client";
import { ensureGuestToken, getGuestToken } from "@/lib/guest-token";

interface CartViewProps {
  tenantSlug: string;
}

export function CartView({ tenantSlug }: CartViewProps) {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluateCartResponse | null>(
    null
  );
  const [evaluating, setEvaluating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const res = await EcommerceClient.getCart(
        tenantSlug,
        guestToken ?? undefined
      );
      if (res.success && res.data) {
        setCart(res.data);
        // Persist guestToken if API returned new one
        if (res.data.guestToken) {
          const { setGuestToken } = await import("@/lib/guest-token");
          setGuestToken(res.data.guestToken);
        }
      } else {
        // Empty cart is valid — show empty state rather than error when 404
        if (
          res.errorCode === "HTTP_404" ||
          res.message?.includes("not found")
        ) {
          setCart({
            currency: "TRY",
            id: "",
            items: [],
            subtotal: 0,
            totalAmount: 0,
          });
        } else {
          setError(res.message ?? "Sepet yüklenemedi");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sepet yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      return;
    }
    setUpdatingId(itemId);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const res = await EcommerceClient.updateCartItem(
        itemId,
        { quantity },
        tenantSlug,
        guestToken ?? undefined
      );
      if (res.success && res.data) {
        setCart(res.data);
      } else {
        setError(res.message ?? "Güncellenemedi");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const res = await EcommerceClient.removeCartItem(
        itemId,
        tenantSlug,
        guestToken ?? undefined
      );
      if (res.success && res.data) {
        setCart(res.data);
      } else if (res.success) {
        await fetchCart();
      } else {
        setError(res.message ?? "Silinemedi");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEvaluate = async () => {
    if (!cart || cart.items.length === 0) {
      return;
    }
    setEvaluating(true);
    try {
      const guestToken = getGuestToken() ?? ensureGuestToken();
      const res = await EcommerceClient.evaluateCart(
        {
          couponCode: couponCode.trim() || undefined,
          guestToken,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setEvaluation(res.data);
      } else {
        setError(res.message ?? "Kupon değerlendirilemedi");
      }
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
        {error}
        <button
          className="ml-3 rounded-lg bg-white px-3 py-1 font-semibold text-rose-700 text-xs"
          onClick={() => void fetchCart()}
          type="button"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
            Sepet
          </h1>
          <Link
            className="font-medium text-violet-600 text-xs hover:underline"
            href={`/${tenantSlug}/shop`}
          >
            Alışverişe devam et
          </Link>
        </div>

        {isEmpty ? (
          <div className="rounded-2xl border border-zinc-300 border-dashed bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <Package className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="mt-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Sepetiniz boş
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Mağazadan ürün ekleyin — misafir sepeti guest_token ile saklanır.
            </p>
            <Link
              className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs"
              href={`/${tenantSlug}/shop`}
            >
              Mağazaya git
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cart?.items.map((item) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                key={item.id}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.productName}
                      className="h-full w-full rounded-xl object-cover"
                      src={item.imageUrl}
                    />
                  ) : (
                    <Package className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-1 font-semibold text-sm text-zinc-900 hover:text-violet-600 dark:text-zinc-100"
                    href={
                      item.slug ? `/${tenantSlug}/product/${item.slug}` : "#"
                    }
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    ₺
                    {item.unitPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    × {item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    aria-label="Azalt"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 disabled:opacity-40"
                    disabled={updatingId === item.id || item.quantity <= 1}
                    onClick={() =>
                      void handleUpdateQuantity(item.id, item.quantity - 1)
                    }
                    type="button"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-semibold text-xs">
                    {item.quantity}
                  </span>
                  <button
                    aria-label="Artır"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 disabled:opacity-40"
                    disabled={updatingId === item.id}
                    onClick={() =>
                      void handleUpdateQuantity(item.id, item.quantity + 1)
                    }
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="min-w-[80px] text-right font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ₺
                  {(item.unitPrice * item.quantity).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>

                <button
                  aria-label="Sil"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                  disabled={updatingId === item.id}
                  onClick={() => void handleRemove(item.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error ? <p className="text-rose-600 text-xs">{error}</p> : null}
      </div>

      {/* Summary + coupon evaluate */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Kupon & Promosyon
          </h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            POST /api/public/cart/evaluate — PromotionCalculationEngine,
            campaign_usages checkout&apos;ta yazılır.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Kupon kodu"
              value={couponCode}
            />
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white text-xs disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              disabled={evaluating || isEmpty}
              onClick={() => void handleEvaluate()}
              type="button"
            >
              {evaluating ? "…" : "Uygula"}
            </button>
          </div>

          {evaluation ? (
            <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
              {evaluation.couponValidationMessage ? (
                <p
                  className={
                    evaluation.isCouponValid
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }
                >
                  {evaluation.couponValidationMessage}
                </p>
              ) : null}
              {evaluation.appliedPromotions.map((promo) => (
                <div className="flex justify-between" key={promo.campaignName}>
                  <span className="text-zinc-600">{promo.campaignName}</span>
                  <span className="font-semibold text-emerald-600">
                    -₺
                    {promo.discountAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
              {evaluation.isFreeShipping ? (
                <p className="font-medium text-emerald-600">Kargo bedava</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Sipariş özeti
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Ara toplam</span>
              <span className="font-medium">
                ₺
                {(evaluation?.subtotal ?? cart?.subtotal ?? 0).toLocaleString(
                  "tr-TR",
                  { minimumFractionDigits: 2 }
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">İndirim</span>
              <span className="font-medium text-emerald-600">
                -₺
                {(evaluation?.totalDiscountAmount ?? 0).toLocaleString(
                  "tr-TR",
                  { minimumFractionDigits: 2 }
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Kargo</span>
              <span className="font-medium">
                ₺
                {(evaluation?.shippingFee ?? 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between border-zinc-200 border-t pt-2 font-bold text-sm dark:border-zinc-800">
              <span>Toplam</span>
              <span>
                ₺
                {(
                  evaluation?.grandTotal ??
                  cart?.totalAmount ??
                  cart?.subtotal ??
                  0
                ).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <Link
            className={`mt-4 flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-sm ${isEmpty ? "pointer-events-none bg-zinc-200 text-zinc-500" : "bg-violet-600 text-white hover:bg-violet-700"}`}
            href={`/${tenantSlug}/checkout`}
          >
            Ödemeye geç
          </Link>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Sepet guest_token ile saklanır; giriş yapınca CRM merge eder.
          </p>
        </div>
      </div>
    </div>
  );
}
