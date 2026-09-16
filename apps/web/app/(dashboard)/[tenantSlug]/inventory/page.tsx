"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiClient,
  type CreateStockCountPayload,
  type CreateStockTransferPayload,
  type CreateWarehousePayload,
  type ProductListDto,
  type StockCountDetailDto,
  type StockCountListDto,
  type StockTransferDetailDto,
  type StockTransferListDto,
  type WarehouseDto,
  type WarehouseStockDto,
} from "@/lib/api-client";

type InventoryTab = "warehouses" | "transfers" | "counts";

function resolveInitialWarehouseId(
  warehouses: WarehouseDto[],
  selectedWarehouseId: string
): string | null {
  if (selectedWarehouseId !== "") {
    return null;
  }
  return warehouses.at(0)?.id ?? null;
}

export default function InventoryPage() {
  const params = useParams();
  const tenantSlug = (params.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<InventoryTab>("warehouses");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStockDto[]>(
    []
  );
  const [transfers, setTransfers] = useState<StockTransferListDto[]>([]);
  const [counts, setCounts] = useState<StockCountListDto[]>([]);
  const [products, setProducts] = useState<ProductListDto[]>([]);

  // Drawers & Modals
  const [isNewWarehouseOpen, setIsNewWarehouseOpen] = useState(false);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [isNewCountOpen, setIsNewCountOpen] = useState(false);
  const [activeTransferDetail, setActiveTransferDetail] =
    useState<StockTransferDetailDto | null>(null);
  const [activeCountDetail, setActiveCountDetail] =
    useState<StockCountDetailDto | null>(null);

  // Editing bin location
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingBinLocation, setEditingBinLocation] = useState("");

  // Load Initial Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, trRes, cntRes, prodRes] = await Promise.all([
        ApiClient.getWarehouses(tenantSlug),
        ApiClient.getStockTransfers("All", tenantSlug),
        ApiClient.getStockCounts("All", tenantSlug),
        ApiClient.getProducts({ pageSize: 200 }, tenantSlug),
      ]);

      if (whRes.success && whRes.data) {
        setWarehouses(whRes.data);
        const firstId = resolveInitialWarehouseId(
          whRes.data,
          selectedWarehouseId
        );
        if (firstId !== null) {
          setSelectedWarehouseId(firstId);
        }
      }
      if (trRes.success && trRes.data) {
        setTransfers(trRes.data);
      }
      if (cntRes.success && cntRes.data) {
        setCounts(cntRes.data);
      }
      if (prodRes.success && prodRes.data?.items) {
        setProducts(prodRes.data.items);
      }
    } catch (err) {
      console.error("Envanter verileri yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, selectedWarehouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load stocks when selected warehouse changes
  const loadWarehouseStocks = useCallback(
    async (whId: string) => {
      if (!whId) {
        return;
      }
      try {
        const res = await ApiClient.getWarehouseStocks(whId, tenantSlug);
        if (res.success && res.data) {
          setWarehouseStocks(res.data);
        }
      } catch (err) {
        console.error("Depo stokları yüklenemedi:", err);
      }
    },
    [tenantSlug]
  );

  useEffect(() => {
    if (selectedWarehouseId) {
      loadWarehouseStocks(selectedWarehouseId);
    }
  }, [selectedWarehouseId, loadWarehouseStocks]);

  // Handle Bin Location Update
  const handleSaveBinLocation = useCallback(
    async (stockId: string) => {
      try {
        const res = await ApiClient.updateStockLocation(
          stockId,
          editingBinLocation,
          tenantSlug
        );
        if (res.success) {
          setWarehouseStocks((prev) =>
            prev.map((s) =>
              s.id === stockId ? { ...s, binLocation: editingBinLocation } : s
            )
          );
          setEditingStockId(null);
        }
      } catch (err) {
        console.error("Raf konumu güncellenemedi:", err);
      }
    },
    [editingBinLocation, tenantSlug]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingStockId(null);
  }, []);

  const handleStartEdit = useCallback((stock: WarehouseStockDto) => {
    setEditingStockId(stock.id);
    setEditingBinLocation(stock.binLocation || "");
  }, []);

  // Transfer Actions
  const handleDispatchTransfer = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const res = await ApiClient.dispatchStockTransfer(id, tenantSlug);
        if (res.success) {
          await loadData();
          setActiveTransferDetail((prev) =>
            prev?.id === id ? { ...prev, status: "Dispatched" } : prev
          );
        }
      } finally {
        setActionLoading(false);
      }
    },
    [tenantSlug, loadData]
  );

  const handleReceiveTransfer = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const res = await ApiClient.receiveStockTransfer(id, tenantSlug);
        if (res.success) {
          await loadData();
          setActiveTransferDetail((prev) =>
            prev?.id === id ? { ...prev, status: "Received" } : prev
          );
        }
      } finally {
        setActionLoading(false);
      }
    },
    [tenantSlug, loadData]
  );

  const handleCancelTransfer = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        const res = await ApiClient.cancelStockTransfer(id, tenantSlug);
        if (res.success) {
          await loadData();
          setActiveTransferDetail((prev) =>
            prev?.id === id ? { ...prev, status: "Cancelled" } : prev
          );
        }
      } finally {
        setActionLoading(false);
      }
    },
    [tenantSlug, loadData]
  );

  // Open Transfer Detail Drawer
  const handleOpenTransferDetail = useCallback(
    async (id: string) => {
      try {
        const res = await ApiClient.getStockTransferDetail(id, tenantSlug);
        if (res.success && res.data) {
          setActiveTransferDetail(res.data);
        }
      } catch (err) {
        console.error("Transfer detayı yüklenemedi:", err);
      }
    },
    [tenantSlug]
  );

  // Open Stock Count Detail Drawer
  const handleOpenCountDetail = useCallback(
    async (id: string) => {
      try {
        const res = await ApiClient.getStockCountDetail(id, tenantSlug);
        if (res.success && res.data) {
          setActiveCountDetail(res.data);
        }
      } catch (err) {
        console.error("Sayım detayı yüklenemedi:", err);
      }
    },
    [tenantSlug]
  );

  // Reconcile Count
  const handleReconcileCount = useCallback(
    async (countId: string) => {
      setActionLoading(true);
      try {
        const res = await ApiClient.reconcileStockCount(countId, tenantSlug);
        if (res.success) {
          await loadData();
          setActiveCountDetail(null);
        }
      } finally {
        setActionLoading(false);
      }
    },
    [tenantSlug, loadData]
  );

  // KPI Calculations
  const totalWarehousesCount = warehouses.length;
  const inTransitTransfersCount = transfers.filter(
    (t) => t.status === "Dispatched"
  ).length;
  const activeCountsCount = counts.filter(
    (c) => c.status === "InProgress"
  ).length;
  const totalStockSum = warehouses.reduce(
    (acc, w) => acc + (w.totalStockQuantity || 0),
    0
  );

  // Search input handler
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Filtered Warehouse Stocks
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) {
      return warehouseStocks;
    }
    const q = searchQuery.toLowerCase();
    return warehouseStocks.filter(
      (s) =>
        s.productName.toLowerCase().includes(q) ||
        Boolean(s.productSKU?.toLowerCase().includes(q)) ||
        Boolean(s.productBarcode?.toLowerCase().includes(q)) ||
        Boolean(s.binLocation?.toLowerCase().includes(q))
    );
  }, [warehouseStocks, searchQuery]);

  const handleTabWarehouses = useCallback(() => setActiveTab("warehouses"), []);
  const handleTabTransfers = useCallback(() => setActiveTab("transfers"), []);
  const handleTabCounts = useCallback(() => setActiveTab("counts"), []);

  const handleOpenNewWarehouse = useCallback(
    () => setIsNewWarehouseOpen(true),
    []
  );
  const handleCloseNewWarehouse = useCallback(
    () => setIsNewWarehouseOpen(false),
    []
  );
  const handleSuccessNewWarehouse = useCallback(async () => {
    setIsNewWarehouseOpen(false);
    await loadData();
  }, [loadData]);

  const handleOpenNewTransfer = useCallback(
    () => setIsNewTransferOpen(true),
    []
  );
  const handleCloseNewTransfer = useCallback(
    () => setIsNewTransferOpen(false),
    []
  );
  const handleSuccessNewTransfer = useCallback(async () => {
    setIsNewTransferOpen(false);
    await loadData();
  }, [loadData]);

  const handleOpenNewCount = useCallback(() => setIsNewCountOpen(true), []);
  const handleCloseNewCount = useCallback(() => setIsNewCountOpen(false), []);
  const handleSuccessNewCount = useCallback(
    async (newCountId?: string) => {
      setIsNewCountOpen(false);
      await loadData();
      if (newCountId) {
        handleOpenCountDetail(newCountId);
      }
    },
    [loadData, handleOpenCountDetail]
  );

  const handleCloseTransferDetail = useCallback(
    () => setActiveTransferDetail(null),
    []
  );
  const handleCloseCountDetail = useCallback(
    () => setActiveCountDetail(null),
    []
  );
  const handleRefreshActiveCountDetail = useCallback(() => {
    if (activeCountDetail?.id) {
      handleOpenCountDetail(activeCountDetail.id);
    }
  }, [activeCountDetail, handleOpenCountDetail]);

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-border border-b pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-3 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text font-bold text-2xl text-transparent tracking-tight md:text-3xl">
            <WarehouseIcon className="h-8 w-8 text-primary" />
            Depo & Envanter Yönetimi
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Çoklu depo dağılımı, raf konumlandırma, transferler ve periyodik
            stok sayım mutabakatı.
          </p>
        </div>

        {/* Action Buttons based on Active Tab */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 font-medium text-sm text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:text-zinc-200"
            disabled={loading}
            onClick={loadData}
            type="button"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Yenile
          </button>

          {activeTab === "warehouses" ? (
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow transition hover:bg-primary/90"
              onClick={handleOpenNewWarehouse}
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Depo Aç
            </button>
          ) : null}

          {activeTab === "transfers" ? (
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow transition hover:bg-primary/90"
              onClick={handleOpenNewTransfer}
              type="button"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Yeni Transfer Fişi
            </button>
          ) : null}

          {activeTab === "counts" ? (
            <button
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow transition hover:bg-primary/90"
              onClick={handleOpenNewCount}
              type="button"
            >
              <FileCheck2 className="mr-2 h-4 w-4" />
              Yeni Sayım Başlat
            </button>
          ) : null}
        </div>
      </div>

      {/* Bento KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Aktif Depolar
            </span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-bold text-2xl md:text-3xl">
              {totalWarehousesCount}
            </span>
            <span className="text-muted-foreground text-xs">lokasyon</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Merkez ve şube depoları
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Toplam Stok Miktarı
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-bold text-2xl md:text-3xl">
              {Number(totalStockSum).toLocaleString("tr-TR")}
            </span>
            <span className="text-muted-foreground text-xs">adet</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Tüm depolardaki toplam fiziki stok
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Yoldaki Transferler
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-bold text-2xl md:text-3xl">
              {inTransitTransfersCount}
            </span>
            <span className="text-muted-foreground text-xs">sevk fişi</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Depolar arası sevk edilmiş / yolda
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Devam Eden Sayımlar
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-bold text-2xl md:text-3xl">
              {activeCountsCount}
            </span>
            <span className="text-muted-foreground text-xs">sayım fişi</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Mutabakat bekleyen aktif sayımlar
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-border border-b">
        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-semibold text-sm transition ${
            activeTab === "warehouses"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={handleTabWarehouses}
          type="button"
        >
          <Building2 className="h-4 w-4" />
          Depolar & Raf Stokları ({warehouses.length})
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-semibold text-sm transition ${
            activeTab === "transfers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={handleTabTransfers}
          type="button"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Depo Transferleri ({transfers.length})
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-semibold text-sm transition ${
            activeTab === "counts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={handleTabCounts}
          type="button"
        >
          <FileCheck2 className="h-4 w-4" />
          Periyodik Stok Sayımı ({counts.length})
        </button>
      </div>

      {/* TAB 1: WAREHOUSES & STOCKS */}
      {activeTab === "warehouses" ? (
        <WarehouseTabContent
          editingBinLocation={editingBinLocation}
          editingStockId={editingStockId}
          filteredStocks={filteredStocks}
          onCancelEdit={handleCancelEdit}
          onLocationChange={setEditingBinLocation}
          onSaveBinLocation={handleSaveBinLocation}
          onSearchChange={handleSearchChange}
          onSelectWarehouse={setSelectedWarehouseId}
          onStartEdit={handleStartEdit}
          searchQuery={searchQuery}
          selectedWarehouseId={selectedWarehouseId}
          warehouses={warehouses}
        />
      ) : null}

      {/* TAB 2: STOCK TRANSFERS */}
      {activeTab === "transfers" ? (
        <TransferTabContent
          actionLoading={actionLoading}
          onCancel={handleCancelTransfer}
          onDispatch={handleDispatchTransfer}
          onOpenDetail={handleOpenTransferDetail}
          onReceive={handleReceiveTransfer}
          transfers={transfers}
        />
      ) : null}

      {/* TAB 3: STOCK COUNTS */}
      {activeTab === "counts" ? (
        <CountTabContent counts={counts} onOpenDetail={handleOpenCountDetail} />
      ) : null}

      {/* MODAL: NEW WAREHOUSE */}
      {isNewWarehouseOpen ? (
        <NewWarehouseModal
          onClose={handleCloseNewWarehouse}
          onSuccess={handleSuccessNewWarehouse}
          tenantSlug={tenantSlug}
        />
      ) : null}

      {/* MODAL: NEW TRANSFER */}
      {isNewTransferOpen ? (
        <NewTransferModal
          onClose={handleCloseNewTransfer}
          onSuccess={handleSuccessNewTransfer}
          products={products}
          tenantSlug={tenantSlug}
          warehouses={warehouses}
        />
      ) : null}

      {/* MODAL: NEW COUNT */}
      {isNewCountOpen ? (
        <NewCountModal
          onClose={handleCloseNewCount}
          onSuccess={handleSuccessNewCount}
          tenantSlug={tenantSlug}
          warehouses={warehouses}
        />
      ) : null}

      {/* DRAWER: TRANSFER DETAIL */}
      {activeTransferDetail ? (
        <TransferDetailDrawer
          actionLoading={actionLoading}
          onCancel={handleCancelTransfer}
          onClose={handleCloseTransferDetail}
          onDispatch={handleDispatchTransfer}
          onReceive={handleReceiveTransfer}
          transfer={activeTransferDetail}
        />
      ) : null}

      {/* DRAWER: STOCK COUNT & AUDIT */}
      {activeCountDetail ? (
        <StockCountAuditDrawer
          actionLoading={actionLoading}
          count={activeCountDetail}
          onClose={handleCloseCountDetail}
          onReconcile={handleReconcileCount}
          onRefreshDetail={handleRefreshActiveCountDetail}
          tenantSlug={tenantSlug}
        />
      ) : null}
    </PageContainer>
  );
}

// Subcomponent: WarehouseTabContent
function WarehouseTabContent({
  warehouses,
  selectedWarehouseId,
  filteredStocks,
  editingStockId,
  editingBinLocation,
  searchQuery,
  onSelectWarehouse,
  onSearchChange,
  onStartEdit,
  onCancelEdit,
  onSaveBinLocation,
  onLocationChange,
}: {
  warehouses: WarehouseDto[];
  selectedWarehouseId: string;
  filteredStocks: WarehouseStockDto[];
  editingStockId: string | null;
  editingBinLocation: string;
  searchQuery: string;
  onSelectWarehouse: (id: string) => void;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onStartEdit: (stock: WarehouseStockDto) => void;
  onCancelEdit: () => void;
  onSaveBinLocation: (stockId: string) => void;
  onLocationChange: (val: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="space-y-3 lg:col-span-1">
        <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Depo Lokasyonları
        </h2>
        {warehouses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
            Henüz tanımlı depo bulunmuyor.
          </div>
        ) : null}
        {warehouses.map((wh) => (
          <WarehouseItemCard
            isSelected={wh.id === selectedWarehouseId}
            key={wh.id}
            onSelect={onSelectWarehouse}
            warehouse={wh}
          />
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:col-span-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
              <Package className="h-5 w-5 text-primary" />
              Depo Raf Stokları
            </h2>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Seçili depoda bulunan ürünler, raf/göz konumları ve kullanılabilir
              adetler.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-zinc-50/60 py-1.5 pr-3 pl-9 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-primary focus:bg-white focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200"
              onChange={onSearchChange}
              placeholder="Ürün, SKU veya Raf ara..."
              type="text"
              value={searchQuery}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader className="border-border bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <TableRow>
                <TableHead className="p-3 h-auto">Ürün / Varyant</TableHead>
                <TableHead className="p-3 h-auto">SKU / Barkod</TableHead>
                <TableHead className="p-3 h-auto">Raf / Göz Konumu</TableHead>
                <TableHead className="p-3 text-right h-auto">Toplam Stok</TableHead>
                <TableHead className="p-3 text-right h-auto">Rezerve</TableHead>
                <TableHead className="p-3 text-right h-auto">Kullanılabilir</TableHead>
                <TableHead className="p-3 text-center h-auto">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredStocks.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="p-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    Bu depoda kayıtlı stok bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredStocks.map((stock) => (
                <WarehouseStockRow
                  editingBinLocation={editingBinLocation}
                  isEditing={editingStockId === stock.id}
                  key={stock.id}
                  onCancelEdit={onCancelEdit}
                  onEdit={onStartEdit}
                  onLocationChange={onLocationChange}
                  onSave={onSaveBinLocation}
                  stock={stock}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: TransferTabContent
function TransferTabContent({
  transfers,
  actionLoading,
  onDispatch,
  onReceive,
  onCancel,
  onOpenDetail,
}: {
  transfers: StockTransferListDto[];
  actionLoading: boolean;
  onDispatch: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Depolar Arası Sevk &amp; Transferler
        </h2>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Kaynak depodan hedef depoya sevk edilen stok fişleri ve durumları.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader className="border-border bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <TableRow>
              <TableHead className="p-3 h-auto">Transfer No</TableHead>
              <TableHead className="p-3 h-auto">Güzergah (Kaynak → Hedef)</TableHead>
              <TableHead className="p-3 h-auto">Tarih</TableHead>
              <TableHead className="p-3 text-center h-auto">Kalem / Adet</TableHead>
              <TableHead className="p-3 text-center h-auto">Durum</TableHead>
              <TableHead className="p-3 text-right h-auto">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell
                  className="p-8 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Kayıtlı transfer fişi bulunmuyor.
                </TableCell>
              </TableRow>
            ) : null}
            {transfers.map((t) => (
              <StockTransferRow
                actionLoading={actionLoading}
                key={t.id}
                onCancel={onCancel}
                onDispatch={onDispatch}
                onOpenDetail={onOpenDetail}
                onReceive={onReceive}
                transfer={t}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Subcomponent: CountTabContent
function CountTabContent({
  counts,
  onOpenDetail,
}: {
  counts: StockCountListDto[];
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          <FileCheck2 className="h-5 w-5 text-primary" />
          Periyodik Stok Sayım &amp; Mutabakat
        </h2>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Depo bazlı fiziksel sayım, sistem stoğu ile fark tespiti ve tek tıkla
          otomatik mutabakat.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader className="border-border bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <TableRow>
              <TableHead className="p-3 h-auto">Sayım Fişi</TableHead>
              <TableHead className="p-3 h-auto">Depo</TableHead>
              <TableHead className="p-3 h-auto">Başlangıç Tarihi</TableHead>
              <TableHead className="p-3 text-center h-auto">Kalem Sayısı</TableHead>
              <TableHead className="p-3 text-center h-auto">Toplam Sapma / Fark</TableHead>
              <TableHead className="p-3 text-center h-auto">Durum</TableHead>
              <TableHead className="p-3 text-right h-auto">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {counts.length === 0 ? (
              <TableRow>
                <TableCell
                  className="p-8 text-center text-muted-foreground"
                  colSpan={7}
                >
                  Kayıtlı stok sayım fişi bulunmuyor.
                </TableCell>
              </TableRow>
            ) : null}
            {counts.map((c) => (
              <StockCountRow count={c} key={c.id} onOpenDetail={onOpenDetail} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Subcomponent: WarehouseItemCard
function WarehouseItemCard({
  warehouse,
  isSelected,
  onSelect,
}: {
  warehouse: WarehouseDto;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(warehouse.id);
  }, [onSelect, warehouse.id]);

  return (
    <button
      className={`flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition ${ isSelected ? "border-primary/60 bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40" }`}
      onClick={handleClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-sm">
          {warehouse.name}
          {warehouse.isDefault ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-3xs text-primary">
              Varsayılan
            </span>
          ) : null}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {warehouse.code}
        </span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <MapPin className="h-3.5 w-3.5" />
        <span>{warehouse.city || "Konum belirtilmedi"}</span>
        <span>•</span>
        <span>{warehouse.type}</span>
      </div>

      <div className="flex items-center justify-between border-border border-t pt-2 text-muted-foreground text-xs">
        <span>{warehouse.totalDistinctProducts} Ürün Çeşidi</span>
        <span className="font-semibold text-foreground">
          {Number(warehouse.totalStockQuantity).toLocaleString("tr-TR")} Adet
        </span>
      </div>
    </button>
  );
}

// Subcomponent: WarehouseStockRow
function WarehouseStockRow({
  stock,
  isEditing,
  editingBinLocation,
  onLocationChange,
  onSave,
  onCancelEdit,
  onEdit,
}: {
  stock: WarehouseStockDto;
  isEditing: boolean;
  editingBinLocation: string;
  onLocationChange: (val: string) => void;
  onSave: (stockId: string) => void;
  onCancelEdit: () => void;
  onEdit: (stock: WarehouseStockDto) => void;
}) {
  const isLow = stock.availableQuantity <= 5;
  const handleLocationInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onLocationChange(e.target.value);
    },
    [onLocationChange]
  );

  const handleSaveClick = useCallback(() => {
    onSave(stock.id);
  }, [onSave, stock.id]);

  const handleEditClick = useCallback(() => {
    onEdit(stock);
  }, [onEdit, stock]);

  return (
    <TableRow className="transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
      <TableCell className="p-3 font-medium text-foreground">
        {stock.productName}
        {stock.variantName ? (
          <span className="block text-2xs text-muted-foreground">
            Varyant: {stock.variantName}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="p-3 font-mono text-muted-foreground">
        <div>{stock.productSKU || "-"}</div>
        <div className="text-3xs">{stock.productBarcode || ""}</div>
      </TableCell>
      <TableCell className="p-3">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              className="w-28 rounded-xl border border-border bg-card px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary dark:text-zinc-200"
              onChange={handleLocationInputChange}
              placeholder="Örn: Raf A-12"
              type="text"
              value={editingBinLocation}
            />
            <button
              className="rounded bg-primary px-2 py-1 font-medium text-3xs text-primary-foreground"
              onClick={handleSaveClick}
              type="button"
            >
              Kaydet
            </button>
            <button
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={onCancelEdit}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-2xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {stock.binLocation || "Raf Tanımsız"}
            </span>
            <button
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={handleEditClick}
              type="button"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </TableCell>
      <TableCell className="p-3 text-right font-medium">
        {Number(stock.quantity).toLocaleString("tr-TR")}
      </TableCell>
      <TableCell className="p-3 text-right text-muted-foreground">
        {Number(stock.reservedQuantity).toLocaleString("tr-TR")}
      </TableCell>
      <TableCell className="p-3 text-right font-bold">
        <span
          className={
            isLow
              ? "flex items-center justify-end gap-1 text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }
        >
          {isLow ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
          {Number(stock.availableQuantity).toLocaleString("tr-TR")}
        </span>
      </TableCell>
      <TableCell className="p-3 text-center">
        <span className="text-2xs text-muted-foreground">
          {Number(stock.sellingPrice).toLocaleString("tr-TR", {
            currency: stock.currency || "TRY",
            style: "currency",
          })}
        </span>
      </TableCell>
    </TableRow>
  );
}

// Subcomponent: StockTransferRow
function StockTransferRow({
  transfer,
  actionLoading,
  onOpenDetail,
  onDispatch,
  onReceive,
  onCancel,
}: {
  transfer: StockTransferListDto;
  actionLoading: boolean;
  onOpenDetail: (id: string) => void;
  onDispatch: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const handleOpenClick = useCallback(() => {
    onOpenDetail(transfer.id);
  }, [onOpenDetail, transfer.id]);

  const handleDispatchClick = useCallback(() => {
    onDispatch(transfer.id);
  }, [onDispatch, transfer.id]);

  const handleReceiveClick = useCallback(() => {
    onReceive(transfer.id);
  }, [onReceive, transfer.id]);

  const handleCancelClick = useCallback(() => {
    onCancel(transfer.id);
  }, [onCancel, transfer.id]);

  return (
    <TableRow className="transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
      <TableCell className="p-3 font-bold font-mono text-foreground">
        <button
          className="text-left text-primary hover:underline"
          onClick={handleOpenClick}
          type="button"
        >
          {transfer.transferNumber}
        </button>
      </TableCell>
      <TableCell className="p-3 font-medium">
        <div className="flex items-center gap-2">
          <span>{transfer.sourceWarehouseName}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            {transfer.targetWarehouseName}
          </span>
        </div>
      </TableCell>
      <TableCell className="p-3 text-muted-foreground">
        {new Date(transfer.transferDate).toLocaleDateString("tr-TR")}
      </TableCell>
      <TableCell className="p-3 text-center">
        <span className="font-semibold">{transfer.totalItemCount} Kalem</span>
        <span className="block text-3xs text-muted-foreground">
          ({Number(transfer.totalQuantity).toLocaleString("tr-TR")} Adet)
        </span>
      </TableCell>
      <TableCell className="p-3 text-center">
        <TransferStatusBadge status={transfer.status} />
      </TableCell>
      <TableCell className="space-x-1.5 p-3 text-right">
        <button
          className="rounded-lg border border-border px-2.5 py-1 font-medium text-xs text-zinc-600 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={handleOpenClick}
          type="button"
        >
          Detay
        </button>
        {transfer.status === "Draft" ? (
          <button
            className="rounded bg-amber-600 px-2.5 py-1 font-medium text-white text-xs transition hover:bg-amber-700"
            disabled={actionLoading}
            onClick={handleDispatchClick}
            type="button"
          >
            Sevk Et
          </button>
        ) : null}
        {transfer.status === "Dispatched" ? (
          <button
            className="rounded bg-emerald-600 px-2.5 py-1 font-medium text-white text-xs transition hover:bg-emerald-700"
            disabled={actionLoading}
            onClick={handleReceiveClick}
            type="button"
          >
            Kabul Et
          </button>
        ) : null}
        {transfer.status === "Draft" || transfer.status === "Dispatched" ? (
          <button
            className="rounded px-2 py-1 text-rose-600 text-xs transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            disabled={actionLoading}
            onClick={handleCancelClick}
            type="button"
          >
            İptal
          </button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

// Subcomponent: StockCountRow
function StockCountRow({
  count,
  onOpenDetail,
}: {
  count: StockCountListDto;
  onOpenDetail: (id: string) => void;
}) {
  const hasDiscrepancy = (count.totalDiscrepancy || 0) > 0;
  const handleOpenClick = useCallback(() => {
    onOpenDetail(count.id);
  }, [onOpenDetail, count.id]);

  return (
    <TableRow className="transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
      <TableCell className="p-3 font-bold font-mono text-foreground">
        <button
          className="text-left text-primary hover:underline"
          onClick={handleOpenClick}
          type="button"
        >
          {count.countNumber}
        </button>
      </TableCell>
      <TableCell className="p-3 font-medium">{count.warehouseName}</TableCell>
      <TableCell className="p-3 text-muted-foreground">
        {new Date(count.countDate).toLocaleDateString("tr-TR")}
      </TableCell>
      <TableCell className="p-3 text-center font-medium">
        {count.totalItemsCount} Kalem
      </TableCell>
      <TableCell className="p-3 text-center">
        <span
          className={`font-semibold ${
            hasDiscrepancy
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {Number(count.totalDiscrepancy || 0).toLocaleString("tr-TR")} Adet
          Sapma
        </span>
      </TableCell>
      <TableCell className="p-3 text-center">
        <CountStatusBadge status={count.status} />
      </TableCell>
      <TableCell className="p-3 text-right">
        <button
          className="rounded bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition hover:bg-primary/90"
          onClick={handleOpenClick}
          type="button"
        >
          {count.status === "Completed" ? "İncele" : "Sayıma Devam Et"}
        </button>
      </TableCell>
    </TableRow>
  );
}

// Status Badges
function TransferStatusBadge({ status }: { status: string }) {
  if (status === "Received") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-3xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Teslim Alındı
      </span>
    );
  }
  if (status === "Dispatched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-3xs text-amber-600 dark:text-amber-400">
        <Truck className="h-3 w-3" /> Yolda / Sevk Edildi
      </span>
    );
  }
  if (status === "Cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 font-semibold text-3xs text-rose-600 dark:text-rose-400">
        <X className="h-3 w-3" /> İptal Edildi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-3xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      <Clock className="h-3 w-3" /> Taslak
    </span>
  );
}

function CountStatusBadge({ status }: { status: string }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-3xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Mutabakat Tamamlandı
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 font-semibold text-3xs text-blue-600 dark:text-blue-400">
      <Clock className="h-3 w-3" /> Sayım Devam Ediyor
    </span>
  );
}

// Modal 1: New Warehouse
function NewWarehouseModal({
  onClose,
  onSuccess,
  tenantSlug,
}: {
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("Branch");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    setType(val);
  }, []);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleCityChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
  }, []);

  const handlePhoneChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
  }, []);

  const handleManagerChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setManagerName(e.target.value);
    },
    []
  );

  const handleAddressChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setAddress(e.target.value);
    },
    []
  );

  const handleDefaultChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setIsDefault(e.target.checked);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!(name && code)) {
        setError("Depo adı ve kodu zorunludur.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const payload: CreateWarehousePayload = {
          address,
          city,
          code,
          isDefault,
          managerName,
          name,
          phone,
          type,
        };
        const res = await ApiClient.createWarehouse(payload, tenantSlug);
        if (res.success) {
          onSuccess();
        } else {
          setError(res.message || "Depo oluşturulamadı.");
        }
      } catch {
        setError("Bir hata meydana geldi.");
      } finally {
        setSaving(false);
      }
    },
    [
      name,
      code,
      address,
      city,
      isDefault,
      managerName,
      phone,
      type,
      tenantSlug,
      onSuccess,
    ]
  );

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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <Building2 className="h-5 w-5 text-primary" />
            Yeni Depo Lokasyonu Tanımla
          </DialogTitle>
          <DialogClose asChild>
            <button
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-500/10 p-3 text-rose-600 text-xs dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="wh-code"
              >
                Depo Kodu *
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200"
                id="wh-code"
                onChange={handleCodeChange}
                placeholder="Örn: DEP-01"
                required
                type="text"
                value={code}
              />
            </div>
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="wh-type"
              >
                Depo Türü
              </label>
              <SelectField
                onChange={handleTypeChange}
                options={[
                  { label: "Merkez Depo", value: "Central" },
                  { label: "Şube Depo", value: "Branch" },
                  { label: "Aktarma / Transit", value: "Transit" },
                  { label: "Kusurlu / İade Depo", value: "Defective" },
                  { label: "Konsinye Depo", value: "Consignment" },
                ]}
                value={type}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="wh-name"
            >
              Depo Adı *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
              id="wh-name"
              onChange={handleNameChange}
              placeholder="Örn: Kadıköy Ana Dağıtım Deposu"
              required
              type="text"
              value={name}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="wh-city"
              >
                Şehir
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
                id="wh-city"
                onChange={handleCityChange}
                type="text"
                value={city}
              />
            </div>
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="wh-manager"
              >
                Depo Sorumlusu
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
                id="wh-manager"
                onChange={handleManagerChange}
                placeholder="Ad Soyad"
                type="text"
                value={managerName}
              />
            </div>
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="wh-phone"
              >
                Telefon
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
                id="wh-phone"
                onChange={handlePhoneChange}
                placeholder="0212 ..."
                type="text"
                value={phone}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="wh-address"
            >
              Adres
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
              id="wh-address"
              onChange={handleAddressChange}
              rows={2}
              value={address}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              checked={isDefault}
              className="rounded"
              id="wh-default"
              onChange={handleDefaultChange}
              type="checkbox"
            />
            <label className="text-xs" htmlFor="wh-default">
              Varsayılan Sevkiyat Deposu Yap
            </label>
          </div>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
              disabled={saving}
              type="submit"
            >
              {saving ? "Kaydediliyor..." : "Depoyu Aç"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Modal 2: New Stock Transfer
function NewTransferModal({
  warehouses,
  products,
  onClose,
  onSuccess,
  tenantSlug,
}: {
  warehouses: WarehouseDto[];
  products: ProductListDto[];
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState(
    warehouses[0]?.id || ""
  );
  const [targetWarehouseId, setTargetWarehouseId] = useState(
    warehouses[1]?.id || ""
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { id: string; productId: string; quantity: number; notes: string }[]
  >([
    { id: "item-1", notes: "", productId: products[0]?.id || "", quantity: 1 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSourceChange = useCallback((val: string) => {
    setSourceWarehouseId(val);
  }, []);

  const handleTargetChange = useCallback((val: string) => {
    setTargetWarehouseId(val);
  }, []);

  const handleNotesChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    []
  );

  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        notes: "",
        productId: products[0]?.id || "",
        quantity: 1,
      },
    ]);
  }, [products]);

  const handleItemProductChange = useCallback((idx: number, val: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, productId: val } : it))
    );
  }, []);

  const handleItemQuantityChange = useCallback((idx: number, val: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
    );
  }, []);

  const handleRemoveItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (sourceWarehouseId === targetWarehouseId) {
        setError("Kaynak ve hedef depo aynı olamaz.");
        return;
      }
      if (items.length === 0) {
        setError("En az bir ürün eklemelisiniz.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const payload: CreateStockTransferPayload = {
          items: items.map((it) => ({
            notes: it.notes,
            productId: it.productId,
            quantity: it.quantity,
          })),
          notes,
          sourceWarehouseId,
          targetWarehouseId,
        };
        const res = await ApiClient.createStockTransfer(payload, tenantSlug);
        if (res.success) {
          onSuccess();
        } else {
          setError(res.message || "Transfer oluşturulamadı.");
        }
      } catch {
        setError("Transfer oluşturulurken bir hata meydana geldi.");
      } finally {
        setSaving(false);
      }
    },
    [sourceWarehouseId, targetWarehouseId, items, notes, tenantSlug, onSuccess]
  );

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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Yeni Depolar Arası Sevk Fişi
          </DialogTitle>
          <DialogClose asChild>
            <button
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-500/10 p-3 text-rose-600 text-xs dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="tr-source"
              >
                Kaynak Depo (Çıkış) *
              </label>
              <Combobox
                emptyMessage="Depo bulunamadı."
                onChange={handleSourceChange}
                options={warehouses.map((w) => ({
                  label: `${w.name} (${w.code})`,
                  value: w.id,
                }))}
                searchPlaceholder="Depo ara..."
                value={sourceWarehouseId}
              />
            </div>
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="tr-target"
              >
                Hedef Depo (Varış) *
              </label>
              <Combobox
                emptyMessage="Depo bulunamadı."
                onChange={handleTargetChange}
                options={warehouses.map((w) => ({
                  label: `${w.name} (${w.code})`,
                  value: w.id,
                }))}
                searchPlaceholder="Depo ara..."
                value={targetWarehouseId}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Transfer Kalemleri
              </span>
              <button
                className="flex items-center gap-1 font-medium text-primary text-xs hover:underline"
                onClick={handleAddItem}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" /> Kalem Ekle
              </button>
            </div>

            {items.map((item, idx) => (
              <TransferItemFormRow
                index={idx}
                item={item}
                key={item.id}
                onProductChange={handleItemProductChange}
                onQuantityChange={handleItemQuantityChange}
                onRemove={handleRemoveItem}
                products={products}
                showRemove={items.length > 1}
              />
            ))}
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="tr-notes"
            >
              Sevk Açıklaması / Notlar
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
              id="tr-notes"
              onChange={handleNotesChange}
              placeholder="Örn: 2026 Sezon ürünleri şube dağıtımı"
              rows={2}
              value={notes}
            />
          </div>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
              disabled={saving}
              type="submit"
            >
              {saving ? "Oluşturuluyor..." : "Transfer Fişini Kaydet"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Subcomponent: TransferItemFormRow
function TransferItemFormRow({
  item,
  index,
  products,
  showRemove,
  onProductChange,
  onQuantityChange,
  onRemove,
}: {
  item: { productId: string; quantity: number; notes: string };
  index: number;
  products: ProductListDto[];
  showRemove: boolean;
  onProductChange: (index: number, val: string) => void;
  onQuantityChange: (index: number, val: number) => void;
  onRemove: (index: number) => void;
}) {
  const handleProductSelect = useCallback(
    (val: string) => {
      onProductChange(index, val);
    },
    [onProductChange, index]
  );

  const handleQuantityInput = useCallback(
    (val: number) => {
      onQuantityChange(index, val);
    },
    [onQuantityChange, index]
  );

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-zinc-50/50 p-2.5 dark:bg-zinc-800/30">
      <Combobox
        className="flex-1"
        emptyMessage="Sonuç bulunamadı."
        onChange={handleProductSelect}
        options={products.map((p) => ({
          description: `Stok: ${p.currentStock}`,
          label: p.name,
          value: p.id,
        }))}
        searchPlaceholder="Ara..."
        value={item.productId}
      />

      <NumberInput
        className="w-28"
        min={1}
        onChange={handleQuantityInput}
        showStepper
        value={item.quantity}
      />

      {showRemove ? (
        <button
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
          onClick={handleRemove}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

// Modal 3: New Stock Count
function NewCountModal({
  warehouses,
  onClose,
  onSuccess,
  tenantSlug,
}: {
  warehouses: WarehouseDto[];
  onClose: () => void;
  onSuccess: (newCountId?: string) => void;
  tenantSlug: string;
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWarehouseChange = useCallback((val: string) => {
    setWarehouseId(val);
  }, []);

  const handleNotesChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNotes(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!warehouseId) {
        setError("Depo seçimi zorunludur.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const payload: CreateStockCountPayload = {
          notes,
          warehouseId,
        };
        const res = await ApiClient.createStockCount(payload, tenantSlug);
        if (res.success && res.data) {
          onSuccess(res.data);
        } else {
          setError(res.message || "Sayım başlatılamadı.");
        }
      } catch {
        setError("Sayım başlatılırken hata meydana geldi.");
      } finally {
        setSaving(false);
      }
    },
    [warehouseId, notes, tenantSlug, onSuccess]
  );

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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Yeni Periyodik Stok Sayımı Başlat
          </DialogTitle>
          <DialogClose asChild>
            <button
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-500/10 p-3 text-rose-600 text-xs dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="cnt-wh"
            >
              Sayılacak Depo Lokasyonu *
            </label>
            <Combobox
              emptyMessage="Depo bulunamadı."
              onChange={handleWarehouseChange}
              options={warehouses.map((w) => ({
                label: `${w.name} (${w.code})`,
                value: w.id,
              }))}
              searchPlaceholder="Depo ara..."
              value={warehouseId}
            />
            <p className="mt-1 text-2xs text-muted-foreground">
              Sayım başlatıldığında, bu depoda tanımlı tüm fiziksel ürünler
              sistemdeki mevcut stoklarıyla birlikte listelenecektir.
            </p>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="cnt-notes"
            >
              Sayım Notu / Dönem
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-800 dark:text-zinc-200"
              id="cnt-notes"
              onChange={handleNotesChange}
              placeholder="Örn: 2026 Q3 Sonu Genel Depo Sayımı"
              type="text"
              value={notes}
            />
          </div>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
              disabled={saving}
              type="submit"
            >
              {saving ? "Başlatılıyor..." : "Sayımı Başlat"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Drawer 1: Transfer Detail
function TransferDetailDrawer({
  transfer,
  actionLoading,
  onClose,
  onDispatch,
  onReceive,
  onCancel,
}: {
  transfer: StockTransferDetailDto;
  actionLoading: boolean;
  onClose: () => void;
  onDispatch: (id: string) => void;
  onReceive: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const handleDispatch = useCallback(() => {
    onDispatch(transfer.id);
  }, [onDispatch, transfer.id]);

  const handleReceive = useCallback(() => {
    onReceive(transfer.id);
  }, [onReceive, transfer.id]);

  const handleCancel = useCallback(() => {
    onCancel(transfer.id);
  }, [onCancel, transfer.id]);

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
        className="data-[side=right]:w-full max-w-xl justify-between space-y-6 overflow-y-auto border-border p-6 data-[side=right]:sm:max-w-xl"
        side="right"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-border border-b pb-4">
            <div>
              <span className="font-bold font-mono text-primary text-xs">
                {transfer.transferNumber}
              </span>
              <SheetTitle className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                Depo Sevk Fişi
              </SheetTitle>
            </div>
            <SheetClose asChild>
              <button
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-zinc-50 p-4 text-xs dark:bg-zinc-800/50">
            <div>
              <span className="mb-0.5 block text-muted-foreground">
                Kaynak Depo (Çıkış)
              </span>
              <span className="font-semibold text-foreground text-sm">
                {transfer.sourceWarehouseName}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">
                Hedef Depo (Varış)
              </span>
              <span className="font-semibold text-foreground text-sm">
                {transfer.targetWarehouseName}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">
                Transfer Tarihi
              </span>
              <span className="font-medium">
                {new Date(transfer.transferDate).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-muted-foreground">Durum</span>
              <TransferStatusBadge status={transfer.status} />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Transfer Kalemleri ({transfer.items.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-border text-xs">
              <Table>
                <TableHeader className="border-border bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <TableRow>
                    <TableHead className="p-2.5 h-auto">Ürün</TableHead>
                    <TableHead className="p-2.5 h-auto">SKU</TableHead>
                    <TableHead className="p-2.5 text-right h-auto">Sevk Adedi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {transfer.items.map((item) => (
                    <TableRow
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      key={item.id}
                    >
                      <TableCell className="p-2.5 font-medium text-foreground">
                        {item.productName}
                      </TableCell>
                      <TableCell className="p-2.5 font-mono text-muted-foreground">
                        {item.productSKU || "-"}
                      </TableCell>
                      <TableCell className="p-2.5 text-right font-bold">
                        {Number(item.quantity).toLocaleString("tr-TR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {transfer.notes ? (
            <div className="rounded-lg border border-border bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <span className="mb-0.5 block font-semibold text-foreground">
                Not:
              </span>
              {transfer.notes}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
          {transfer.status === "Draft" ? (
            <button
              className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white text-xs hover:bg-amber-700"
              disabled={actionLoading}
              onClick={handleDispatch}
              type="button"
            >
              Sevk Et (Yola Çıkar)
            </button>
          ) : null}

          {transfer.status === "Dispatched" ? (
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white text-xs hover:bg-emerald-700"
              disabled={actionLoading}
              onClick={handleReceive}
              type="button"
            >
              Teslim Al & Depo Stoğuna Ekle
            </button>
          ) : null}

          {transfer.status === "Draft" || transfer.status === "Dispatched" ? (
            <button
              className="rounded-lg border border-rose-200 px-4 py-2 font-semibold text-rose-600 text-xs hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
              disabled={actionLoading}
              onClick={handleCancel}
              type="button"
            >
              İptal Et
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Drawer 2: Stock Count & Audit Sheet
function StockCountAuditDrawer({
  count,
  actionLoading,
  onClose,
  onReconcile,
  onRefreshDetail,
  tenantSlug,
}: {
  count: StockCountDetailDto;
  actionLoading: boolean;
  onClose: () => void;
  onReconcile: (id: string) => void;
  onRefreshDetail: () => void;
  tenantSlug: string;
}) {
  const [items, setItems] = useState<
    {
      id: string;
      productName: string;
      sku?: string;
      systemQty: number;
      countedQty: number;
    }[]
  >(
    count.items.map((i) => ({
      countedQty: i.countedQuantity,
      id: i.id,
      productName: i.productName,
      sku: i.productSKU,
      systemQty: i.systemQuantity,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");

  const isCompleted = count.status === "Completed";

  const handleBarcodeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setBarcodeQuery(e.target.value);
    },
    []
  );

  const handleItemCountChange = useCallback((idx: number, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, countedQty: val } : item))
    );
  }, []);

  // Save Counted Quantities
  const handleSaveItems = useCallback(async () => {
    setSaving(true);
    try {
      const payload = items.map((it) => ({
        countedQuantity: it.countedQty,
        itemId: it.id,
      }));
      const res = await ApiClient.updateStockCountItems(
        count.id,
        payload,
        tenantSlug
      );
      if (res.success) {
        onRefreshDetail();
      }
    } finally {
      setSaving(false);
    }
  }, [count.id, items, onRefreshDetail, tenantSlug]);

  // Barcode rapid finder/increment
  const handleBarcodeScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && barcodeQuery.trim()) {
        e.preventDefault();
        const q = barcodeQuery.trim().toLowerCase();
        const matchIndex = count.items.findIndex(
          (ci) =>
            ci.productBarcode?.toLowerCase() === q ||
            ci.productSKU?.toLowerCase() === q ||
            ci.productName.toLowerCase().includes(q)
        );

        if (matchIndex !== -1) {
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === matchIndex
                ? { ...item, countedQty: item.countedQty + 1 }
                : item
            )
          );
          setBarcodeQuery("");
        }
      }
    },
    [barcodeQuery, count.items]
  );

  const handleReconcileClick = useCallback(() => {
    onReconcile(count.id);
  }, [onReconcile, count.id]);

  const totalDifference = items.reduce(
    (acc, it) => acc + (it.countedQty - it.systemQty),
    0
  );

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
        className="data-[side=right]:w-full max-w-2xl justify-between space-y-4 overflow-y-auto border-border p-6 data-[side=right]:sm:max-w-2xl"
        side="right"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-border border-b pb-4">
            <div>
              <span className="font-bold font-mono text-primary text-xs">
                {count.countNumber}
              </span>
              <SheetTitle className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                Stok Sayım & Mutabakat Cetveli
              </SheetTitle>
              <p className="text-muted-foreground text-xs">
                {count.warehouseName}
              </p>
            </div>
            <SheetClose asChild>
              <button
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>

          {isCompleted ? null : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full rounded-xl border border-border bg-card py-1.5 pr-3 pl-9 font-mono text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary dark:text-zinc-200"
                  onChange={handleBarcodeChange}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Barkod veya SKU okutun (Enter ile +1 sayar)..."
                  type="text"
                  value={barcodeQuery}
                />
              </div>
              <button
                className="rounded-lg bg-secondary px-3 py-1.5 font-medium text-secondary-foreground text-xs hover:bg-secondary/80"
                disabled={saving}
                onClick={handleSaveItems}
                type="button"
              >
                {saving ? "Kaydediliyor..." : "Miktarları Kaydet"}
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border text-xs">
            <Table>
              <TableHeader className="border-border bg-zinc-50/80 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                <TableRow>
                  <TableHead className="p-2.5 h-auto">Ürün Adı</TableHead>
                  <TableHead className="p-2.5 text-right h-auto">Sistem Stoğu</TableHead>
                  <TableHead className="w-28 p-2.5 text-right h-auto">Sayılan Miktar</TableHead>
                  <TableHead className="p-2.5 text-right h-auto">Fark (Sapma)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {items.map((it, idx) => (
                  <CountAuditRow
                    index={idx}
                    isCompleted={isCompleted}
                    item={it}
                    key={it.id}
                    onCountChange={handleItemCountChange}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
            <span className="text-muted-foreground">Toplam Sayım Sapması:</span>
            <span
              className={`font-bold text-sm ${getDifferenceColor(totalDifference)}`}
            >
              {totalDifference > 0
                ? `+${totalDifference}`
                : String(totalDifference)}{" "}
              Adet
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 font-medium text-emerald-600 text-xs dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Bu sayımın mutabakatı yapılmış ve stoklara işlenmiştir.
            </div>
          ) : (
            <button
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white text-xs shadow-md transition hover:bg-emerald-700"
              disabled={actionLoading || saving}
              onClick={handleReconcileClick}
              type="button"
            >
              Mutabakatı Tamamla & Stokları Güncelle
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Subcomponent: CountAuditRow
function CountAuditRow({
  item,
  index,
  isCompleted,
  onCountChange,
}: {
  item: {
    id: string;
    productName: string;
    sku?: string;
    systemQty: number;
    countedQty: number;
  };
  index: number;
  isCompleted: boolean;
  onCountChange: (index: number, val: number) => void;
}) {
  const diff = item.countedQty - item.systemQty;

  const handleInputChange = useCallback(
    (val: number) => {
      onCountChange(index, val);
    },
    [onCountChange, index]
  );

  return (
    <TableRow className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
      <TableCell className="p-2.5 font-medium text-foreground">
        {item.productName}
        {item.sku ? (
          <span className="block text-3xs text-muted-foreground">
            {item.sku}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="p-2.5 text-right font-mono text-muted-foreground">
        {Number(item.systemQty).toLocaleString("tr-TR")}
      </TableCell>
      <TableCell className="p-2.5 text-right">
        {isCompleted ? (
          <span className="font-bold">{item.countedQty}</span>
        ) : (
          <NumberInput
            className="w-24"
            min={0}
            onChange={handleInputChange}
            showStepper
            value={item.countedQty}
          />
        )}
      </TableCell>
      <TableCell className="p-2.5 text-right font-bold">
        <span className={getRowDifferenceColor(diff)}>
          {diff > 0 ? `+${diff}` : String(diff)}
        </span>
      </TableCell>
    </TableRow>
  );
}

function getDifferenceColor(diff: number): string {
  if (diff === 0) {
    return "text-muted-foreground";
  }
  if (diff > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  return "text-rose-600 dark:text-rose-400";
}

function getRowDifferenceColor(diff: number): string {
  if (diff === 0) {
    return "text-muted-foreground";
  }
  if (diff > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  return "text-rose-600 dark:text-rose-400";
}
