"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
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
    bg: "bg-zinc-100 dark:bg-zinc-800",
    border: "border-border",
    icon: X,
    label: "İptal Edildi",
    text: "text-zinc-600 dark:text-zinc-400",
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
    <PageContainer className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Kargo & Sevkiyat Yönetimi
              </h1>
              <p className="text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
                Depo paketleme, kargo çıkışları, takip kodları, etiket basımı ve
                iade lojistiği
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-300"
            onClick={loadData}
            type="button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Yenile</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:text-zinc-300"
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
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
            <span>Toplam Sevkiyat</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
            {stats?.totalShipments ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Kayıtlı paket
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
            <span>Hazırlanıyor</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-amber-600 dark:text-amber-400">
            {stats?.preparingCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Depo masasında
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
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

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
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

        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
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
      <div className="flex items-center gap-2 border-border border-b pb-px">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "outbound"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => {
            setActiveTab("outbound");
            setSelectedStatus("ALL");
          }}
          type="button"
        >
          <Package className="h-4 w-4" />
          <span>Giden Kargolar (Sevkiyatlar)</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {shipments.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "returns"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("carriers")}
          type="button"
        >
          <Building2 className="h-4 w-4" />
          <span>Taşıyıcı Kargo Firmaları</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {carriers.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium text-xs transition-colors ${
            activeTab === "analytics"
              ? "border-blue-600 font-semibold text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-border bg-zinc-50/50 py-2 pr-4 pl-9 text-xs transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-500 dark:focus:bg-zinc-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gönderi no, takip no, sipariş, müşteri veya alıcı ara..."
                type="text"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute top-2.5 right-3 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                onValueChange={(val) => setSelectedStatus(val)}
                value={selectedStatus}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                  <SelectItem value="Preparing">Hazırlanıyor</SelectItem>
                  <SelectItem value="Dispatched">Kargoya Verildi</SelectItem>
                  <SelectItem value="InTransit">Dağıtımda / Yolda</SelectItem>
                  <SelectItem value="Delivered">Teslim Edildi</SelectItem>
                  <SelectItem value="FailedDelivery">
                    Teslim Edilemedi
                  </SelectItem>
                  <SelectItem value="Cancelled">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(val) => setSelectedCarrierFilter(val)}
                value={selectedCarrierFilter}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Tüm Taşıyıcılar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Taşıyıcılar</SelectItem>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50 font-semibold text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <TableHead className="px-4 py-3.5 h-auto">Gönderi No / Tarih</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Sipariş & Müşteri</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Taşıyıcı & Takip No</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Paket & Desi</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Alıcı & Adres</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Durum</TableHead>
                    <TableHead className="px-4 py-3.5 text-right h-auto">Eylemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                          <span>Kargo gönderileri yükleniyor...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PackageSearch className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                          <p className="font-medium text-zinc-600 dark:text-zinc-300">
                            Kayıtlı kargo gönderisi bulunamadı.
                          </p>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            Filtreleri değiştirebilir veya yeni bir kargo paketi
                            oluşturabilirsiniz.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((s) => {
                      const statusConf = getShipmentStatusConfig(s.status);
                      const StatusIcon = statusConf.icon;

                      return (
                        <TableRow
                          className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          key={s.id}
                        >
                          {/* 1. Shipment Number & Date */}
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
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
                          </TableCell>

                          {/* 2. Order & Customer */}
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
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
                          </TableCell>

                          {/* 3. Carrier & Tracking */}
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
                                {s.carrierName || "Belirtilmedi"}
                              </span>
                              {s.trackingNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                                    {s.trackingNumber}
                                  </span>
                                  <button
                                    className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
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
                                <span className="text-[11px] text-zinc-400 italic dark:text-zinc-500">
                                  Takip no girilmedi
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 4. Package & Desi */}
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col text-[11px] text-zinc-600 dark:text-zinc-300">
                              <span>
                                {s.packageCount} Koli / Paket (
                                {s.items?.length || 0} Kalem Ürün)
                              </span>
                              <span className="text-zinc-400 dark:text-zinc-500">
                                {s.totalWeightKg} kg • {s.totalDesi} Desi
                              </span>
                            </div>
                          </TableCell>

                          {/* 5. Recipient & Address */}
                          <TableCell className="px-4 py-3.5">
                            <div className="flex max-w-[200px] flex-col">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {s.recipientName}
                              </span>
                              <span
                                className="truncate text-[11px] text-zinc-500 dark:text-zinc-400"
                                title={s.recipientAddress}
                              >
                                {s.recipientCity
                                  ? `${s.recipientCity} / ${s.recipientDistrict}`
                                  : s.recipientAddress}
                              </span>
                            </div>
                          </TableCell>

                          {/* 6. Status Badge */}
                          <TableCell className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px] ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConf.label}
                            </span>
                          </TableCell>

                          {/* 7. Actions */}
                          <TableCell className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                className="rounded-lg border border-border bg-card p-1.5 text-zinc-600 shadow-2xs hover:bg-zinc-50 dark:text-zinc-400"
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
                                className="rounded-lg border border-border bg-card p-1.5 text-zinc-600 shadow-2xs hover:bg-zinc-50 dark:text-zinc-400"
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
                                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-[11px] text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-950/60"
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
                                className="rounded-lg border border-border bg-card p-1.5 text-rose-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                onClick={() =>
                                  handleDeleteShipment(s.id, s.shipmentNumber)
                                }
                                title="Kargo Kaydını Sil"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: İADE KARGOLAR (RETURNS) --- */}
      {activeTab === "returns" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-border bg-zinc-50/50 py-2 pr-4 pl-9 text-xs transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-500 dark:focus:bg-zinc-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İade kodu, müşteri veya iade sebebi ara..."
                type="text"
                value={searchQuery}
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                onValueChange={(val) => setSelectedStatus(val)}
                value={selectedStatus}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Tüm İade Durumları" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm İade Durumları</SelectItem>
                  <SelectItem value="Requested">Talep Alındı</SelectItem>
                  <SelectItem value="InTransit">Müşteriden Yolda</SelectItem>
                  <SelectItem value="Received">Depoda Teslim Alındı</SelectItem>
                  <SelectItem value="Inspected">
                    Kalite Kontrolden Geçti
                  </SelectItem>
                  <SelectItem value="Restocked">Stoka İade Edildi</SelectItem>
                  <SelectItem value="Rejected">İade Reddedildi</SelectItem>
                </SelectContent>
              </Select>

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
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50 font-semibold text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <TableHead className="px-4 py-3.5 h-auto">İade Kodu / Tarih</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Müşteri</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">İade Sebebi</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Taşıyıcı & Takip No</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Kontrol & Notlar</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Durum</TableHead>
                    <TableHead className="px-4 py-3.5 text-right h-auto">Eylemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                      </TableCell>
                    </TableRow>
                  ) : filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCcw className="h-8 w-8 text-zinc-300" />
                          <p className="font-medium text-zinc-600 dark:text-zinc-300">
                            Kayıtlı iade kargo talebi bulunamadı.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturns.map((r) => {
                      const retConf = getReturnStatusConfig(r.status);
                      const RetIcon = retConf.icon;

                      return (
                        <TableRow
                          className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          key={r.id}
                        >
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                  {r.returnCode}
                                </span>
                                <button
                                  className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
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
                          </TableCell>

                          <TableCell className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {r.customerName}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
                            {r.reason}
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col text-[11px]">
                              <span>{r.carrierName || "Taşıyıcı Yok"}</span>
                              <span className="font-mono text-zinc-400 dark:text-zinc-500">
                                {r.trackingNumber || "Takip No Yok"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <span className="text-[11px] text-zinc-500 italic dark:text-zinc-400">
                              {r.inspectionNotes || "Henüz kontrol edilmedi"}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px] ${retConf.bg} ${retConf.text} ${retConf.border}`}
                            >
                              <RetIcon className="h-3 w-3" />
                              {retConf.label}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-[11px] text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/60"
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
                                className="rounded-lg border border-border bg-card p-1.5 text-rose-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                onClick={() =>
                                  handleDeleteReturn(r.id, r.returnCode)
                                }
                                title="İade Talebini Sil"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: TAŞIYICILAR & ENTEGRASYONLAR (CARRIERS) --- */}
      {activeTab === "carriers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
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
                className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-blue-200"
                key={c.id}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 font-bold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {c.code.slice(0, 3)}
                      </div>
                      <div>
                        <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
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

                  <div className="mt-4 space-y-2 border-border border-t pt-3 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">
                        Müşteri Hesap No:
                      </span>
                      <span className="font-medium">
                        {c.customerAccountNumber || "Belirtilmedi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">
                        Şube Kodu:
                      </span>
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

                <div className="mt-4 flex items-center justify-between border-border border-t pt-3">
                  <span className="block max-w-[200px] truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                    {c.trackingUrlTemplate || "Manuel takip bağlantısı"}
                  </span>
                  <button
                    className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
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
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Zamanında Teslimat Başarısı
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-teal-500"
                  style={{
                    width: `${stats?.deliverySuccessRatePercentage ?? 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Carrier Distribution */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Taşıyıcı Bazlı Kargo Dağılımı
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Aktif sevkiyatlarda kargo şirketi payları
              </p>
              <div className="mt-4 space-y-2.5">
                {carriers.slice(0, 4).map((c) => (
                  <div className="space-y-1" key={c.id}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {c.name}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {c.activeShipmentsCount} paket
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                İade & Tersine Lojistik Oranı
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Toplam kargo hacmine oranla dönen paketler
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-bold text-4xl text-amber-600 dark:text-amber-400">
                  {returns.length}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Toplam İade
                </span>
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
    </PageContainer>
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
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <PackagePlus className="h-4 w-4" />
            </div>
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Yeni Kargo Paketi & Sevkiyat Oluştur
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          {/* Section: Customer & Order Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-customer-name" required>
                Müşteri / Firma Adı
              </Label>
              <Input
                id="new-shipment-customer-name"
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Acme Lojistik A.Ş."
                required
                type="text"
                value={customerName}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-order-number">
                Sipariş No (Opsiyonel)
              </Label>
              <Input
                className="font-mono"
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
            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-carrier">
                Taşıyıcı Kargo Firması
              </Label>
              <Select
                onValueChange={(val) => setCarrierId(val)}
                value={carrierId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kargo Firması Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.isDefault ? "(Varsayılan)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-tracking-number">
                Kargo Takip No (Opsiyonel)
              </Label>
              <Input
                className="font-mono"
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
            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-package-count">
                Koli / Paket Sayısı
              </Label>
              <NumberInput
                min={1}
                onChange={(val) => setPackageCount(val || 1)}
                showStepper
                value={packageCount}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-total-weight">Ağırlık (kg)</Label>
              <NumberInput
                min={0.1}
                onChange={(val) => setTotalWeightKg(val || 0.1)}
                suffix="kg"
                value={totalWeightKg}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-total-desi">Hacim (Desi)</Label>
              <NumberInput
                min={0.1}
                onChange={(val) => setTotalDesi(val || 0.1)}
                suffix="desi"
                value={totalDesi}
              />
            </div>
          </div>

          {/* Section: Recipient & Address */}
          <div className="space-y-3 border-border border-t pt-3">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              Alıcı ve Teslimat Adresi
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-shipment-recipient-name" required>
                  Alıcı Kişi / Yetkili
                </Label>
                <Input
                  id="new-shipment-recipient-name"
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  type="text"
                  value={recipientName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-shipment-recipient-phone">
                  Alıcı Telefon No
                </Label>
                <Input
                  id="new-shipment-recipient-phone"
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="0532 000 00 00"
                  type="text"
                  value={recipientPhone}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-shipment-recipient-address" required>
                Açık Adres
              </Label>
              <textarea
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-hidden dark:text-zinc-100"
                id="new-shipment-recipient-address"
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Mahalle, Cadde, Sokak, No, Daire..."
                required
                rows={2}
                value={recipientAddress}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-shipment-recipient-city">İl</Label>
                <Input
                  id="new-shipment-recipient-city"
                  onChange={(e) => setRecipientCity(e.target.value)}
                  type="text"
                  value={recipientCity}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-shipment-recipient-district">İlçe</Label>
                <Input
                  id="new-shipment-recipient-district"
                  onChange={(e) => setRecipientDistrict(e.target.value)}
                  type="text"
                  value={recipientDistrict}
                />
              </div>
            </div>
          </div>

          {/* Section: Items List */}
          <div className="space-y-2 border-border border-t pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Paket İçeriği (Ürün Kalemleri)
              </h3>
              <button
                className="flex items-center gap-1 font-semibold text-[11px] text-blue-600 hover:underline dark:text-blue-400"
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
                <Input
                  className="flex-1"
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
                <div className="w-24">
                  <NumberInput
                    min={1}
                    onChange={(val) => {
                      const num = val || 1;
                      setItems((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, quantity: num } : item
                        )
                      );
                    }}
                    placeholder="Adet"
                    showStepper
                    value={it.quantity}
                  />
                </div>
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

          <div className="flex items-center justify-end gap-2.5 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Oluştur</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div>
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Kargo Durumunu İlerlet
            </DialogTitle>
            <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              {shipment.shipmentNumber}
            </span>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="update-status-select">Yeni Kargo Durumu</Label>
            <Select onValueChange={(val) => setStatus(val)} value={status}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Durum Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Preparing">
                  Hazırlanıyor (Paketleniyor)
                </SelectItem>
                <SelectItem value="Dispatched">
                  Kargoya Verildi / Çıktı
                </SelectItem>
                <SelectItem value="InTransit">Dağıtımda / Yolda</SelectItem>
                <SelectItem value="Delivered">Teslim Edildi</SelectItem>
                <SelectItem value="FailedDelivery">
                  Teslim Edilemedi / Şubede
                </SelectItem>
                <SelectItem value="Cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-status-tracking-number">
              Kargo Takip No
            </Label>
            <Input
              className="font-mono"
              id="update-status-tracking-number"
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Örn: 99882177410"
              type="text"
              value={trackingNumber}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-status-location">Lokasyon / Şube</Label>
            <Input
              id="update-status-location"
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Kadıköy Dağıtım Şubesi"
              type="text"
              value={location}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-status-description">
              Açıklama / Durum Notu
            </Label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-hidden dark:text-zinc-100"
              id="update-status-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Kurye dağıtıma çıktı, tahmini teslim 14:00..."
              rows={2}
              value={description}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-3.5 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      </DialogContent>
    </Dialog>
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
        className="flex max-h-[95vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        {/* Header (No print) */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-blue-600" />
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Kargo Sevk Etiketi & Barkod Önizleme
            </DialogTitle>
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
            <DialogClose asChild>
              <button
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="overflow-y-auto p-6">
          <div
            className="rounded-2xl border-2 border-zinc-900 bg-card p-6 text-zinc-900 shadow-sm dark:border-zinc-700 dark:text-zinc-100"
            id="printable-shipping-label"
          >
            {/* Top Bar: Carrier & Code */}
            <div className="flex items-center justify-between border-zinc-900 border-b-2 pb-3 dark:border-zinc-700">
              <div>
                <span className="font-black text-xl tracking-tight">
                  {shipment.carrierName || "STANDART KARGO"}
                </span>
                <span className="block text-[10px] text-zinc-600 uppercase dark:text-zinc-400">
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
            <div className="my-4 flex flex-col items-center justify-center border-zinc-900 border-b-2 py-3 dark:border-zinc-700">
              <div className="flex h-14 w-64 items-center justify-center bg-zinc-950 font-black font-mono text-white text-xs tracking-widest">
                ||| | |||| || ||| |||| | ||| ||||
              </div>
              <span className="mt-1 font-bold font-mono text-xs tracking-wider">
                {shipment.trackingNumber || shipment.shipmentNumber}
              </span>
            </div>

            {/* Sender & Recipient Box */}
            <div className="grid grid-cols-2 gap-4 border-zinc-900 border-b-2 pb-4 text-xs dark:border-zinc-700">
              {/* Sender */}
              <div className="border-border border-r pr-3">
                <span className="block font-bold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  GÖNDERİCİ:
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  CRM Monorepo Lojistik Deposu
                </span>
                <p className="text-[11px] text-zinc-700 leading-tight dark:text-zinc-300">
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
                <span className="block font-bold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  ALICI (TESLİMAT):
                </span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {shipment.recipientName}
                </span>
                <p className="mt-0.5 text-xs text-zinc-800 leading-tight dark:text-zinc-200">
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
      </DialogContent>
    </Dialog>
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
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <SheetContent
        aria-describedby={undefined}
        className="data-[side=right]:w-full max-w-lg overflow-hidden p-0 data-[side=right]:sm:max-w-lg"
        side="right"
      >
        <SheetTitle className="sr-only">
          Kargo Sevkiyat Detayı · {shipment.shipmentNumber}
        </SheetTitle>
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b p-6">
          <div>
            <span className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">
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
          <SheetClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetClose>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50 dark:bg-zinc-900/60">
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Müşteri
              </span>
              <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
                {shipment.customerName}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Taşıyıcı
              </span>
              <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
                {shipment.carrierName || "Belirtilmedi"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Takip No
              </span>
              <span className="block font-mono font-semibold text-blue-600 dark:text-blue-400">
                {shipment.trackingNumber || "Yok"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Paket & Desi
              </span>
              <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
                {shipment.packageCount} Koli • {shipment.totalDesi} Desi
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-1.5 rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>Teslimat Adresi & Alıcı</span>
            </h3>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              {shipment.recipientName}{" "}
              {shipment.recipientPhone && `(${shipment.recipientPhone})`}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              {shipment.recipientAddress}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              {shipment.recipientDistrict} / {shipment.recipientCity}
            </p>
          </div>

          {/* Items in Package */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              Paket İçeriği ({shipment.items?.length || 0} Kalem)
            </h3>
            <div className="divide-y divide-zinc-100 rounded-2xl border border-border dark:divide-zinc-800">
              {shipment.items?.map((it) => (
                <div
                  className="flex items-center justify-between p-3"
                  key={it.id}
                >
                  <div>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {it.productName}
                    </span>
                    {it.sku && (
                      <span className="block font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        {it.sku}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {it.quantity} {it.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-900 dark:text-zinc-100">
              <History className="h-3.5 w-3.5 text-indigo-600" />
              <span>Kargo Hareket & Durum Tarihçesi</span>
            </h3>
            <div className="ml-2 space-y-3 border-border border-l-2 pl-4">
              {shipment.statusHistories?.map((h) => (
                <div className="relative" key={h.id}>
                  <div className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-card" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
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
                    <span className="block text-[11px] text-zinc-600 dark:text-zinc-300">
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
        <div className="flex items-center gap-2 border-border border-t p-4">
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
      </SheetContent>
    </Sheet>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Yeni İade Kargo Talebi Başlat
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="create-return-customer-name" required>
              Müşteri Adı
            </Label>
            <Input
              id="create-return-customer-name"
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Örn: Mehmet Öz"
              required
              type="text"
              value={customerName}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-return-reason" required>
              İade Sebebi
            </Label>
            <Select onValueChange={(val) => setReason(val)} value={reason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="İade Sebebi Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hasarlı / Kusurlu Ürün">
                  Hasarlı / Kusurlu Ürün
                </SelectItem>
                <SelectItem value="Yanlış Ürün Gönderimi">
                  Yanlış Ürün Gönderimi
                </SelectItem>
                <SelectItem value="Cayma Hakkı / Beğenmeme">
                  Cayma Hakkı / Beğenmeme
                </SelectItem>
                <SelectItem value="Beden / Ebat Değişimi">
                  Beden / Ebat Değişimi
                </SelectItem>
                <SelectItem value="Diğer">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-return-carrier">
              Taşıyıcı Kargo Firması
            </Label>
            <Select
              onValueChange={(val) => setCarrierId(val)}
              value={carrierId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kargo Firması Seçin" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-return-tracking-number">
              İade Kargo Takip No (Opsiyonel)
            </Label>
            <Input
              className="font-mono"
              id="create-return-tracking-number"
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Örn: RET-99120"
              type="text"
              value={trackingNumber}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-3.5 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      </DialogContent>
    </Dialog>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div>
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              İade Kargo Kabul & Kontrol
            </DialogTitle>
            <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              {returnShipment.returnCode}
            </span>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="update-return-status-select">İade Durumu</Label>
            <Select onValueChange={(val) => setStatus(val)} value={status}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Durum Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Requested">Talep Alındı</SelectItem>
                <SelectItem value="InTransit">Müşteriden Yolda</SelectItem>
                <SelectItem value="Received">Depoda Teslim Alındı</SelectItem>
                <SelectItem value="Inspected">
                  Kalite Kontrolden Geçti
                </SelectItem>
                <SelectItem value="Restocked">Stoka İade Edildi</SelectItem>
                <SelectItem value="Rejected">İade Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="update-return-inspection-notes">
              Kalite Kontrol Notları & Açıklama
            </Label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-hidden dark:text-zinc-100"
              id="update-return-inspection-notes"
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Ürün ambalajı incelendi, hasar tespit edilmedi, stoka alındı..."
              rows={3}
              value={inspectionNotes}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-3.5 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      </DialogContent>
    </Dialog>
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
        className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Yeni Taşıyıcı Kargo Firması Ekle
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="create-carrier-name" required>
              Kargo Firması Adı
            </Label>
            <Input
              id="create-carrier-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: UPS Kargo"
              required
              type="text"
              value={name}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-carrier-code" required>
              Firma Kodu (Büyük Harf)
            </Label>
            <Input
              className="font-mono uppercase"
              id="create-carrier-code"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: UPS"
              required
              type="text"
              value={code}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-carrier-account-number">
                Müşteri Hesap No
              </Label>
              <Input
                id="create-carrier-account-number"
                onChange={(e) => setCustomerAccountNumber(e.target.value)}
                placeholder="Örn: ACME-88"
                type="text"
                value={customerAccountNumber}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-carrier-branch-code">Şube Kodu</Label>
              <Input
                id="create-carrier-branch-code"
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="Örn: 3401"
                type="text"
                value={branchCode}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-carrier-tracking-template">
              Takip URL Şablonu
            </Label>
            <Input
              className="font-mono"
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
            <Label
              className="font-medium text-xs text-zinc-700 dark:text-zinc-300"
              htmlFor="create-carrier-default-checkbox"
            >
              Varsayılan Kargo Firması Yap
            </Label>
          </div>

          <div className="flex items-center justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-3.5 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      </DialogContent>
    </Dialog>
  );
}
