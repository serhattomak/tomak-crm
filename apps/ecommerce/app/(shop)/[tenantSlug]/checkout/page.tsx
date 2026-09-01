"use client";

import { Price } from "@workspace/ui/components/price";
import {
  ArrowRight,
  Check,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { type CartDto, EcommerceClient } from "@/lib/ecommerce-client";
import { getGuestToken } from "@/lib/guest-token";
import { EmptyIllustration } from "../components/empty-illustration";

type CheckoutStep = 1 | 2 | 3;

const SHIPPING_OPTIONS = [
  { id: "aras", label: "Aras Kargo", note: "1-3 gün · 59,90 ₺" },
  { id: "mng", label: "MNG Kargo", note: "2-4 gün · 49,90 ₺" },
  { id: "yurtici", label: "Yurtiçi Kargo", note: "1-2 gün · 69,90 ₺" },
  { id: "ptt", label: "PTT Kargo", note: "3-5 gün · 39,90 ₺" },
];

const PAYMENT_GATEWAYS = [
  { id: "iyzico", label: "Iyzico", note: "Kredi kartı / havale" },
  { id: "paytr", label: "PayTR", note: "Kart + taksit" },
  { id: "stripe", label: "Stripe", note: "Uluslararası kart" },
  { id: "cod", label: "Kapıda ödeme", note: "Nakit / kart kapıda" },
];

function StepPill({
  active,
  done,
  label,
  step,
}: {
  active: boolean;
  done: boolean;
  label: string;
  step: number;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold text-xs transition-all duration-200 ${
        active
          ? "border-store-primary bg-store-primary text-store-primary-foreground shadow-store-sm"
          : done
            ? "border-store-border bg-store-accent text-store-accent-foreground"
            : "border-store-border bg-white text-store-muted-foreground"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full font-bold text-[11px] leading-none transition-all duration-200 ${
          active
            ? "bg-white text-store-primary"
            : done
              ? "bg-store-primary text-store-primary-foreground"
              : "bg-store-muted text-store-muted-foreground"
        }`}
      >
        {done ? (
          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          step
        )}
      </span>
      {label}
    </span>
  );
}

function PillRadio({
  active,
  label,
  note,
  onClick,
}: {
  active: boolean;
  label: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-full border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring ${
        active
          ? "border-store-primary bg-store-accent text-store-accent-foreground shadow-store-sm"
          : "border-store-border bg-white text-store-ink hover:bg-store-muted"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex flex-col">
        <span className="font-semibold text-xs">{label}</span>
        {note ? (
          <span className="font-mono text-[11px] opacity-70">{note}</span>
        ) : null}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${active ? "border-store-primary bg-store-primary text-store-primary-foreground" : "border-store-border bg-white"}`}
      >
        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
      </span>
    </button>
  );
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = React.use(params);
  const [step, setStep] = React.useState<CheckoutStep>(1);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loadingCart, setLoadingCart] = React.useState(true);
  const [shipping, setShipping] = React.useState<string>("aras");
  const [gateway, setGateway] = React.useState<string>("iyzico");
  const [addressTitle, setAddressTitle] = React.useState<string>("Ev");
  const [addressLine, setAddressLine] = React.useState<string>("");
  const [city, setCity] = React.useState<string>("");
  const [placing, setPlacing] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [addedPulse, setAddedPulse] = React.useState(false);

  const fetchCart = React.useCallback(async (slug: string) => {
    const guestToken = getGuestToken() ?? undefined;
    if (!guestToken) {
      setCart(null);
      setLoadingCart(false);
      return;
    }
    setLoadingCart(true);
    try {
      const res = await EcommerceClient.getCart(slug, guestToken);
      if (res.success && res.data) {
        setCart(res.data);
      } else {
        setCart(null);
      }
    } catch {
      setCart(null);
    } finally {
      setLoadingCart(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCart(tenantSlug).catch(() => {});
  }, [tenantSlug, fetchCart]);

  const isEmpty = !cart || cart.items.length === 0;
  const currency = cart?.currency ?? "TRY";
  const subtotal = cart?.subtotal ?? cart?.totalAmount ?? 0;
  const shippingFee = SHIPPING_OPTIONS.find(
    (o) => o.id === shipping
  )?.note.includes("59")
    ? 59.9
    : SHIPPING_OPTIONS.find((o) => o.id === shipping)?.note.includes("49")
      ? 49.9
      : SHIPPING_OPTIONS.find((o) => o.id === shipping)?.note.includes("69")
        ? 69.9
        : 39.9;
  const total = subtotal + (isEmpty ? 0 : shippingFee);

  const handlePlaceOrder = async () => {
    if (!tenantSlug || isEmpty) {
      return;
    }
    setPlacing(true);
    setMessage(null);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 600);
    try {
      const guestToken = getGuestToken() ?? undefined;
      const res = await EcommerceClient.createPublicOrder(
        {
          billingAddress: addressLine || city || addressTitle,
          guestToken,
          paymentGateway: gateway,
          shippingAddress: addressLine || city || addressTitle,
          shippingCarrier: shipping,
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setMessage(`Sipariş oluşturuldu ✓ — ${res.data.orderNumber}`);
        // optionally create payment intent
        try {
          await EcommerceClient.createPaymentIntent(
            { gateway, guestToken, orderId: res.data.id },
            tenantSlug
          );
        } catch {
          // ignore payment intent error — order already created
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart-updated"));
        }
        setTimeout(() => setMessage(null), 1500);
      } else {
        setMessage(res.message ?? "Sipariş oluşturulamadı");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sipariş oluşturulamadı");
    } finally {
      setPlacing(false);
    }
  };

  if (!tenantSlug || tenantSlug.length < 2) {
    return (
      <div className="mx-auto max-w-[80rem] p-8 text-sm text-store-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[80rem] space-y-6">
      {/* header + stepper Sepet→Bilgiler→Ödeme pill stepper */}
      <div className="space-y-3">
        <h1 className="font-normal font-serif text-3xl text-store-ink tracking-tight sm:text-4xl">
          Ödeme
        </h1>
        <p className="text-sm text-store-muted-foreground leading-relaxed">
          Tek sayfa adımlar — sol adres/kargo pill’leri + payment_gateways
          radio, sağ özet sticky.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            onClick={() => setStep(1)}
            type="button"
          >
            <StepPill
              active={step === 1}
              done={step > 1}
              label="Sepet"
              step={1}
            />
          </button>
          <span aria-hidden="true" className="text-store-muted-foreground">
            →
          </span>
          <button
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            onClick={() => setStep(2)}
            type="button"
          >
            <StepPill
              active={step === 2}
              done={step > 2}
              label="Bilgiler"
              step={2}
            />
          </button>
          <span aria-hidden="true" className="text-store-muted-foreground">
            →
          </span>
          <button
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            onClick={() => setStep(3)}
            type="button"
          >
            <StepPill active={step === 3} done={false} label="Ödeme" step={3} />
          </button>
        </div>
      </div>

      {loadingCart ? (
        <div className="rounded-[1rem] border border-store-border bg-white p-6 text-sm text-store-muted-foreground shadow-store-sm">
          Sepet yükleniyor…
        </div>
      ) : isEmpty ? (
        <EmptyIllustration tenantSlug={tenantSlug} variant="cart" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left — forms */}
          <div className="space-y-4">
            {/* Step 1: Sepet mini özet — also via stepper */}
            {step === 1 ? (
              <div className="space-y-3 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm transition-all duration-200">
                <h2 className="flex items-center gap-1.5 font-semibold text-sm text-store-ink">
                  <Package
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={1.5}
                  />
                  Sepetiniz
                </h2>
                <div className="divide-y divide-store-border overflow-hidden rounded-[0.75rem] border border-store-border">
                  {cart.items.map((item) => (
                    <div
                      className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-xs"
                      key={item.id}
                    >
                      <span className="line-clamp-1 font-medium text-store-ink">
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-mono font-semibold text-store-ink">
                        {(item.unitPrice * item.quantity).toLocaleString(
                          "tr-TR",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}{" "}
                        {currency}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="inline-flex w-full items-center justify-center rounded-full bg-store-primary px-4 py-2.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Bilgilere devam et
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-1 h-4 w-4"
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            ) : null}

            {/* Step 2: Bilgiler — adres/kargo pill’leri radio rounded-full */}
            <div
              className={`space-y-3 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm transition-all duration-200 ${step === 2 ? "ring-2 ring-store-ring" : "opacity-90"}`}
            >
              <h2 className="flex items-center gap-1.5 font-semibold text-sm text-store-ink">
                <MapPin
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={1.5}
                />
                Teslimat bilgileri
              </h2>

              {/* adres başlık pill’leri */}
              <div className="space-y-2">
                <p className="font-medium text-store-ink text-xs">
                  Adres başlığı
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Ev", "İş", "Diğer"].map((label) => {
                    const active = addressTitle === label;
                    return (
                      <button
                        aria-pressed={active}
                        className={`rounded-full border px-4 py-1.5 font-medium text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring ${active ? "border-store-primary bg-store-accent text-store-accent-foreground shadow-store-sm" : "border-store-border bg-white text-store-ink hover:bg-store-muted"}`}
                        key={label}
                        onClick={() => setAddressTitle(label)}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-store-ink">Adres</span>
                    <input
                      className="rounded-full border border-store-border bg-white px-3 py-2 text-store-ink text-xs transition-all duration-200 placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Mahalle, sokak, no…"
                      value={addressLine}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-store-ink">Şehir</span>
                    <input
                      className="rounded-full border border-store-border bg-white px-3 py-2 text-store-ink text-xs transition-all duration-200 placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="İstanbul"
                      value={city}
                    />
                  </label>
                </div>
              </div>

              {/* kargo pill’leri */}
              <div className="space-y-2 pt-2">
                <p className="flex items-center gap-1.5 font-medium text-store-ink text-xs">
                  <Truck
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={1.5}
                  />
                  Kargo
                </p>
                <div className="grid gap-2">
                  {SHIPPING_OPTIONS.map((opt) => (
                    <PillRadio
                      active={shipping === opt.id}
                      key={opt.id}
                      label={opt.label}
                      note={opt.note}
                      onClick={() => setShipping(opt.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="inline-flex rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Geri
                </button>
                <button
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-store-primary px-4 py-2 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={() => setStep(3)}
                  type="button"
                >
                  Ödemeye devam
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4"
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>

            {/* Step 3: Ödeme — payment_gateways radio store-theme */}
            <div
              className={`space-y-3 rounded-[1rem] border border-store-border bg-white p-4 shadow-store-sm transition-all duration-200 ${step === 3 ? "ring-2 ring-store-ring" : "opacity-90"}`}
            >
              <h2 className="flex items-center gap-1.5 font-semibold text-sm text-store-ink">
                <CreditCard
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={1.5}
                />
                Ödeme yöntemi
              </h2>
              <div className="grid gap-2">
                {PAYMENT_GATEWAYS.map((gw) => (
                  <PillRadio
                    active={gateway === gw.id}
                    key={gw.id}
                    label={gw.label}
                    note={gw.note}
                    onClick={() => setGateway(gw.id)}
                  />
                ))}
              </div>
              <p className="font-mono text-[11px] text-store-muted-foreground">
                Seçili:{" "}
                <span className="font-semibold text-store-ink">{gateway}</span>{" "}
                · store-theme mercan radio active bg-store-accent
              </p>
              <div className="flex gap-2">
                <button
                  className="inline-flex rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Geri
                </button>
                <Link
                  className="inline-flex items-center rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  href={`/${tenantSlug}/cart`}
                >
                  Sepete dön
                </Link>
              </div>
            </div>
          </div>

          {/* Right — özet sticky top-20 rounded-[1rem] shadow-store toplam store-primary */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-[1rem] border border-store-border bg-white p-4 shadow-store transition-all duration-200">
              <h2 className="font-serif text-lg text-store-ink">
                Sipariş özeti
              </h2>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-store-muted-foreground">
                    Ara toplam
                  </span>
                  <span className="font-medium font-mono text-store-ink">
                    {subtotal.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-store-muted-foreground">
                    Kargo (
                    {SHIPPING_OPTIONS.find((o) => o.id === shipping)?.label})
                  </span>
                  <span className="font-medium font-mono text-store-ink">
                    {shippingFee.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currency}
                  </span>
                </div>
                <div className="flex justify-between border-store-border border-t pt-2">
                  <span className="font-semibold text-sm text-store-ink">
                    Toplam
                  </span>
                  <Price
                    className="[&>span:first-child]:text-store-primary"
                    currency={currency}
                    price={total}
                    size="lg"
                  />
                </div>
                <p className="font-mono text-[11px] text-store-muted-foreground">
                  {cart.items.length} ürün · toplam store-primary vurgulu
                </p>
              </div>

              {/* coupon placeholder */}
              <div className="mt-4 flex gap-2">
                <input
                  aria-label="Kupon kodu"
                  className="flex-1 rounded-full border border-store-border bg-white px-3 py-2 text-store-ink text-xs transition-all duration-200 placeholder:text-store-muted-foreground focus:border-store-ring focus:outline-none focus:ring-2 focus:ring-store-ring"
                  placeholder="Kupon kodu"
                  type="text"
                />
                <button
                  className="rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                  type="button"
                >
                  Uygula
                </button>
              </div>

              <button
                className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-store-primary px-4 py-3 font-semibold text-sm text-store-primary-foreground shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 ${addedPulse ? "animate-pulse" : ""}`}
                disabled={placing}
                onClick={handlePlaceOrder}
                type="button"
              >
                {placing ? "Oluşturuluyor…" : "Siparişi tamamla"}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={1.5}
                />
              </button>

              {message ? (
                <p
                  aria-live="polite"
                  className="fade-in slide-in-from-top-1 mt-3 animate-in text-center font-medium text-store-primary text-xs duration-200"
                  role="status"
                >
                  {message}
                </p>
              ) : null}

              <p className="mt-3 text-center font-mono text-[11px] text-store-muted-foreground/70">
                EcommerceClient.createPublicOrder · guest-token korunur
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link
                  className="font-medium text-store-muted-foreground text-xs underline-offset-4 hover:text-store-ink hover:underline"
                  href={`/${tenantSlug}/cart`}
                >
                  Sepete dön
                </Link>
                <span className="text-store-muted-foreground text-xs">·</span>
                <Link
                  className="font-medium text-store-muted-foreground text-xs underline-offset-4 hover:text-store-ink hover:underline"
                  href={`/${tenantSlug}/shop`}
                >
                  Mağazaya dön
                </Link>
              </div>
            </div>

            {/* mini trust */}
            <div className="rounded-[1rem] border border-store-border border-dashed bg-store-muted/50 p-3 text-[11px] text-store-muted-foreground leading-relaxed">
              Güvenli ödeme · Iyzico / PayTR altyapısı · 14 gün iade. Kargo
              ücreti teslimat adımında netleşir. Sorular için{" "}
              <Link
                className="font-medium text-store-ink underline-offset-4 hover:underline"
                href={`/${tenantSlug}/my-orders/support`}
              >
                destek
              </Link>
              .
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
