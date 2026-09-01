"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type CartDto,
  type CustomerAddressDto,
  EcommerceClient,
  type StorefrontDto,
} from "@/lib/ecommerce-client";
import { getGuestToken } from "@/lib/guest-token";
import { createClient } from "@/lib/supabase/client";

const CARRIERS = ["Aras", "MNG", "Yurtiçi", "PTT", "Sürat"] as const;
const GATEWAYS = ["iyzico", "PayTR", "Stripe", "Havale"] as const;

interface CheckoutFormProps {
  tenantSlug: string;
}

export function CheckoutForm({ tenantSlug }: CheckoutFormProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [storefront, setStorefront] = useState<StorefrontDto | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [billingAddressId, setBillingAddressId] = useState("");
  const [shippingAddressId, setShippingAddressId] = useState("");
  const [billingAddressText, setBillingAddressText] = useState("");
  const [shippingAddressText, setShippingAddressText] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [carrier, setCarrier] = useState<string>("");
  const [gateway, setGateway] = useState<string>("iyzico");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const [cartRes, storeRes] = await Promise.all([
        EcommerceClient.getCart(tenantSlug, guestToken ?? undefined),
        EcommerceClient.getStorefront(tenantSlug).catch(() => ({
          success: false as const,
        })),
      ]);

      if (cartRes.success && cartRes.data) {
        setCart(cartRes.data);
      }

      if (storeRes.success && storeRes.data) {
        setStorefront(storeRes.data);
        if (storeRes.data.defaultCarrier) {
          setCarrier(storeRes.data.defaultCarrier);
        }
        if (storeRes.data.paymentGateway) {
          setGateway(storeRes.data.paymentGateway);
        }
      }

      // Address book — only if authenticated (auth_user_id → customerId)
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const addrRes = await EcommerceClient.getAddresses(
          tenantSlug,
          accessToken
        );
        if (addrRes.success && addrRes.data) {
          setAddresses(addrRes.data);
          const defaultBilling = addrRes.data.find((a) => a.isDefaultBilling);
          const defaultShipping = addrRes.data.find((a) => a.isDefaultShipping);
          if (defaultBilling) {
            setBillingAddressId(defaultBilling.id);
          }
          if (defaultShipping) {
            setShippingAddressId(defaultShipping.id);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!cart || cart.items.length === 0) {
      setError("Sepetiniz boş.");
      return;
    }

    // If authenticated, require at least one address id or text; if guest, require email/phone + address text
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const isGuest = !accessToken;

    if (isGuest) {
      if (!(guestEmail.trim() && guestPhone.trim())) {
        setError("Misafir için e-posta ve telefon zorunludur.");
        return;
      }
      if (!(shippingAddressText.trim() && billingAddressText.trim())) {
        setError("Teslimat ve fatura adresi girin.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const payload = {
        billingAddress: billingAddressText.trim() || undefined,
        billingAddressId: billingAddressId || undefined,
        cartId: cart.id || undefined,
        couponCode: couponCode.trim() || undefined,
        customerEmail: guestEmail.trim() || undefined,
        customerPhone: guestPhone.trim() || undefined,
        guestToken,
        notes: notes.trim() || undefined,
        paymentGateway: gateway,
        shippingAddress: shippingAddressText.trim() || undefined,
        shippingAddressId: shippingAddressId || undefined,
        shippingCarrier: carrier || undefined,
      };

      const res = await EcommerceClient.createPublicOrder(payload, tenantSlug);

      if (!(res.success && res.data)) {
        setError(res.message ?? "Sipariş oluşturulamadı.");
        return;
      }

      // Optionally create payment intent for iyzico/PayTR
      if (gateway === "iyzico" || gateway === "PayTR" || gateway === "Stripe") {
        const intent = await EcommerceClient.createPaymentIntent(
          { gateway, guestToken, orderId: res.data.id },
          tenantSlug,
          accessToken ?? undefined
        );
        if (intent.success && intent.data?.checkoutUrl) {
          window.location.href = intent.data.checkoutUrl;
          return;
        }
      }

      setSuccess(
        `Sipariş oluşturuldu: ${res.data.orderNumber} — CRM status=Confirmed`
      );
      // Clear guest token cart? Keep for now — API merges on next cart fetch
      setTimeout(() => router.push(`/${tenantSlug}/my-orders`), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ödeme sırasında hata oluştu"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
          Ödeme
        </h1>

        {isEmpty ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
            Sepetiniz boş.{" "}
            <Link className="underline" href={`/${tenantSlug}/shop`}>
              Mağazaya dön
            </Link>
          </div>
        ) : null}

        {/* Auth hint */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {addresses.length > 0
            ? `${addresses.length} adres bulundu — varsayılanlar seçildi.`
            : "Giriş yaparsanız adres defterinizden seçebilirsiniz. Misafir olarak devam ediyorsanız e-posta/telefon girin."}{" "}
          <Link
            className="font-medium text-violet-600 underline"
            href={`/${tenantSlug}/my-orders/addresses`}
          >
            Adreslerim
          </Link>
        </div>

        {/* Address book */}
        {addresses.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Fatura adresi (customer_addresses)
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                onChange={(e) => setBillingAddressId(e.target.value)}
                value={billingAddressId}
              >
                <option value="">Adres seçin veya aşağıya yazın</option>
                {addresses
                  .filter((a) => a.type === "billing" || a.type === "both")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? a.label ?? a.city} — {a.addressLine1} (
                      {a.city}){a.isDefaultBilling ? " ★" : ""}
                    </option>
                  ))}
                {addresses
                  .filter((a) => a.type === "shipping")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? a.city} — {a.addressLine1} (kargo → fatura
                      olarak kullan)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Teslimat adresi
              </label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                onChange={(e) => setShippingAddressId(e.target.value)}
                value={shippingAddressId}
              >
                <option value="">Adres seçin veya aşağıya yazın</option>
                {addresses
                  .filter((a) => a.type === "shipping" || a.type === "both")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? a.label ?? a.city} — {a.addressLine1} (
                      {a.city}){a.isDefaultShipping ? " ★" : ""}
                    </option>
                  ))}
                {addresses
                  .filter((a) => a.type === "billing")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title ?? a.city} — {a.addressLine1} (fatura → kargo
                      olarak kullan)
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Fatura adresi (metin)
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setBillingAddressText(e.target.value)}
              placeholder="Mahalle, sokak, no, ilçe / şehir"
              rows={2}
              value={billingAddressText}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Teslimat adresi (metin)
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setShippingAddressText(e.target.value)}
              placeholder="Mahalle, sokak, no, ilçe / şehir"
              rows={2}
              value={shippingAddressText}
            />
          </div>
        </div>

        {/* Guest email/phone */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              E-posta (misafir)
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              type="email"
              value={guestEmail}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Telefon (misafir)
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="5xx xxx xx xx"
              type="tel"
              value={guestPhone}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Kargo firması
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setCarrier(e.target.value)}
              value={carrier}
            >
              <option value="">
                Varsayılan ({storefront?.defaultCarrier ?? "CRM seçer"})
              </option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Ödeme yöntemi
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              onChange={(e) => setGateway(e.target.value)}
              value={gateway}
            >
              {GATEWAYS.map((g) => (
                <option key={g} value={g}>
                  {g}{" "}
                  {storefront?.paymentGateway === g
                    ? " (mağaza varsayılanı)"
                    : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              tenant_settings.payment_gateway →{" "}
              {storefront?.paymentGateway ?? "iyzico"}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
            Kupon kodu
          </label>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Varsa kupon kodu — campaign_usages checkout&apos;ta yazılır"
            value={couponCode}
          />
        </div>

        <div>
          <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
            Sipariş notu
          </label>
          <textarea
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Teslimat notu, kapı kodu vb."
            rows={2}
            value={notes}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 font-medium text-rose-700 text-xs">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl bg-emerald-50 p-3 font-medium text-emerald-700 text-xs">
            {success}
          </p>
        ) : null}

        <button
          className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-sm text-white hover:bg-violet-700 disabled:opacity-50"
          disabled={submitting || isEmpty}
          type="submit"
        >
          {submitting
            ? "Oluşturuluyor…"
            : "Siparişi onayla — POST /api/public/orders"}
        </button>
        <p className="text-center text-[11px] text-zinc-400">
          Sipariş CRM&apos;de <code>status=Confirmed</code> ·{" "}
          <code>source=ECommerce</code> · <code>external_id</code> unique olarak
          oluşturulur.
        </p>
      </div>

      {/* Order summary */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Sepet özeti
          </h2>
          {cart?.items.length ? (
            <ul className="mt-3 space-y-2 text-xs">
              {cart.items.map((item) => (
                <li className="flex justify-between" key={item.id}>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    ₺
                    {(item.unitPrice * item.quantity).toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </li>
              ))}
              <li className="flex justify-between border-zinc-200 border-t pt-2 font-bold dark:border-zinc-800">
                <span>Toplam</span>
                <span>
                  ₺
                  {(cart.totalAmount ?? cart.subtotal ?? 0).toLocaleString(
                    "tr-TR",
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </li>
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Sepet boş</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            Güvenli ödeme
          </p>
          <p className="mt-1 leading-relaxed">
            Ödeme <code>POST /api/public/payments/create-intent</code> ile{" "}
            {gateway} üzerinden başlatılır. Başarılı olursa checkoutUrl&apos;a
            yönlendirilirsiniz.
          </p>
        </div>
      </div>
    </form>
  );
}
