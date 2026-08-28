"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  History,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CarrierDto,
  CreateCarrierPayload,
  CreateReturnShipmentPayload,
  CreateShipmentPayload,
  ReturnShipmentDto,
  ShipmentDto,
  ShippingStatsDto,
  UpdateReturnStatusPayload,
  UpdateShipmentStatusPayload,
} from "@/lib/api-client";
import { ApiClient } from "@/lib/api-client";

// Status Badges Configuration
interface StatusBadgeInfo {
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
}

const SHIPMENT_STATUS_CONFIG: Record<string, StatusBadgeInfo> = {
  Cancelled: {
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
    icon: X,
    label: "İptal Edildi",
    text: "text-slate-600 dark:text-zinc-400 dark:text-zinc-500",
  },
  Delivered: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    icon: CheckCircle2,
    label: "Teslim Edildi",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  Dispatched: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    icon: Send,
    label: "Kargoya Verildi",
    text: "text-blue-700 dark:text-blue-300",
  },
  FailedDelivery: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    icon: AlertCircle,
    label: "Teslim Edilemedi / Şubede",
    text: "text-rose-700 dark:text-rose-300",
  },
  InTransit: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    icon: Truck,
    label: "Dağıtımda / Yolda",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  Preparing: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    icon: Clock,
    label: "Hazırlanıyor (Paketleniyor)",
    text: "text-amber-700 dark:text-amber-300",
  },
};

const RETURN_STATUS_CONFIG: Record<string, StatusBadgeInfo> = {
  Inspected: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-800/60",
    icon: Shield,
    label: "Kalite Kontrolden Geçti",
    text: "text-teal-700 dark:text-teal-300",
  },
  InTransit: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800/60",
    icon: Truck,
    label: "Müşteriden Yolda",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  Received: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
    icon: PackageCheck,
    label: "Depoda Teslim Alındı",
    text: "text-blue-700 dark:text-blue-300",
  },
  Rejected: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
    icon: X,
    label: "İade Reddedildi",
    text: "text-rose-700 dark:text-rose-300",
  },
  Requested: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
    icon: Clock,
    label: "İade Talebi Alındı",
    text: "text-amber-700 dark:text-amber-300",
  },
  Restocked: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
    icon: CheckCircle2,
    label: "Stoka İade Edildi",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

const DEFAULT_SHIPMENT_STATUS: StatusBadgeInfo =
  SHIPMENT_STATUS_CONFIG.Preparing!;
const DEFAULT_RETURN_STATUS: StatusBadgeInfo = RETURN_STATUS_CONFIG.Requested!;

function getShipmentStatusConfig(status: string): StatusBadgeInfo {
  return SHIPMENT_STATUS_CONFIG[status] ?? DEFAULT_SHIPMENT_STATUS;
}

function getReturnStatusConfig(status: string): StatusBadgeInfo {
  return RETURN_STATUS_CONFIG[status] ?? DEFAULT_RETURN_STATUS;
}

export default function ShipmentsPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  // State
  const [activeTab, setActiveTab] = useState<
    "outbound" | "returns" | "carriers" | "analytics"
  >("outbound");
  const [isLoading, setIsLoading] = useState(true);
  const [shipments, setShipments] = useState<ShipmentDto[]>([]);
  const [returns, setReturns] = useState<ReturnShipmentDto[]>([]);
  const [carriers, setCarriers] = useState<CarrierDto[]>([]);
  const [stats, setStats] = useState<ShippingStatsDto | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCarrierFilter, setSelectedCarrierFilter] =
    useState<string>("ALL");

  // Modals
  const [isCreateShipmentModalOpen, setIsCreateShipmentModalOpen] =
    useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [selectedShipmentForStatus, setSelectedShipmentForStatus] =
    useState<ShipmentDto | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedShipmentForLabel, setSelectedShipmentForLabel] =
    useState<ShipmentDto | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedShipmentDetail, setSelectedShipmentDetail] =
    useState<ShipmentDto | null>(null);
  const [isCreateReturnModalOpen, setIsCreateReturnModalOpen] = useState(false);
  const [isUpdateReturnModalOpen, setIsUpdateReturnModalOpen] = useState(false);
  const [selectedReturnForStatus, setSelectedReturnForStatus] =
    useState<ReturnShipmentDto | null>(null);
  const [isCreateCarrierModalOpen, setIsCreateCarrierModalOpen] =
    useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [shipmentsRes, returnsRes, carriersRes, statsRes] =
        await Promise.all([
          ApiClient.getShipments({}, tenantSlug),
          ApiClient.getReturnShipments({}, tenantSlug),
          ApiClient.getShippingCarriers(false, tenantSlug),
          ApiClient.getShippingStats(tenantSlug),
        ]);

      if (shipmentsRes.success && shipmentsRes.data) {
        setShipments(shipmentsRes.data);
      }
      if (returnsRes.success && returnsRes.data) {
        setReturns(returnsRes.data);
      }
      if (carriersRes.success && carriersRes.data) {
        setCarriers(carriersRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      toast.error("Kargo ve sevkiyat verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Shipments
  const filteredShipments = useMemo(
    () =>
      shipments.filter((s) => {
        const matchesSearch =
          searchQuery === "" ||
          s.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.trackingNumber &&
            s.trackingNumber
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (s.orderNumber &&
            s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.recipientName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          selectedStatus === "ALL" || s.status === selectedStatus;
        const matchesCarrier =
          selectedCarrierFilter === "ALL" ||
          s.carrierId === selectedCarrierFilter;

        return matchesSearch && matchesStatus && matchesCarrier;
      }),
    [shipments, searchQuery, selectedStatus, selectedCarrierFilter]
  );

  // Filtered Returns
  const filteredReturns = useMemo(
    () =>
      returns.filter((r) => {
        const matchesSearch =
          searchQuery === "" ||
          r.returnCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.trackingNumber &&
            r.trackingNumber
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reason.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          selectedStatus === "ALL" || r.status === selectedStatus;

        return matchesSearch && matchesStatus;
      }),
    [returns, searchQuery, selectedStatus]
  );

  const [confirmDialog, setConfirmDialog] = useState<{
    cancelText?: string;
    confirmText?: string;
    description: string;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    open: boolean;
    title: string;
    variant?: "destructive" | "warning" | "default";
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label = "Metin") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} panoya kopyalandı.`);
  };

  // Delete Handlers
  const handleDeleteShipment = (id: string, shipmentNumber: string) => {
    setConfirmDialog({
      confirmText: "Evet, Kargoyu Sil",
      description: `${shipmentNumber} numaralı kargo sevkiyat kaydını, içerdiği kalemleri ve tüm hareket geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await ApiClient.deleteShipment(id, tenantSlug);
          if (res.success) {
            toast.success(`${shipmentNumber} kargo kaydı başarıyla silindi.`);
            if (selectedShipmentDetail?.id === id) {
              setIsDetailDrawerOpen(false);
              setSelectedShipmentDetail(null);
            }
            await loadData();
          } else {
            toast.error(res.message || "Kargo kaydı silinemedi.");
          }
        } catch {
          toast.error("Kargo silinirken bir hata meydana geldi.");
        } finally {
          setConfirmDialog((prev) => ({
            ...prev,
            loading: false,
            open: false,
          }));
        }
      },
      open: true,
      title: "Kargo Kaydını Sil",
      variant: "destructive",
    });
  };

  const handleDeleteReturn = (id: string, returnCode: string) => {
    setConfirmDialog({
      confirmText: "Evet, İade Talebini Sil",
      description: `${returnCode} numaralı iade talebini ve inceleme notlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await ApiClient.deleteReturnShipment(id, tenantSlug);
          if (res.success) {
            toast.success(`${returnCode} iade talebi başarıyla silindi.`);
            await loadData();
          } else {
            toast.error(res.message || "İade talebi silinemedi.");
          }
        } catch {
          toast.error("İade talebi silinirken hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({
            ...prev,
            loading: false,
            open: false,
          }));
        }
      },
      open: true,
      title: "İade Talebini Sil",
      variant: "destructive",
    });
  };

  const handleDeleteCarrier = (id: string, carrierName: string) => {
    setConfirmDialog({
      confirmText: "Evet, Kargo Firmasını Sil",
      description: `${carrierName} kargo firmasını silmek istediğinize emin misiniz? Bu firmaya bağlı aktif sevkiyatlar etkilenebilir.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await ApiClient.deleteShippingCarrier(id, tenantSlug);
          if (res.success) {
            toast.success(`${carrierName} kargo firması başarıyla silindi.`);
            await loadData();
          } else {
            toast.error(res.message || "Firma silinemedi.");
          }
        } catch {
          toast.error("Kargo firması silinirken hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({
            ...prev,
            loading: false,
            open: false,
          }));
        }
      },
      open: true,
      title: "Kargo Firmasını Sil",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-xl tracking-tight dark:text-foreground">
                Kargo & Sevkiyat Yönetimi
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
                Depo paketleme, kargo çıkışları, takip kodları, etiket basımı ve
                iade lojistiği
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-200"
            onClick={loadData}
            type="button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Yenile</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-200"
            onClick={() => setIsCreateReturnModalOpen(true)}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
            <span>İade Kargo Talebi</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700"
            onClick={() => setIsCreateShipmentModalOpen(true)}
            type="button"
          >
            <PackagePlus className="h-4 w-4" />
            <span>Yeni Kargo Paketi</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs dark:border-slate-800 dark:bg-card">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
            <span>Toplam Sevkiyat</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-slate-900 dark:text-foreground">
            {stats?.totalShipments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">Kayıtlı paket</div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs dark:border-slate-800 dark:bg-card">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
            <span>Hazırlanıyor</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-amber-600 dark:text-amber-400">
            {stats?.preparingCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">Depo masasında</div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs dark:border-slate-800 dark:bg-card">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
            <span>Dağıtımda / Yolda</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-indigo-600 dark:text-indigo-400">
            {stats?.inTransitCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Kurye / Taşıyıcıda
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs dark:border-slate-800 dark:bg-card">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
            <span>Bugün Teslim</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-emerald-600 dark:text-emerald-400">
            {stats?.deliveredTodayCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Başarılı teslimat
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs sm:col-span-1 dark:border-slate-800 dark:bg-card">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
            <span>Teslimat Başarısı</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-teal-600 dark:text-teal-400">
            %{stats?.deliverySuccessRatePercentage ?? 100}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {stats?.pendingReturnsCount ?? 0} bekleyen iade
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 border-b pb-px dark:border-slate-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "outbound"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          onClick={() => {
            setActiveTab("outbound");
            setSelectedStatus("ALL");
          }}
          type="button"
        >
          <Package className="h-4 w-4" />
          <span>Giden Kargolar (Sevkiyatlar)</span>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-bold text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {shipments.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "returns"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          onClick={() => {
            setActiveTab("returns");
            setSelectedStatus("ALL");
          }}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          <span>İade Kargolar (Tersine Lojistik)</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {returns.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "carriers"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("carriers")}
          type="button"
        >
          <Building2 className="h-4 w-4" />
          <span>Taşıyıcı Kargo Firmaları</span>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-bold text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {carriers.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "analytics"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("analytics")}
          type="button"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Lojistik Analitik</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* --- TAB 1: GİDEN KARGOLAR (OUTBOUND) --- */}
      {activeTab === "outbound" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-card">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 py-2 pr-4 pl-9 text-xs transition-colors placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/50 dark:focus:bg-slate-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gönderi no, takip no, sipariş, müşteri veya alıcı ara..."
                type="text"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute top-2.5 right-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs dark:border-slate-700 dark:bg-card dark:text-slate-200"
                onChange={(e) => setSelectedStatus(e.target.value)}
                value={selectedStatus}
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="Preparing">Hazırlanıyor</option>
                <option value="Dispatched">Kargoya Verildi</option>
                <option value="InTransit">Dağıtımda / Yolda</option>
                <option value="Delivered">Teslim Edildi</option>
                <option value="FailedDelivery">Teslim Edilemedi</option>
                <option value="Cancelled">İptal Edildi</option>
              </select>

              <select
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs dark:border-slate-700 dark:bg-card dark:text-slate-200"
                onChange={(e) => setSelectedCarrierFilter(e.target.value)}
                value={selectedCarrierFilter}
              >
                <option value="ALL">Tüm Taşıyıcılar</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xs dark:border-slate-800 dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-zinc-200 dark:border-zinc-800 border-b bg-zinc-50 dark:bg-zinc-800/50/75 font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-zinc-400 dark:text-zinc-500">
                    <th className="px-4 py-3.5">Gönderi No / Tarih</th>
                    <th className="px-4 py-3.5">Sipariş & Müşteri</th>
                    <th className="px-4 py-3.5">Taşıyıcı & Takip No</th>
                    <th className="px-4 py-3.5">Paket & Desi</th>
                    <th className="px-4 py-3.5">Alıcı & Adres</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5 text-right">Eylemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                          <span>Kargo gönderileri yükleniyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredShipments.length === 0 ? (
                    <tr>
                      <td
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PackageSearch className="h-8 w-8 text-slate-300 dark:text-zinc-600 dark:text-zinc-400" />
                          <p className="font-medium text-slate-600 dark:text-slate-300">
                            Kayıtlı kargo gönderisi bulunamadı.
                          </p>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            Filtreleri değiştirebilir veya yeni bir kargo paketi
                            oluşturabilirsiniz.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((s) => {
                      const statusConf = getShipmentStatusConfig(s.status);
                      const StatusIcon = statusConf.icon;

                      return (
                        <tr
                          className="transition-colors hover:bg-zinc-50 dark:bg-zinc-800/50/60 dark:hover:bg-slate-900/30"
                          key={s.id}
                        >
                          {/* 1. Shipment Number & Date */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-foreground">
                                {s.shipmentNumber}
                              </span>
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(s.createdAt).toLocaleDateString(
                                  "tr-TR",
                                  {
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </td>

                          {/* 2. Order & Customer */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-foreground">
                                {s.customerName}
                              </span>
                              {s.orderNumber ? (
                                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                                  {s.orderNumber}
                                </span>
                              ) : (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                  Doğrudan Sevkiyat
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Carrier & Tracking */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs dark:text-slate-200">
                                {s.carrierName || "Belirtilmedi"}
                              </span>
                              {s.trackingNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                    {s.trackingNumber}
                                  </span>
                                  <button
                                    className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"
                                    onClick={() =>
                                      copyToClipboard(
                                        s.trackingNumber!,
                                        "Takip No"
                                      )
                                    }
                                    title="Takip No Kopyala"
                                    type="button"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  {s.trackingUrl && (
                                    <a
                                      className="text-blue-600 hover:underline"
                                      href={s.trackingUrl}
                                      rel="noopener noreferrer"
                                      target="_blank"
                                      title="Kargo Takip Sayfası"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                                  Takip no girilmedi
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Package & Desi */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col text-[11px] text-slate-600 dark:text-slate-300">
                              <span>
                                {s.packageCount} Koli / Paket (
                                {s.items?.length || 0} Kalem Ürün)
                              </span>
                              <span className="text-zinc-400 dark:text-zinc-500">
                                {s.totalWeightKg} kg • {s.totalDesi} Desi
                              </span>
                            </div>
                          </td>

                          {/* 5. Recipient & Address */}
                          <td className="px-4 py-3.5">
                            <div className="flex max-w-[200px] flex-col">
                              <span className="font-medium text-slate-900 dark:text-foreground">
                                {s.recipientName}
                              </span>
                              <span
                                className="truncate text-[11px] text-slate-500 dark:text-zinc-400 dark:text-zinc-500"
                                title={s.recipientAddress}
                              >
                                {s.recipientCity
                                  ? `${s.recipientCity} / ${s.recipientDistrict}`
                                  : s.recipientAddress}
                              </span>
                            </div>
                          </td>

                          {/* 6. Status Badge */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px] ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConf.label}
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 text-zinc-600 dark:text-zinc-400 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300"
                                onClick={() => {
                                  setSelectedShipmentDetail(s);
                                  setIsDetailDrawerOpen(true);
                                }}
                                title="Detay & Geçmiş"
                                type="button"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Print Shipping Label */}
                              <button
                                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 text-zinc-600 dark:text-zinc-400 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-card dark:text-slate-300"
                                onClick={() => {
                                  setSelectedShipmentForLabel(s);
                                  setIsLabelModalOpen(true);
                                }}
                                title="Kargo Barkodu & Etiket Yazdır"
                                type="button"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>

                              {/* Advance Status */}
                              <button
                                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-[11px] text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
                                onClick={() => {
                                  setSelectedShipmentForStatus(s);
                                  setIsUpdateStatusModalOpen(true);
                                }}
                                type="button"
                              >
                                <Truck className="h-3 w-3" />
                                <span>Durum İlerlet</span>
                              </button>

                              {/* Delete Shipment */}
                              <button
                                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 text-rose-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-card dark:text-rose-400 dark:hover:bg-rose-950/40"
                                onClick={() =>
                                  handleDeleteShipment(s.id, s.shipmentNumber)
                                }
                                title="Kargo Kaydını Sil"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: İADE KARGOLAR (RETURNS) --- */}
      {activeTab === "returns" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-card">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 py-2 pr-4 pl-9 text-xs transition-colors placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/50 dark:focus:bg-slate-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İade kodu, müşteri veya iade sebebi ara..."
                type="text"
                value={searchQuery}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs dark:border-slate-700 dark:bg-card dark:text-slate-200"
                onChange={(e) => setSelectedStatus(e.target.value)}
                value={selectedStatus}
              >
                <option value="ALL">Tüm İade Durumları</option>
                <option value="Requested">Talep Alındı</option>
                <option value="InTransit">Müşteriden Yolda</option>
                <option value="Received">Depoda Teslim Alındı</option>
                <option value="Inspected">Kalite Kontrolden Geçti</option>
                <option value="Restocked">Stoka İade Edildi</option>
                <option value="Rejected">İade Reddedildi</option>
              </select>

              <button
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-amber-700"
                onClick={() => setIsCreateReturnModalOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>İade Talebi Ekle</span>
              </button>
            </div>
          </div>

          {/* Returns Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xs dark:border-slate-800 dark:bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-zinc-200 dark:border-zinc-800 border-b bg-zinc-50 dark:bg-zinc-800/50/75 font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-zinc-400 dark:text-zinc-500">
                    <th className="px-4 py-3.5">İade Kodu / Tarih</th>
                    <th className="px-4 py-3.5">Müşteri</th>
                    <th className="px-4 py-3.5">İade Sebebi</th>
                    <th className="px-4 py-3.5">Taşıyıcı & Takip No</th>
                    <th className="px-4 py-3.5">Kontrol & Notlar</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5 text-right">Eylemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                      </td>
                    </tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr>
                      <td
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCcw className="h-8 w-8 text-slate-300" />
                          <p className="font-medium text-slate-600 dark:text-slate-300">
                            Kayıtlı iade kargo talebi bulunamadı.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((r) => {
                      const retConf = getReturnStatusConfig(r.status);
                      const RetIcon = retConf.icon;

                      return (
                        <tr
                          className="transition-colors hover:bg-zinc-50 dark:bg-zinc-800/50/60 dark:hover:bg-slate-900/30"
                          key={r.id}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-slate-900 dark:text-foreground">
                                  {r.returnCode}
                                </span>
                                <button
                                  className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"
                                  onClick={() =>
                                    copyToClipboard(r.returnCode, "İade Kodu")
                                  }
                                  title="Kopyala"
                                  type="button"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(r.createdAt).toLocaleDateString(
                                  "tr-TR"
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-foreground">
                            {r.customerName}
                          </td>

                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                            {r.reason}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-col text-[11px]">
                              <span>{r.carrierName || "Taşıyıcı Yok"}</span>
                              <span className="font-mono text-zinc-400 dark:text-zinc-500">
                                {r.trackingNumber || "Takip No Yok"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                              {r.inspectionNotes || "Henüz kontrol edilmedi"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px] ${retConf.bg} ${retConf.text} ${retConf.border}`}
                            >
                              <RetIcon className="h-3 w-3" />
                              {retConf.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-[11px] text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300"
                                onClick={() => {
                                  setSelectedReturnForStatus(r);
                                  setIsUpdateReturnModalOpen(true);
                                }}
                                type="button"
                              >
                                <Check className="h-3 w-3" />
                                <span>Teslim Al & Kontrol</span>
                              </button>

                              <button
                                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 text-rose-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-card dark:text-rose-400 dark:hover:bg-rose-950/40"
                                onClick={() =>
                                  handleDeleteReturn(r.id, r.returnCode)
                                }
                                title="İade Talebini Sil"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: TAŞIYICILAR & ENTEGRASYONLAR (CARRIERS) --- */}
      {activeTab === "carriers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 dark:text-zinc-400 text-xs dark:text-muted-foreground">
              Anlaşmalı kargo şirketleri, şube kodları ve canlı takip
              entegrasyon şablonları.
            </p>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
              onClick={() => setIsCreateCarrierModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Kargo Taşıyıcısı Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {carriers.map((c) => (
              <div
                className="relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all hover:border-blue-200 dark:border-slate-800 dark:bg-card"
                key={c.id}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-xs dark:bg-slate-800 dark:text-slate-200">
                        {c.code.slice(0, 3)}
                      </div>
                      <div>
                        <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
                          {c.name}
                        </h2>
                        <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {c.code}
                        </span>
                      </div>
                    </div>

                    {c.isDefault && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-[10px] text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        Varsayılan
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">Müşteri Hesap No:</span>
                      <span className="font-medium">
                        {c.customerAccountNumber || "Belirtilmedi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">Şube Kodu:</span>
                      <span className="font-medium">
                        {c.branchCode || "Merkez"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">
                        Aktif Yoldaki Kargo:
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {c.activeShipmentsCount} adet
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
                  <span className="block max-w-[200px] truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                    {c.trackingUrlTemplate || "Manuel takip bağlantısı"}
                  </span>
                  <button
                    className="rounded-lg p-1 text-zinc-400 dark:text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    onClick={() => handleDeleteCarrier(c.id, c.name)}
                    title="Kargo Firmasını Sil"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: LOJİSTİK ANALİTİK (ANALYTICS) --- */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Delivery Success Metric */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-2xs dark:border-slate-800 dark:bg-card">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
                Zamanında Teslimat Başarısı
              </h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
                Son 30 gündeki başarılı teslim edilen paket oranı
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-bold text-4xl text-teal-600 dark:text-teal-400">
                  %{stats?.deliverySuccessRatePercentage ?? 100}
                </span>
                <span className="font-semibold text-emerald-600 text-xs">
                  SLA Hedefi: %95
                </span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-teal-500"
                  style={{
                    width: `${stats?.deliverySuccessRatePercentage ?? 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Carrier Distribution */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-2xs dark:border-slate-800 dark:bg-card">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
                Taşıyıcı Bazlı Kargo Dağılımı
              </h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
                Aktif sevkiyatlarda kargo şirketi payları
              </p>
              <div className="mt-4 space-y-2.5">
                {carriers.slice(0, 4).map((c) => (
                  <div className="space-y-1" key={c.id}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {c.name}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {c.activeShipmentsCount} paket
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${Math.min(100, c.activeShipmentsCount * 20)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Rate Metric */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-2xs dark:border-slate-800 dark:bg-card">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
                İade & Tersine Lojistik Oranı
              </h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
                Toplam kargo hacmine oranla dönen paketler
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-bold text-4xl text-amber-600 dark:text-amber-400">
                  {returns.length}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 text-xs">Toplam İade</span>
              </div>
              <div className="mt-4 rounded-xl bg-amber-50/50 p-3 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Müşteri memnuniyetini artırmak için iade kalite kontrollerini 24
                saat içinde tamamlayınız.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: YENİ KARGO PAKETİ OLUŞTUR (CREATE SHIPMENT) --- */}
      {isCreateShipmentModalOpen && (
        <CreateShipmentModal
          carriers={carriers}
          onClose={() => setIsCreateShipmentModalOpen(false)}
          onSuccess={() => {
            setIsCreateShipmentModalOpen(false);
            loadData();
          }}
          tenantSlug={tenantSlug}
        />
      )}

      {/* --- MODAL 2: KARGO DURUMU İLERLET (UPDATE STATUS) --- */}
      {isUpdateStatusModalOpen && selectedShipmentForStatus && (
        <UpdateStatusModal
          carriers={carriers}
          onClose={() => {
            setIsUpdateStatusModalOpen(false);
            setSelectedShipmentForStatus(null);
          }}
          onSuccess={() => {
            setIsUpdateStatusModalOpen(false);
            setSelectedShipmentForStatus(null);
            loadData();
          }}
          shipment={selectedShipmentForStatus}
          tenantSlug={tenantSlug}
        />
      )}

      {/* --- MODAL 3: YAZDIRILABİLİR BARKOD & SEVK ETİKETİ (PRINT LABEL) --- */}
      {isLabelModalOpen && selectedShipmentForLabel && (
        <PrintLabelModal
          onClose={() => {
            setIsLabelModalOpen(false);
            setSelectedShipmentForLabel(null);
          }}
          shipment={selectedShipmentForLabel}
        />
      )}

      {/* --- DRAWER 4: GÖNDERİ DETAYI & HAREKET TARİHÇESİ (DETAIL DRAWER) --- */}
      {isDetailDrawerOpen && selectedShipmentDetail && (
        <ShipmentDetailDrawer
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setSelectedShipmentDetail(null);
          }}
          onDelete={() => {
            handleDeleteShipment(
              selectedShipmentDetail.id,
              selectedShipmentDetail.shipmentNumber
            );
          }}
          onPrintLabel={() => {
            setSelectedShipmentForLabel(selectedShipmentDetail);
            setIsLabelModalOpen(true);
          }}
          shipment={selectedShipmentDetail}
        />
      )}

      {/* --- MODAL 5: YENİ İADE TALEBİ OLUŞTUR (CREATE RETURN) --- */}
      {isCreateReturnModalOpen && (
        <CreateReturnModal
          carriers={carriers}
          onClose={() => setIsCreateReturnModalOpen(false)}
          onSuccess={() => {
            setIsCreateReturnModalOpen(false);
            loadData();
          }}
          tenantSlug={tenantSlug}
        />
      )}

      {/* --- MODAL 6: İADE TESLİM AL & KONTROL (UPDATE RETURN STATUS) --- */}
      {isUpdateReturnModalOpen && selectedReturnForStatus && (
        <UpdateReturnStatusModal
          onClose={() => {
            setIsUpdateReturnModalOpen(false);
            setSelectedReturnForStatus(null);
          }}
          onSuccess={() => {
            setIsUpdateReturnModalOpen(false);
            setSelectedReturnForStatus(null);
            loadData();
          }}
          returnShipment={selectedReturnForStatus}
          tenantSlug={tenantSlug}
        />
      )}

      {/* --- MODAL 7: YENİ TAŞIYICI EKLE (CREATE CARRIER) --- */}
      {isCreateCarrierModalOpen && (
        <CreateCarrierModal
          onClose={() => setIsCreateCarrierModalOpen(false)}
          onSuccess={() => {
            setIsCreateCarrierModalOpen(false);
            loadData();
          }}
          tenantSlug={tenantSlug}
        />
      )}

      {/* --- CONFIRM DIALOG (STANDART ONAY MODALI) --- */}
      <ConfirmDialog
        cancelText={confirmDialog.cancelText}
        confirmText={confirmDialog.confirmText}
        description={confirmDialog.description}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 1: CreateShipmentModal
// ----------------------------------------------------------------------
function CreateShipmentModal({
  tenantSlug,
  carriers,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  carriers: CarrierDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [orderNumber, setOrderNumber] = useState("");
  const [carrierId, setCarrierId] = useState<string>(
    carriers.find((c) => c.isDefault)?.id || carriers[0]?.id || ""
  );
  const [trackingNumber, setTrackingNumber] = useState("");
  const [packageCount, setPackageCount] = useState(1);
  const [totalWeightKg, setTotalWeightKg] = useState(1.5);
  const [totalDesi, setTotalDesi] = useState(2.0);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("İstanbul");
  const [recipientDistrict, setRecipientDistrict] = useState("Kadıköy");
  const [items, setItems] = useState<
    { productName: string; quantity: number; sku?: string }[]
  >([{ productName: "Standart Ürün Paketi", quantity: 1, sku: "PRD-01" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { productName: "", quantity: 1, sku: `PRD-${prev.length + 1}` },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(customerName && recipientName && recipientAddress)) {
      toast.error(
        "Lütfen müşteri adı, alıcı adı ve adres bilgilerini giriniz."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateShipmentPayload = {
        carrierId: carrierId || undefined,
        customerId,
        customerName,
        items: items.filter((i) => i.productName.trim().length > 0),
        orderNumber: orderNumber || undefined,
        packageCount: Number(packageCount),
        recipientAddress,
        recipientCity,
        recipientDistrict,
        recipientName,
        recipientPhone,
        totalDesi: Number(totalDesi),
        totalWeightKg: Number(totalWeightKg),
        trackingNumber: trackingNumber || undefined,
      };

      const res = await ApiClient.createShipment(payload, tenantSlug);
      if (res.success) {
        toast.success("Kargo paketi ve sevk kaydı başarıyla oluşturuldu.");
        onSuccess();
      } else {
        toast.error(res.message || "Kargo paketi oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl dark:border-slate-800 dark:bg-card">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <PackagePlus className="h-4 w-4" />
            </div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              Yeni Kargo Paketi & Sevkiyat Oluştur
            </h2>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          {/* Section: Customer & Order Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-customer-name"
              >
                Müşteri / Firma Adı *
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-customer-name"
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Acme Lojistik A.Ş."
                required
                type="text"
                value={customerName}
              />
            </div>

            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-order-number"
              >
                Sipariş No (Opsiyonel)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-order-number"
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Örn: ORD-202608-0012"
                type="text"
                value={orderNumber}
              />
            </div>
          </div>

          {/* Section: Carrier & Tracking */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-carrier"
              >
                Taşıyıcı Kargo Firması
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-carrier"
                onChange={(e) => setCarrierId(e.target.value)}
                value={carrierId}
              >
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isDefault ? "(Varsayılan)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-tracking-number"
              >
                Kargo Takip No (Opsiyonel)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-tracking-number"
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Örn: 99882177410"
                type="text"
                value={trackingNumber}
              />
            </div>
          </div>

          {/* Section: Package Specs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-package-count"
              >
                Koli / Paket Sayısı
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-package-count"
                min="1"
                onChange={(e) => setPackageCount(Number(e.target.value))}
                type="number"
                value={packageCount}
              />
            </div>
            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-total-weight"
              >
                Ağırlık (kg)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-total-weight"
                min="0.1"
                onChange={(e) => setTotalWeightKg(Number(e.target.value))}
                step="0.1"
                type="number"
                value={totalWeightKg}
              />
            </div>
            <div>
              <label
                className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
                htmlFor="new-shipment-total-desi"
              >
                Hacim (Desi)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-total-desi"
                min="0.1"
                onChange={(e) => setTotalDesi(Number(e.target.value))}
                step="0.1"
                type="number"
                value={totalDesi}
              />
            </div>
          </div>

          {/* Section: Recipient & Address */}
          <div className="space-y-3 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs dark:text-foreground">
              Alıcı ve Teslimat Adresi
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                  htmlFor="new-shipment-recipient-name"
                >
                  Alıcı Kişi / Yetkili *
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  id="new-shipment-recipient-name"
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  type="text"
                  value={recipientName}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                  htmlFor="new-shipment-recipient-phone"
                >
                  Alıcı Telefon No
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  id="new-shipment-recipient-phone"
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="0532 000 00 00"
                  type="text"
                  value={recipientPhone}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                htmlFor="new-shipment-recipient-address"
              >
                Açık Adres *
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="new-shipment-recipient-address"
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Mahalle, Cadde, Sokak, No, Daire..."
                required
                rows={2}
                value={recipientAddress}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                  htmlFor="new-shipment-recipient-city"
                >
                  İl
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  id="new-shipment-recipient-city"
                  onChange={(e) => setRecipientCity(e.target.value)}
                  type="text"
                  value={recipientCity}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                  htmlFor="new-shipment-recipient-district"
                >
                  İlçe
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  id="new-shipment-recipient-district"
                  onChange={(e) => setRecipientDistrict(e.target.value)}
                  type="text"
                  value={recipientDistrict}
                />
              </div>
            </div>
          </div>

          {/* Section: Items List */}
          <div className="space-y-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs dark:text-foreground">
                Paket İçeriği (Ürün Kalemleri)
              </h3>
              <button
                className="flex items-center gap-1 font-semibold text-[11px] text-blue-600 hover:underline"
                onClick={addItemRow}
                type="button"
              >
                <Plus className="h-3 w-3" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            {items.map((it, idx) => (
              <div
                className="flex items-center gap-2"
                key={`shipment-item-${idx}-${it.sku || "row"}`}
              >
                <input
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, productName: val } : item
                      )
                    );
                  }}
                  placeholder="Ürün adı"
                  type="text"
                  value={it.productName}
                />
                <input
                  className="w-20 rounded-xl border border-zinc-200 dark:border-zinc-800 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  min="1"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setItems((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, quantity: val } : item
                      )
                    );
                  }}
                  placeholder="Adet"
                  type="number"
                  value={it.quantity}
                />
                {items.length > 1 && (
                  <button
                    className="p-1.5 text-rose-500 hover:text-rose-700"
                    onClick={() => removeItemRow(idx)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-zinc-100 dark:border-zinc-800 border-t pt-4 dark:border-slate-800">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Kargo Paketini Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 2: UpdateStatusModal
// ----------------------------------------------------------------------
function UpdateStatusModal({
  tenantSlug,
  shipment,
  carriers,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  shipment: ShipmentDto;
  carriers: CarrierDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<string>(shipment.status);
  const [location, setLocation] = useState("Merkez Depo");
  const [description, setDescription] = useState("");
  const [trackingNumber, setTrackingNumber] = useState(
    shipment.trackingNumber || ""
  );
  const [carrierId, setCarrierId] = useState(shipment.carrierId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // If tracking updated
      if (
        trackingNumber !== shipment.trackingNumber ||
        carrierId !== shipment.carrierId
      ) {
        await ApiClient.updateShipmentTracking(
          shipment.id,
          {
            carrierId: carrierId || undefined,
            trackingNumber: trackingNumber || undefined,
          },
          tenantSlug
        );
      }

      // Update status
      const payload: UpdateShipmentStatusPayload = {
        description: description || undefined,
        location,
        status,
      };

      const res = await ApiClient.updateShipmentStatus(
        shipment.id,
        payload,
        tenantSlug
      );
      if (res.success) {
        toast.success("Kargo durumu başarıyla güncellendi.");
        onSuccess();
      } else {
        toast.error(res.message || "Durum güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl dark:border-slate-800 dark:bg-card">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-3 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              Kargo Durumunu İlerlet
            </h2>
            <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              {shipment.shipmentNumber}
            </span>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-status-select"
            >
              Yeni Kargo Durumu
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900"
              id="update-status-select"
              onChange={(e) => setStatus(e.target.value)}
              value={status}
            >
              <option value="Preparing">Hazırlanıyor (Paketleniyor)</option>
              <option value="Dispatched">Kargoya Verildi / Çıktı</option>
              <option value="InTransit">Dağıtımda / Yolda</option>
              <option value="Delivered">Teslim Edildi</option>
              <option value="FailedDelivery">Teslim Edilemedi / Şubede</option>
              <option value="Cancelled">İptal Edildi</option>
            </select>
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-status-tracking-number"
            >
              Kargo Takip No
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              id="update-status-tracking-number"
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Örn: 99882177410"
              type="text"
              value={trackingNumber}
            />
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-status-location"
            >
              Lokasyon / Şube
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="update-status-location"
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Kadıköy Dağıtım Şubesi"
              type="text"
              value={location}
            />
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-status-description"
            >
              Açıklama / Durum Notu
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="update-status-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Kurye dağıtıma çıktı, tahmini teslim 14:00..."
              rows={2}
              value={description}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>Durumu Güncelle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 3: PrintLabelModal (Termal Kargo Sevk Barkod Etiketi)
// ----------------------------------------------------------------------
function PrintLabelModal({
  shipment,
  onClose,
}: {
  shipment: ShipmentDto;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[95vh] w-full max-w-xl flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl dark:border-slate-800 dark:bg-card">
        {/* Header (No print) */}
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              Kargo Sevk Etiketi & Barkod Önizleme
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
              onClick={handlePrint}
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Yazdır (A6 / Termal)</span>
            </button>
            <button
              className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="overflow-y-auto p-6">
          <div
            className="rounded-2xl border-2 border-slate-900 bg-white dark:bg-zinc-900 p-6 text-zinc-900 dark:text-zinc-100 shadow-sm"
            id="printable-shipping-label"
          >
            {/* Top Bar: Carrier & Code */}
            <div className="flex items-center justify-between border-slate-900 border-b-2 pb-3">
              <div>
                <span className="font-black text-xl tracking-tight">
                  {shipment.carrierName || "STANDART KARGO"}
                </span>
                <span className="block text-[10px] text-zinc-600 dark:text-zinc-400 uppercase">
                  SEVKİYAT İRSALİYE ETİKETİ
                </span>
              </div>
              <div className="text-right font-bold font-mono text-xs">
                <div>PAKET: {shipment.packageCount} KOLİ</div>
                <div>
                  DESİ: {shipment.totalDesi} | {shipment.totalWeightKg} KG
                </div>
              </div>
            </div>

            {/* Barcode Graphic Simulation */}
            <div className="my-4 flex flex-col items-center justify-center border-slate-900 border-b-2 py-3">
              <div className="flex h-14 w-64 items-center justify-center bg-slate-950 font-black font-mono text-white text-xs tracking-widest">
                ||| | |||| || ||| |||| | ||| ||||
              </div>
              <span className="mt-1 font-bold font-mono text-xs tracking-wider">
                {shipment.trackingNumber || shipment.shipmentNumber}
              </span>
            </div>

            {/* Sender & Recipient Box */}
            <div className="grid grid-cols-2 gap-4 border-slate-900 border-b-2 pb-4 text-xs">
              {/* Sender */}
              <div className="border-zinc-200 dark:border-zinc-800 border-r pr-3">
                <span className="block font-bold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  GÖNDERİCİ:
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  CRM Monorepo Lojistik Deposu
                </span>
                <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-tight">
                  İkitelli OSB Mah. Sanayi Cad. No: 42
                  <br />
                  Başakşehir / İSTANBUL
                </p>
                <span className="mt-1 block text-[10px] text-zinc-500 dark:text-zinc-400">
                  Tel: 0850 000 00 00
                </span>
              </div>

              {/* Recipient */}
              <div className="pl-1">
                <span className="block font-bold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  ALICI (TESLİMAT):
                </span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {shipment.recipientName}
                </span>
                <p className="mt-0.5 text-zinc-800 dark:text-zinc-200 text-xs leading-tight">
                  {shipment.recipientAddress}
                </p>
                <span className="font-bold text-xs">
                  {shipment.recipientDistrict} / {shipment.recipientCity}
                </span>
                {shipment.recipientPhone && (
                  <span className="mt-1 block font-mono text-xs">
                    Tel: {shipment.recipientPhone}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
              <div>
                <span>SİPARİŞ NO: {shipment.orderNumber || "MANUEL"}</span>
                <span className="ml-3">REF: {shipment.shipmentNumber}</span>
              </div>
              <div>
                <span>
                  TARİH:{" "}
                  {new Date(shipment.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DRAWER 4: ShipmentDetailDrawer
// ----------------------------------------------------------------------
function ShipmentDetailDrawer({
  shipment,
  onClose,
  onPrintLabel,
  onDelete,
}: {
  shipment: ShipmentDto;
  onClose: () => void;
  onPrintLabel: () => void;
  onDelete?: () => void;
}) {
  const statusConf = getShipmentStatusConfig(shipment.status);
  const StatusIcon = statusConf.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-lg flex-col bg-white dark:bg-zinc-900 shadow-2xl dark:bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b p-6 dark:border-slate-800">
          <div>
            <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              {shipment.shipmentNumber}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-[10px] ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
              >
                <StatusIcon className="h-2.5 w-2.5" />
                {statusConf.label}
              </span>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-4 dark:bg-slate-900/60">
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Müşteri</span>
              <span className="block font-semibold text-slate-800 dark:text-slate-200">
                {shipment.customerName}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Taşıyıcı</span>
              <span className="block font-semibold text-slate-800 dark:text-slate-200">
                {shipment.carrierName || "Belirtilmedi"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Takip No</span>
              <span className="block font-mono font-semibold text-blue-600 dark:text-blue-400">
                {shipment.trackingNumber || "Yok"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Paket & Desi</span>
              <span className="block font-semibold text-slate-800 dark:text-slate-200">
                {shipment.packageCount} Koli • {shipment.totalDesi} Desi
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 p-4 dark:border-slate-800">
            <h3 className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs dark:text-foreground">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>Teslimat Adresi & Alıcı</span>
            </h3>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {shipment.recipientName}{" "}
              {shipment.recipientPhone && `(${shipment.recipientPhone})`}
            </p>
            <p className="text-slate-600 dark:text-zinc-400 dark:text-zinc-500">
              {shipment.recipientAddress}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              {shipment.recipientDistrict} / {shipment.recipientCity}
            </p>
          </div>

          {/* Items in Package */}
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs dark:text-foreground">
              Paket İçeriği ({shipment.items?.length || 0} Kalem)
            </h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 dark:divide-slate-800 dark:border-slate-800">
              {shipment.items?.map((it) => (
                <div
                  className="flex items-center justify-between p-3"
                  key={it.id}
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {it.productName}
                    </span>
                    {it.sku && (
                      <span className="block font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        {it.sku}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-foreground">
                    {it.quantity} {it.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs dark:text-foreground">
              <History className="h-3.5 w-3.5 text-indigo-600" />
              <span>Kargo Hareket & Durum Tarihçesi</span>
            </h3>
            <div className="ml-2 space-y-3 border-zinc-200 dark:border-zinc-800 border-l-2 pl-4 dark:border-slate-800">
              {shipment.statusHistories?.map((h) => (
                <div className="relative" key={h.id}>
                  <div className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-card" />
                  <span className="font-bold text-slate-900 dark:text-foreground">
                    {h.status}
                  </span>
                  <span className="ml-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                    {new Date(h.createdAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  {h.location && (
                    <span className="block text-[11px] text-slate-600 dark:text-slate-300">
                      Lokasyon: {h.location}
                    </span>
                  )}
                  {h.description && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {h.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-zinc-100 dark:border-zinc-800 border-t p-4 dark:border-slate-800">
          {onDelete && (
            <button
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-semibold text-rose-700 text-xs shadow-2xs hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              onClick={onDelete}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              <span>Kargoyu Sil</span>
            </button>
          )}
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
            onClick={onPrintLabel}
            type="button"
          >
            <Printer className="h-4 w-4" />
            <span>Kargo Barkod Etiketi Yazdır</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 5: CreateReturnModal
// ----------------------------------------------------------------------
function CreateReturnModal({
  tenantSlug,
  carriers,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  carriers: CarrierDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [carrierId, setCarrierId] = useState(carriers[0]?.id || "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [reason, setReason] = useState("Hasarlı / Kusurlu Ürün");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(customerName && reason)) {
      toast.error("Lütfen müşteri adı ve iade sebebini giriniz.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateReturnShipmentPayload = {
        carrierId: carrierId || undefined,
        customerId,
        customerName,
        reason,
        trackingNumber: trackingNumber || undefined,
      };

      const res = await ApiClient.createReturnShipment(payload, tenantSlug);
      if (res.success) {
        toast.success(
          `İade talebi oluşturuldu. İade Kodu: ${res.data?.returnCode}`
        );
        onSuccess();
      } else {
        toast.error(res.message || "İade talebi oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl dark:border-slate-800 dark:bg-card">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              Yeni İade Kargo Talebi Başlat
            </h2>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-return-customer-name"
            >
              Müşteri Adı *
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-return-customer-name"
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Örn: Mehmet Öz"
              required
              type="text"
              value={customerName}
            />
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-return-reason"
            >
              İade Sebebi *
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-return-reason"
              onChange={(e) => setReason(e.target.value)}
              value={reason}
            >
              <option value="Hasarlı / Kusurlu Ürün">
                Hasarlı / Kusurlu Ürün
              </option>
              <option value="Yanlış Ürün Gönderimi">
                Yanlış Ürün Gönderimi
              </option>
              <option value="Cayma Hakkı / Beğenmeme">
                Cayma Hakkı / Beğenmeme
              </option>
              <option value="Beden / Ebat Değişimi">
                Beden / Ebat Değişimi
              </option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-return-carrier"
            >
              Taşıyıcı Kargo Firması
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-return-carrier"
              onChange={(e) => setCarrierId(e.target.value)}
              value={carrierId}
            >
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-return-tracking-number"
            >
              İade Kargo Takip No (Opsiyonel)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-return-tracking-number"
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Örn: RET-99120"
              type="text"
              value={trackingNumber}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-amber-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>İade Kodu Üret & Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 6: UpdateReturnStatusModal
// ----------------------------------------------------------------------
function UpdateReturnStatusModal({
  tenantSlug,
  returnShipment,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  returnShipment: ReturnShipmentDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState(returnShipment.status);
  const [inspectionNotes, setInspectionNotes] = useState(
    returnShipment.inspectionNotes || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: UpdateReturnStatusPayload = {
        inspectionNotes,
        status,
      };

      const res = await ApiClient.updateReturnStatus(
        returnShipment.id,
        payload,
        tenantSlug
      );
      if (res.success) {
        toast.success("İade kargo durumu başarıyla güncellendi.");
        onSuccess();
      } else {
        toast.error(res.message || "Durum güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl dark:border-slate-800 dark:bg-card">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-3 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              İade Kargo Kabul & Kontrol
            </h2>
            <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              {returnShipment.returnCode}
            </span>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-return-status-select"
            >
              İade Durumu
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="update-return-status-select"
              onChange={(e) => setStatus(e.target.value)}
              value={status}
            >
              <option value="Requested">Talep Alındı</option>
              <option value="InTransit">Müşteriden Yolda</option>
              <option value="Received">Depoda Teslim Alındı</option>
              <option value="Inspected">Kalite Kontrolden Geçti</option>
              <option value="Restocked">Stoka İade Edildi</option>
              <option value="Rejected">İade Reddedildi</option>
            </select>
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="update-return-inspection-notes"
            >
              Kalite Kontrol Notları & Açıklama
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="update-return-inspection-notes"
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Ürün ambalajı incelendi, hasar tespit edilmedi, stoka alındı..."
              rows={3}
              value={inspectionNotes}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-amber-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>Kontrolü Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL 7: CreateCarrierModal
// ----------------------------------------------------------------------
function CreateCarrierModal({
  tenantSlug,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [customerAccountNumber, setCustomerAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(code && name)) {
      toast.error("Lütfen firma kodu ve adını giriniz.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateCarrierPayload = {
        branchCode: branchCode || undefined,
        code,
        customerAccountNumber: customerAccountNumber || undefined,
        isDefault,
        name,
        trackingUrlTemplate: trackingUrlTemplate || undefined,
      };

      const res = await ApiClient.createShippingCarrier(payload, tenantSlug);
      if (res.success) {
        toast.success("Kargo taşıyıcısı başarıyla eklendi.");
        onSuccess();
      } else {
        toast.error(res.message || "Taşıyıcı eklenemedi.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl dark:border-slate-800 dark:bg-card">
        <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm dark:text-foreground">
              Yeni Taşıyıcı Kargo Firması Ekle
            </h2>
          </div>
          <button
            className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-carrier-name"
            >
              Kargo Firması Adı *
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-carrier-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: UPS Kargo"
              required
              type="text"
              value={name}
            />
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-carrier-code"
            >
              Firma Kodu (Büyük Harf) *
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs uppercase dark:border-slate-700 dark:bg-slate-900"
              id="create-carrier-code"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: UPS"
              required
              type="text"
              value={code}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                htmlFor="create-carrier-account-number"
              >
                Müşteri Hesap No
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="create-carrier-account-number"
                onChange={(e) => setCustomerAccountNumber(e.target.value)}
                placeholder="Örn: ACME-88"
                type="text"
                value={customerAccountNumber}
              />
            </div>
            <div>
              <label
                className="block text-[11px] text-zinc-500 dark:text-zinc-400"
                htmlFor="create-carrier-branch-code"
              >
                Şube Kodu
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                id="create-carrier-branch-code"
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="Örn: 3401"
                type="text"
                value={branchCode}
              />
            </div>
          </div>

          <div>
            <label
              className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-carrier-tracking-template"
            >
              Takip URL Şablonu
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              id="create-carrier-tracking-template"
              onChange={(e) => setTrackingUrlTemplate(e.target.value)}
              placeholder="https://ups.com/track?q={tracking_number}"
              type="text"
              value={trackingUrlTemplate}
            />
            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
              Takip numarası için <code>{"{tracking_number}"}</code>{" "}
              kullanabilirsiniz.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              checked={isDefault}
              className="h-4 w-4 rounded-sm text-blue-600"
              id="create-carrier-default-checkbox"
              onChange={(e) => setIsDefault(e.target.checked)}
              type="checkbox"
            />
            <label
              className="font-medium text-zinc-700 dark:text-zinc-300 text-xs dark:text-slate-300"
              htmlFor="create-carrier-default-checkbox"
            >
              Varsayılan Kargo Firması Yap
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-3 dark:border-slate-800">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>Taşıyıcıyı Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
