"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Plus,
  Printer,
  ReceiptText,
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
    router.push(`/${tenantSlug}/orders/${orderId}/print?type=proforma`);
  };

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const handleCreateInvoice = useCallback(async () => {
    setIsCreatingInvoice(true);
    try {
      const res = await ApiClient.createInvoiceFromOrder(orderId, tenantSlug);
      if (res.success && res.data) {
        toast.success("Sipariş başarıyla faturalaştırıldı!");
        router.push(`/${tenantSlug}/invoices`);
      } else {
        toast.error(res.message || "Fatura oluşturulamadı.");
      }
    } catch {
      toast.error("Fatura oluşturulurken bir hata oluştu.");
    } finally {
      setIsCreatingInvoice(false);
    }
  }, [orderId, tenantSlug, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-border";
      case "PendingApproval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Processing":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Shipped":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Refunded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-border";
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "PartiallyPaid":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Refunded":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-border";
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
      <div className="flex h-96 items-center justify-center rounded-3xl border border-border bg-card shadow-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-medium text-xs text-muted-foreground">
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
    <PageContainer className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-zinc-600 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            href={`/${tenantSlug}/orders`}
            title="Siparişlere Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-base text-blue-600 dark:text-blue-400 shadow-xs dark:bg-zinc-800">
              <ShoppingCart className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl text-zinc-900 tracking-tight sm:text-2xl dark:text-zinc-100">
                  {order.orderNumber}
                </h1>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 font-bold text-3xs ${getStatusBadge(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 font-bold text-3xs ${getPaymentBadge(
                    order.paymentStatus
                  )}`}
                >
                  {getPaymentLabel(order.paymentStatus)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
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
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={handlePrint}
            title="Siparişi Yazdır / PDF"
            type="button"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Yazdır / Proforma</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 font-semibold text-blue-800 text-xs shadow-2xs transition-colors hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
            disabled={isCreatingInvoice}
            onClick={handleCreateInvoice}
            type="button"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            <span>
              {isCreatingInvoice
                ? "Faturalaştırılıyor..."
                : "Faturaya Dönüştür"}
            </span>
          </button>

          <PermissionGate permission="Orders.PaymentRecord">
            <button
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 font-semibold text-emerald-800 dark:text-emerald-300 text-xs shadow-2xs transition-colors hover:bg-emerald-100"
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
          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 text-xs shadow-xs">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              Sipariş Tutarı & Ödeme Özeti
            </h3>

            <div className="space-y-2 border-border border-b pb-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Ara Toplam:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  ₺
                  {order.subtotal.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex items-center justify-between font-medium text-rose-600 dark:text-rose-400">
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
                <span className="text-muted-foreground">
                  Hesaplanan KDV:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  ₺
                  {order.taxAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {order.shippingFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Kargo & Sevkiyat:
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
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
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                GENEL TOPLAM:
              </span>
              <span className="font-extrabold text-base text-blue-600 dark:text-blue-400">
                ₺
                {order.totalAmount.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Paid & Remaining */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 p-3 pt-2 dark:bg-zinc-800/50">
              <div>
                <span className="font-medium text-3xs text-muted-foreground uppercase">
                  Tahsil Edilen
                </span>
                <div className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  ₺
                  {order.paidAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div>
                <span className="font-medium text-3xs text-muted-foreground uppercase">
                  Kalan Bakiye
                </span>
                <div
                  className={`font-bold text-sm ${
                    order.remainingAmount > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  ₺
                  {order.remainingAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-1 text-2xs text-muted-foreground">
              <span>Ödeme Yöntemi:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {getPaymentMethodLabel(order.paymentMethod)}
              </span>
            </div>
          </div>

          {/* Card: Customer & Delivery Info */}
          <div className="space-y-3 rounded-3xl border border-border bg-card p-5 text-xs shadow-xs">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
              Müşteri & Sevkiyat Bilgileri
            </h3>

            <div className="space-y-2.5 text-zinc-600 dark:text-zinc-400">
              <div>
                <span className="block text-3xs text-muted-foreground">
                  Müşteri / Firma
                </span>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {order.customerName}
                </span>
              </div>

              {order.shippingAddress && (
                <div>
                  <span className="block text-3xs text-muted-foreground">
                    Teslimat Adresi
                  </span>
                  <p className="mt-0.5 rounded-xl bg-zinc-50 p-2.5 text-zinc-800 leading-relaxed dark:bg-zinc-800/50 dark:text-zinc-200">
                    {order.shippingAddress}
                  </p>
                </div>
              )}

              {order.billingAddress && (
                <div>
                  <span className="block text-3xs text-muted-foreground">
                    Fatura Adresi
                  </span>
                  <p className="mt-0.5 rounded-xl bg-zinc-50 p-2.5 text-zinc-800 leading-relaxed dark:bg-zinc-800/50 dark:text-zinc-200">
                    {order.billingAddress}
                  </p>
                </div>
              )}

              {(order.carrier || order.trackingNumber) && (
                <div className="space-y-1 rounded-2xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/50 dark:bg-cyan-950/60 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-900">
                    <Truck className="h-3.5 w-3.5 text-cyan-600" />
                    <span>Kargo & Takip</span>
                  </div>
                  {order.carrier && (
                    <div className="text-2xs text-cyan-800">
                      Taşıyıcı: {order.carrier}
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="font-bold font-mono text-2xs text-cyan-950">
                      Takip No: {order.trackingNumber}
                    </div>
                  )}
                </div>
              )}

              {order.notes && (
                <div>
                  <span className="block text-3xs text-muted-foreground">
                    Sipariş Notu
                  </span>
                  <p className="text-zinc-700 italic dark:text-zinc-300">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Views (Items, Payments, Timeline) (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/90">
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${ activeTab === "items" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
              onClick={() => setActiveTab("items")}
              type="button"
            >
              Sipariş Kalemleri ({order.items.length})
            </button>
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${ activeTab === "payments" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
              onClick={() => setActiveTab("payments")}
              type="button"
            >
              Tahsilat & Ödemeler ({order.payments.length})
            </button>
            <button
              className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${ activeTab === "timeline" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
              onClick={() => setActiveTab("timeline")}
              type="button"
            >
              Sipariş Geçmişi & Etkinlikler ({order.activities.length})
            </button>
          </div>

          {/* TAB 1: ORDER ITEMS TABLE */}
          {activeTab === "items" && (
            <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Sipariş Edilen Ürün ve Hizmetler
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <Table>
                  <TableHeader className="border-border bg-zinc-50 text-muted-foreground dark:bg-zinc-800/50">
                    <TableRow>
                      <TableHead className="px-3.5 py-3 h-auto">Kalem / Ürün</TableHead>
                      <TableHead className="px-3 py-3 text-center h-auto">Miktar</TableHead>
                      <TableHead className="px-3 py-3 text-right h-auto">Birim Fiyat</TableHead>
                      <TableHead className="px-3 py-3 text-center h-auto">KDV</TableHead>
                      <TableHead className="px-3 py-3 text-center h-auto">İndirim</TableHead>
                      <TableHead className="py-3 pr-4 pl-3 text-right h-auto">
                        Toplam Tutar
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {order.items.map((item) => (
                      <TableRow
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        key={item.id}
                      >
                        <TableCell className="px-3.5 py-3.5">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {item.productName}
                          </div>
                          {item.sku && (
                            <div className="font-mono text-3xs text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                          {item.optionsOrNotes && (
                            <div className="mt-0.5 text-3xs text-muted-foreground italic">
                              {item.optionsOrNotes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                          ₺
                          {item.unitPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-center text-zinc-600 dark:text-zinc-400">
                          %{item.taxRate}
                        </TableCell>
                        <TableCell className="px-3 py-3.5 text-center font-medium text-rose-600 dark:text-rose-400">
                          {item.discountRate > 0
                            ? `-%${item.discountRate}`
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3.5 pr-4 pl-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                          ₺
                          {item.totalPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS LIST */}
          {activeTab === "payments" && (
            <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
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
                <div className="rounded-2xl border border-border border-dashed p-8 text-center text-xs text-muted-foreground">
                  Bu sipariş için henüz tahsilat kaydedilmedi.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {order.payments.map((p) => (
                    <div
                      className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3.5 text-xs dark:bg-zinc-800/50"
                      key={p.id}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {getPaymentMethodLabel(p.paymentMethod)}
                          </div>
                          <div className="text-3xs text-muted-foreground">
                            {p.referenceNumber
                              ? `Dekont / Ref: ${p.referenceNumber}`
                              : "Referans girilmedi"}
                            {p.notes && ` • ${p.notes}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                          ₺
                          {p.amount.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-3xs text-muted-foreground">
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
            <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Sipariş Yaşam Döngüsü & Etkinlik Defteri
              </h4>

              {order.activities.length === 0 ? (
                <div className="rounded-2xl border border-border border-dashed p-8 text-center text-xs text-muted-foreground">
                  Etkinlik kaydı bulunmuyor.
                </div>
              ) : (
                <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-zinc-100 dark:bg-zinc-800">
                  {order.activities.map((act) => (
                    <div
                      className="relative flex items-start gap-3 text-xs"
                      key={act.id}
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white bg-card shadow-2xs ring-2 ring-zinc-100 dark:ring-zinc-800">
                        {act.activityType === "StatusChange" ? (
                          <RotateCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : act.activityType === "PaymentAdded" ? (
                          <Banknote className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                        )}
                      </div>

                      <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {act.title}
                          </span>
                          <span className="font-medium text-3xs text-muted-foreground">
                            {new Date(act.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 rounded-xl bg-zinc-50 p-2 text-2xs text-zinc-600 leading-relaxed dark:bg-zinc-800/50 dark:text-zinc-400">
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
    </PageContainer>
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
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
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
        toast.success("Sipariş durumu güncellendi.");
        onSuccess();
      } else {
        const errMsg =
          res.message || "Sipariş durumu güncellenirken bir hata oluştu.";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Sunucuyla iletişim kurulurken bir hata oluştu.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Sipariş Durumunu Değiştir
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-xs dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-1" required>
              Yeni Aşama / Durum
            </Label>
            <Select onValueChange={setNewStatus} value={newStatus}>
              <SelectTrigger className="h-10 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Taslak</SelectItem>
                <SelectItem value="PendingApproval">Onay Bekliyor</SelectItem>
                <SelectItem value="Confirmed">
                  Onaylandı (Stoktan Düş)
                </SelectItem>
                <SelectItem value="Processing">Hazırlanıyor</SelectItem>
                <SelectItem value="Shipped">Kargoda / Yolda</SelectItem>
                <SelectItem value="Delivered">
                  Teslim Edildi (Tamamlandı)
                </SelectItem>
                <SelectItem value="Cancelled">
                  İptal Edildi (Stoğa İade Et)
                </SelectItem>
                <SelectItem value="Refunded">İade Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1">Açıklama / Durum Notu</Label>
            <Textarea
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Müşteri arandı, sevkiyat yarın yola çıkacak..."
              rows={3}
              value={notes}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(
    order.remainingAmount > 0 ? order.remainingAmount : 0
  );
  const [paymentMethod, setPaymentMethod] = useState(
    order.paymentMethod || "BankTransfer"
  );
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOverpayment = amount > order.remainingAmount;

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      return;
    }

    setSubmitting(true);
    setFieldError(null);
    try {
      const isoDate = paymentDate
        ? new Date(paymentDate).toISOString()
        : new Date().toISOString();
      const res = await ApiClient.addOrderPayment(
        order.id,
        {
          amount: Number(amount),
          notes: notes.trim() || undefined,
          paymentDate: isoDate,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
        },
        tenantId
      );

      if (res.success) {
        toast.success("Tahsilat başarıyla kaydedildi.");
        onSuccess();
      } else {
        const msg = res.message || "Tahsilat kaydedilemedi.";
        const isRefError =
          msg.toLowerCase().includes("reference") ||
          msg.toLowerCase().includes("referans") ||
          res.errorCode === "Conflict" ||
          res.errorCode === "Duplicate";
        if (isRefError) {
          setFieldError(msg);
        }
        toast.error(msg);
      }
    } catch {
      toast.error("Tahsilat kaydedilirken hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-4">
          <div>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Tahsilat Kaydet
            </DialogTitle>
            <p className="max-w-xs truncate text-xs text-muted-foreground">
              {order.orderNumber} - {order.customerName}
            </p>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* Balance Strip */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/60 p-3">
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
            <Label className="mb-1" required>
              Tahsil Edilen Tutar (₺)
            </Label>
            <NumberInput
              min={0.01}
              onChange={(val) => setAmount(val ?? 0)}
              prefix="₺"
              required
              step={0.01}
              value={amount}
            />
          </div>

          {isOverpayment && (
            <p className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-3 py-2 font-semibold text-rose-700 dark:text-rose-300 text-xs">
              ⚠️ Tutar kalan bakiyeyi aşıyor (₺
              {order.remainingAmount.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}
              ). Fazla ödeme kaydedilemez.
            </p>
          )}

          <div>
            <Label className="mb-1" required>
              Ödeme Yöntemi
            </Label>
            <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BankTransfer">Havale / EFT</SelectItem>
                <SelectItem value="CreditCard">Kredi Kartı</SelectItem>
                <SelectItem value="Cash">Nakit</SelectItem>
                <SelectItem value="Check">Çek / Senet</SelectItem>
                <SelectItem value="OpenAccount">Açık Hesap (Cari)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1" required>
              Ödeme Tarihi
            </Label>
            <DatePicker
              onChange={setPaymentDate}
              placeholder="Ödeme tarihi seçin"
              value={paymentDate}
            />
          </div>

          <div>
            <Label className="mb-1">Dekont / İşlem Referans No</Label>
            <Input
              error={fieldError || undefined}
              onChange={(e) => {
                setReferenceNumber(e.target.value);
                setFieldError(null);
              }}
              placeholder="Örn: TR849000..."
              value={referenceNumber}
            />
          </div>

          <div>
            <Label className="mb-1">Tahsilat Notu</Label>
            <Input
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Kalan bakiyenin ilk taksiti..."
              value={notes}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting || amount <= 0 || isOverpayment}
              title={isOverpayment ? "Tutar kalan bakiyeyi aşamaz" : undefined}
              type="submit"
            >
              {submitting ? "İşleniyor..." : "Tahsilatı Kaydet"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
