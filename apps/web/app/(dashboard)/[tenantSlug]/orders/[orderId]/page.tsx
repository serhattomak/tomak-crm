"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Plus,
  Printer,
  RotateCcw,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { ApiClient, type OrderDetailDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const orderId = (params?.orderId as string) || "";
  const { activeTenant } = usePermissions();

  const [order, setOrder] = useState<OrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "payments" | "timeline">(
    "items"
  );

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!(activeTenant && orderId)) {
      return;
    }
    setLoading(true);
    try {
      const res = await ApiClient.getOrderById(orderId, activeTenant.id);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        showToast("Sipariş bulunamadı.");
        router.push(`/${tenantSlug}/orders`);
      }
    } catch {
      showToast("Sipariş detayları yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, orderId, tenantSlug, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "PendingApproval":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Processing":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Shipped":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Refunded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Draft":
        return "Taslak";
      case "PendingApproval":
        return "Onay Bekliyor";
      case "Confirmed":
        return "Onaylandı";
      case "Processing":
        return "Hazırlanıyor";
      case "Shipped":
        return "Kargoda / Yolda";
      case "Delivered":
        return "Teslim Edildi";
      case "Cancelled":
        return "İptal Edildi";
      case "Refunded":
        return "İade Edildi";
      default:
        return status;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PartiallyPaid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Refunded":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case "Paid":
        return "Ödendi";
      case "PartiallyPaid":
        return "Kısmi Ödendi";
      case "Unpaid":
        return "Ödenmedi";
      case "Refunded":
        return "İade Edildi";
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "BankTransfer":
        return "Havale / EFT";
      case "CreditCard":
        return "Kredi Kartı";
      case "Cash":
        return "Nakit";
      case "Check":
        return "Çek / Senet";
      case "OpenAccount":
        return "Açık Hesap (Cari)";
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-medium text-slate-500 text-xs">
            Sipariş detayları yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white text-xs shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-slate-100 border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            href={`/${tenantSlug}/orders`}
            title="Siparişlere Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 font-bold text-base text-blue-600 shadow-xs">
              <ShoppingCart className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-xl tracking-tight sm:text-2xl">
                  {order.orderNumber}
                </h1>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${getStatusBadge(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 font-bold text-[10px] ${getPaymentBadge(
                    order.paymentStatus
                  )}`}
                >
                  {getPaymentLabel(order.paymentStatus)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-slate-500 text-xs">
                <span className="font-bold text-slate-800">
                  {order.customerName}
                </span>
                <span>•</span>
                <span>
                  {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                </span>
                {order.invoiceNumber && (
                  <>
                    <span>•</span>
                    <span>Fatura: {order.invoiceNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50"
            onClick={handlePrint}
            title="Siparişi Yazdır / PDF"
            type="button"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Yazdır / Proforma</span>
          </button>

          <PermissionGate permission="Orders.PaymentRecord">
            <button
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 font-semibold text-emerald-800 text-xs shadow-2xs transition-colors hover:bg-emerald-100"
              onClick={() => setIsPaymentModalOpen(true)}
              type="button"
            >
              <Banknote className="h-3.5 w-3.5" />
              <span>Tahsilat Ekle</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="Orders.StatusChange">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsStatusModalOpen(true)}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Durumu Değiştir</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. Main Content Layout (4 Cols / 8 Cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Customer, Delivery, & Financial Summary (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card: Financial Summary */}
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 text-xs shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs">
              Sipariş Tutarı & Ödeme Özeti
            </h3>

            <div className="space-y-2 border-slate-100 border-b pb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ara Toplam:</span>
                <span className="font-semibold text-slate-800">
                  ₺
                  {order.subtotal.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex items-center justify-between font-medium text-rose-600">
                  <span>Toplam İndirim / İskonto:</span>
                  <span>
                    -₺
                    {order.discountAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Hesaplanan KDV:</span>
                <span className="font-semibold text-slate-800">
                  ₺
                  {order.taxAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {order.shippingFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kargo & Sevkiyat:</span>
                  <span className="font-semibold text-slate-800">
                    ₺
                    {order.shippingFee.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-900 text-sm">
                GENEL TOPLAM:
              </span>
              <span className="font-extrabold text-base text-blue-600">
                ₺
                {order.totalAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Paid & Remaining */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 pt-2">
              <div>
                <span className="font-medium text-[10px] text-slate-400 uppercase">
                  Tahsil Edilen
                </span>
                <div className="font-bold text-emerald-600 text-sm">
                  ₺
                  {order.paidAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div>
                <span className="font-medium text-[10px] text-slate-400 uppercase">
                  Kalan Bakiye
                </span>
                <div
                  className={`font-bold text-sm ${
                    order.remainingAmount > 0
                      ? "text-rose-600"
                      : "text-slate-700"
                  }`}
                >
                  ₺
                  {order.remainingAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-1 text-[11px] text-slate-500">
              <span>Ödeme Yöntemi:</span>
              <span className="font-semibold text-slate-800">
                {getPaymentMethodLabel(order.paymentMethod)}
              </span>
            </div>
          </div>

          {/* Card: Customer & Delivery Info */}
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-5 text-xs shadow-xs">
            <h3 className="font-bold text-slate-900">
              Müşteri & Sevkiyat Bilgileri
            </h3>

            <div className="space-y-2.5 text-slate-600">
              <div>
                <span className="block text-[10px] text-slate-400">
                  Müşteri / Firma
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {order.customerName}
                </span>
              </div>

              {order.shippingAddress && (
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Teslimat Adresi
                  </span>
                  <p className="mt-0.5 rounded-xl bg-slate-50 p-2.5 text-slate-800 leading-relaxed">
                    {order.shippingAddress}
                  </p>
                </div>
              )}

              {order.billingAddress && (
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Fatura Adresi
                  </span>
                  <p className="mt-0.5 rounded-xl bg-slate-50 p-2.5 text-slate-800 leading-relaxed">
                    {order.billingAddress}
                  </p>
                </div>
              )}

              {(order.carrier || order.trackingNumber) && (
                <div className="space-y-1 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-900">
                    <Truck className="h-3.5 w-3.5 text-cyan-600" />
                    <span>Kargo & Takip</span>
                  </div>
                  {order.carrier && (
                    <div className="text-[11px] text-cyan-800">
                      Taşıyıcı: {order.carrier}
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="font-bold font-mono text-[11px] text-cyan-950">
                      Takip No: {order.trackingNumber}
                    </div>
                  )}
                </div>
              )}

              {order.notes && (
                <div>
                  <span className="block text-[10px] text-slate-400">
                    Sipariş Notu
                  </span>
                  <p className="text-slate-700 italic">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Views (Items, Payments, Timeline) (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100/90 p-1">
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
                activeTab === "items"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("items")}
              type="button"
            >
              Sipariş Kalemleri ({order.items.length})
            </button>
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
                activeTab === "payments"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("payments")}
              type="button"
            >
              Tahsilat & Ödemeler ({order.payments.length})
            </button>
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
                activeTab === "timeline"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("timeline")}
              type="button"
            >
              Sipariş Geçmişi & Etkinlikler ({order.activities.length})
            </button>
          </div>

          {/* TAB 1: ORDER ITEMS TABLE */}
          {activeTab === "items" && (
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs">
                Sipariş Edilen Ürün ve Hizmetler
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-slate-200 border-b bg-slate-50 font-medium text-[11px] text-slate-500">
                    <tr>
                      <th className="px-3.5 py-3">Kalem / Ürün</th>
                      <th className="px-3 py-3 text-center">Miktar</th>
                      <th className="px-3 py-3 text-right">Birim Fiyat</th>
                      <th className="px-3 py-3 text-center">KDV</th>
                      <th className="px-3 py-3 text-center">İndirim</th>
                      <th className="py-3 pr-4 pl-3 text-right">
                        Toplam Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr className="hover:bg-slate-50/60" key={item.id}>
                        <td className="px-3.5 py-3.5">
                          <div className="font-bold text-slate-900">
                            {item.productName}
                          </div>
                          {item.sku && (
                            <div className="font-mono text-[10px] text-slate-400">
                              SKU: {item.sku}
                            </div>
                          )}
                          {item.optionsOrNotes && (
                            <div className="mt-0.5 text-[10px] text-slate-500 italic">
                              {item.optionsOrNotes}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-center font-extrabold text-slate-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-3.5 text-right font-medium text-slate-700">
                          ₺
                          {item.unitPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600">
                          %{item.taxRate}
                        </td>
                        <td className="px-3 py-3.5 text-center font-medium text-rose-600">
                          {item.discountRate > 0
                            ? `-%${item.discountRate}`
                            : "—"}
                        </td>
                        <td className="py-3.5 pr-4 pl-3 text-right font-extrabold text-slate-900">
                          ₺
                          {item.totalPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS LIST */}
          {activeTab === "payments" && (
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  Tahsilat & Ödeme Kayıtları
                </h4>
                <PermissionGate permission="Orders.PaymentRecord">
                  <button
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
                    onClick={() => setIsPaymentModalOpen(true)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tahsilat Ekle</span>
                  </button>
                </PermissionGate>
              </div>

              {order.payments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center text-slate-400 text-xs">
                  Bu sipariş için henüz tahsilat kaydedilmedi.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {order.payments.map((p) => (
                    <div
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 text-xs"
                      key={p.id}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {getPaymentMethodLabel(p.paymentMethod)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.referenceNumber
                              ? `Dekont / Ref: ${p.referenceNumber}`
                              : "Referans girilmedi"}
                            {p.notes && ` • ${p.notes}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-emerald-600 text-sm">
                          ₺
                          {p.amount.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE & ACTIVITIES */}
          {activeTab === "timeline" && (
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs">
                Sipariş Yaşam Döngüsü & Etkinlik Defteri
              </h4>

              {order.activities.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center text-slate-400 text-xs">
                  Etkinlik kaydı bulunmuyor.
                </div>
              ) : (
                <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-100">
                  {order.activities.map((act) => (
                    <div
                      className="relative flex items-start gap-3 text-xs"
                      key={act.id}
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white bg-white shadow-2xs ring-2 ring-slate-100">
                        {act.activityType === "StatusChange" ? (
                          <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                        ) : act.activityType === "PaymentAdded" ? (
                          <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {act.title}
                          </span>
                          <span className="font-medium text-[10px] text-slate-400">
                            {new Date(act.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600 leading-relaxed">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Status Modal */}
      {isStatusModalOpen && (
        <ChangeStatusModal
          currentStatus={order.status}
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={() => {
            showToast("Sipariş durumu güncellendi.");
            setIsStatusModalOpen(false);
            loadData();
          }}
          orderId={order.id}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Add Payment Modal */}
      {isPaymentModalOpen && (
        <AddPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            showToast("Tahsilat başarıyla kaydedildi.");
            setIsPaymentModalOpen(false);
            loadData();
          }}
          order={order}
          tenantId={activeTenant?.id || ""}
        />
      )}
    </div>
  );
}

function ChangeStatusModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  orderId,
  currentStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  orderId: string;
  currentStatus: string;
}) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ApiClient.changeOrderStatus(
        orderId,
        {
          newStatus,
          notes: notes.trim() || undefined,
        },
        tenantId
      );

      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-6 text-xs shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-slate-100 border-b pb-4">
          <h3 className="font-bold text-base text-slate-900">
            Sipariş Durumunu Değiştir
          </h3>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Yeni Aşama / Durum *
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-bold text-slate-900 focus:outline-none"
              onChange={(e) => setNewStatus(e.target.value)}
              value={newStatus}
            >
              <option value="Draft">Taslak</option>
              <option value="PendingApproval">Onay Bekliyor</option>
              <option value="Confirmed">Onaylandı (Stoktan Düş)</option>
              <option value="Processing">Hazırlanıyor</option>
              <option value="Shipped">Kargoda / Yolda</option>
              <option value="Delivered">Teslim Edildi (Tamamlandı)</option>
              <option value="Cancelled">İptal Edildi (Stoğa İade Et)</option>
              <option value="Refunded">İade Edildi</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Açıklama / Durum Notu
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-none"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Müşteri arandı, sevkiyat yarın yola çıkacak..."
              rows={3}
              value={notes}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-slate-100 border-t pt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Güncelleniyor..." : "Durumu Güncelle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  order,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  order: OrderDetailDto;
}) {
  const [amount, setAmount] = useState(
    order.remainingAmount > 0 ? order.remainingAmount : 0
  );
  const [paymentMethod, setPaymentMethod] = useState(
    order.paymentMethod || "BankTransfer"
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.addOrderPayment(
        order.id,
        {
          amount: Number(amount),
          notes: notes.trim() || undefined,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
        },
        tenantId
      );

      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-6 text-xs shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-slate-100 border-b pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Tahsilat Kaydet
            </h3>
            <p className="max-w-xs truncate text-slate-500 text-xs">
              {order.orderNumber} - {order.customerName}
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Balance Strip */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-50/70 p-3">
          <span className="font-semibold text-emerald-900">
            Kalan Açık Bakiye:
          </span>
          <span className="font-extrabold text-emerald-700 text-sm">
            ₺
            {order.remainingAmount.toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Tahsil Edilen Tutar (₺) *
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-extrabold text-slate-900 text-sm focus:bg-white focus:outline-none"
              min="0.01"
              onChange={(e) =>
                setAmount(Number.parseFloat(e.target.value) || 0)
              }
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Ödeme Yöntemi
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-none"
              onChange={(e) => setPaymentMethod(e.target.value)}
              value={paymentMethod}
            >
              <option value="BankTransfer">Havale / EFT</option>
              <option value="CreditCard">Kredi Kartı</option>
              <option value="Cash">Nakit</option>
              <option value="Check">Çek / Senet</option>
              <option value="OpenAccount">Açık Hesap (Cari)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Dekont / İşlem Referans No
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-none"
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Örn: TR849000..."
              type="text"
              value={referenceNumber}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Tahsilat Notu
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-none"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Kalan bakiyenin ilk taksiti..."
              type="text"
              value={notes}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-slate-100 border-t pt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting || amount <= 0}
              type="submit"
            >
              {submitting ? "İşleniyor..." : "Tahsilatı Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
