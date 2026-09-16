"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { ApiClient, type OrderDetailDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function OrderPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const orderId = (params?.orderId as string) || "";
  const type = searchParams.get("type") || "proforma";
  const { activeTenant } = usePermissions();
  const [order, setOrder] = useState<OrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!(activeTenant?.id && orderId)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getOrderById(orderId, activeTenant.id);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.message || "Sipariş bulunamadı.");
      }
    } catch {
      setError("Sipariş yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    window.print();
  };

  const getLabel = (status: string) => {
    const map: Record<string, string> = {
      Cancelled: "İptal",
      Confirmed: "Onaylandı",
      Delivered: "Teslim Edildi",
      Draft: "Taslak",
      PendingApproval: "Onay Bekliyor",
      Processing: "Hazırlanıyor",
      Refunded: "İade",
      Shipped: "Kargoda",
    };
    return map[status] || status;
  };

  const getPaymentLabel = (m: string) => {
    const map: Record<string, string> = {
      BankTransfer: "Havale / EFT",
      Cash: "Nakit",
      Check: "Çek / Senet",
      CreditCard: "Kredi Kartı",
      OpenAccount: "Açık Hesap",
    };
    return map[m] || m;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600 text-sm">
          {error || "Sipariş bulunamadı."}
        </p>
        <Link
          className="mt-4 inline-flex text-blue-600 text-xs underline"
          href={`/${tenantSlug}/orders`}
        >
          Siparişlere Dön
        </Link>
      </div>
    );
  }

  const isProforma = type === "proforma";

  return (
    <PermissionGate
      fallback={
        <div className="p-8 text-center text-xs text-zinc-500">
          Bu sayfayı görüntüleme yetkiniz yok (Orders.View).
        </div>
      }
      permission="Orders.View"
    >
      <div className="mx-auto max-w-4xl bg-card p-6 text-zinc-900 dark:bg-white dark:text-zinc-900 print:p-0">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            @page { size: A4 portrait; margin: 12mm; }
          }
        `}</style>

        {/* No-print toolbar */}
        <div className="no-print mb-4 flex items-center justify-between">
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/orders/${orderId}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Siparişe Dön
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs hover:bg-blue-700"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-4 w-4" />
            Yazdır / PDF Kaydet
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-zinc-900 border-b-2 pb-4">
          <div className="flex items-center gap-3">
            {activeTenant?.logoUrl ? (
              <img
                alt="logo"
                className="h-10 w-10 rounded-xl object-cover"
                src={activeTenant.logoUrl}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-sm text-white">
                {activeTenant?.name?.charAt(0).toUpperCase() || "C"}
              </div>
            )}
            <div>
              <div className="font-black text-lg uppercase tracking-tight">
                {activeTenant?.name || "Şirket"}
              </div>
              <div className="text-2xs text-zinc-500">
                {isProforma ? "Proforma Fatura / Teklif" : "Sipariş Belgesi"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black font-mono text-sm">
              {order.orderNumber}
            </div>
            <div className="mt-1 flex justify-end gap-1">
              <span className="rounded-md border border-border bg-zinc-100 px-2 py-0.5 font-bold text-3xs">
                {getLabel(order.status)}
              </span>
              <span className="rounded-md border border-border bg-zinc-50 px-2 py-0.5 font-bold text-3xs">
                {order.paymentStatus}
              </span>
            </div>
            <div className="mt-1 text-2xs text-zinc-500">
              <div>
                Sipariş Tarihi:{" "}
                {new Date(order.orderDate).toLocaleDateString("tr-TR")}
              </div>
              {order.dueDate && (
                <div>
                  Vade: {new Date(order.dueDate).toLocaleDateString("tr-TR")}
                </div>
              )}
              {order.invoiceNumber && (
                <div>Fatura No: {order.invoiceNumber}</div>
              )}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-zinc-50 p-3">
            <div className="font-extrabold text-3xs text-blue-700 uppercase tracking-wider">
              Müşteri
            </div>
            <div className="mt-1 font-bold text-sm">{order.customerName}</div>
            {order.billingAddress && (
              <div className="mt-1 text-xs text-zinc-600">
                Fatura: {order.billingAddress}
              </div>
            )}
            {order.shippingAddress && (
              <div className="mt-1 text-xs text-zinc-600">
                Teslimat: {order.shippingAddress}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-zinc-50 p-3">
            <div className="font-extrabold text-3xs text-zinc-500 uppercase tracking-wider">
              Ödeme Bilgisi
            </div>
            <div className="mt-1 text-xs">
              <div>
                Yöntem: <b>{getPaymentLabel(order.paymentMethod)}</b>
              </div>
              {order.dueDate && (
                <div>
                  Vade:{" "}
                  <b>{new Date(order.dueDate).toLocaleDateString("tr-TR")}</b>
                </div>
              )}
              <div className="mt-1 text-2xs text-zinc-500">
                Durum: {order.paymentStatus}
              </div>
            </div>
            {(order.carrier || order.trackingNumber) && (
              <div className="mt-2 text-xs">
                {order.carrier && <div>Taşıyıcı: {order.carrier}</div>}
                {order.trackingNumber && (
                  <div className="font-mono">Takip: {order.trackingNumber}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="mt-4 w-full border-collapse border border-border text-xs">
          <thead>
            <tr className="bg-zinc-900 text-white">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Ürün / Hizmet</th>
              <th className="px-2 py-2 text-center">SKU</th>
              <th className="px-2 py-2 text-center">Miktar</th>
              <th className="px-2 py-2 text-right">Birim Fiyat</th>
              <th className="px-2 py-2 text-center">KDV</th>
              <th className="px-2 py-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, idx) => (
              <tr
                className={idx % 2 === 1 ? "bg-zinc-50" : "bg-card"}
                key={it.id}
              >
                <td className="border-border border-t px-2 py-2 text-center">
                  {idx + 1}
                </td>
                <td className="border-border border-t px-2 py-2">
                  <div className="font-semibold">{it.productName}</div>
                  {it.optionsOrNotes && (
                    <div className="text-2xs text-zinc-500">
                      {it.optionsOrNotes}
                    </div>
                  )}
                </td>
                <td className="border-border border-t px-2 py-2 text-center font-mono text-2xs">
                  {it.sku || "—"}
                </td>
                <td className="border-border border-t px-2 py-2 text-center font-bold">
                  {it.quantity} {it.unit}
                </td>
                <td className="border-border border-t px-2 py-2 text-right">
                  ₺
                  {it.unitPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="border-border border-t px-2 py-2 text-center">
                  %{it.taxRate}
                </td>
                <td className="border-border border-t px-2 py-2 text-right font-bold">
                  ₺
                  {it.totalPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 rounded-xl border-2 border-zinc-900 bg-zinc-50 p-3 text-xs">
            <div className="flex justify-between">
              <span>Ara Toplam</span>
              <span className="font-bold">
                ₺
                {order.subtotal.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>İndirim</span>
                <span className="font-bold">
                  -₺
                  {order.discountAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>KDV</span>
              <span className="font-bold">
                ₺
                {order.taxAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {order.shippingFee > 0 && (
              <div className="flex justify-between">
                <span>Kargo</span>
                <span className="font-bold">
                  ₺
                  {order.shippingFee.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between border-zinc-900 border-t-2 pt-2 text-sm">
              <span className="font-black">GENEL TOPLAM</span>
              <span className="font-black text-blue-700">
                ₺
                {order.totalAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between border-border border-t pt-1">
              <span>Ödenen</span>
              <span className="font-bold text-emerald-700">
                ₺
                {order.paidAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Kalan</span>
              <span
                className={`font-bold ${order.remainingAmount > 0 ? "text-rose-600" : "text-zinc-700"}`}
              >
                ₺
                {order.remainingAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {order.payments.length > 0 && (
          <div className="mt-4">
            <div className="font-bold text-2xs uppercase tracking-wider">
              Tahsilat Geçmişi
            </div>
            <div className="mt-1 divide-y divide-zinc-200 rounded-xl border border-border">
              {order.payments.map((p) => (
                <div
                  className="flex justify-between px-3 py-2 text-xs"
                  key={p.id}
                >
                  <span>
                    {getPaymentLabel(p.paymentMethod)}{" "}
                    {p.referenceNumber ? `· ${p.referenceNumber}` : ""}
                  </span>
                  <span className="font-bold">
                    ₺
                    {p.amount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    · {new Date(p.paymentDate).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.notes && (
          <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs dark:text-zinc-200">
            <div className="font-bold">Notlar</div>
            <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
              {order.notes}
            </p>
          </div>
        )}
        {order.shippingAddress && (
          <div className="mt-3 text-xs text-zinc-600">
            <b>Teslimat Adresi:</b> {order.shippingAddress}
          </div>
        )}

        <div className="mt-6 flex justify-between border-border border-t pt-3 text-3xs text-zinc-400">
          <span>
            Bu belge {isProforma ? "proforma" : "sipariş"} olarak elektronik
            ortamda oluşturulmuştur.
          </span>
          <span>
            {order.orderNumber} • {new Date().toLocaleDateString("tr-TR")}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
