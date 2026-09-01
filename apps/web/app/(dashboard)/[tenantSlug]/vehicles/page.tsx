/* Hallmark · component: automotive-vehicle-intelligence · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Fuel,
  Gauge,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Maximize2,
  Milestone,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CreatePartPayload,
  type CreateVehicleDocumentPayload,
  type CreateVehiclePayload,
  type EpcSystemDto,
  type UpdatePartPayload,
  type UpdateVehiclePayload,
  type VehicleDocumentDto,
  type VehiclePartDto,
  type VehicleSummaryDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type ActiveTab = "catalog" | "compare" | "epc" | "docs";

export default function VehiclesPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  // Core Data
  const [vehicles, setVehicles] = useState<VehicleSummaryDto[]>([]);
  const [epcSystems, setEpcSystems] = useState<EpcSystemDto[]>([]);
  const [parts, setParts] = useState<VehiclePartDto[]>([]);
  const [documents, setDocuments] = useState<VehicleDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "table">("grid");

  // Catalog Filters
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Compare State (Array of vehicle IDs)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // EPC State
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [epcSearch, setEpcSearch] = useState("");

  // Documents Filter
  const [docCategoryFilter, setDocCategoryFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

  // Detail Drawers & Modals
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummaryDto | null>(null);
  const [vehicleDetailTab, setVehicleDetailTab] = useState<
    "overview" | "specs" | "dimensions" | "safety" | "equipment" | "warranty" | "docs"
  >("overview");

  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const [isCreatePartOpen, setIsCreatePartOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const [vehRes, epcRes, partsRes, docsRes] = await Promise.all([
        ApiClient.getVehicles({ pageSize: 150 }, activeTenant.id),
        ApiClient.getEpcSystems(activeTenant.id),
        ApiClient.getEpcParts({ pageSize: 300 }, activeTenant.id),
        ApiClient.getVehicleDocuments({}, activeTenant.id),
      ]);

      if (vehRes.success && vehRes.data) {
        setVehicles(vehRes.data.items);
        // Default comparison to first 2-3 vehicles if empty
        if (compareIds.length === 0 && vehRes.data.items.length >= 2) {
          setCompareIds(vehRes.data.items.slice(0, 3).map((v) => v.id));
        }
      }
      if (epcRes.success && epcRes.data) {
        setEpcSystems(epcRes.data);
        if (epcRes.data.length > 0 && !selectedSystemId && epcRes.data[0]) {
          setSelectedSystemId(epcRes.data[0].id);
        }
      }
      if (partsRes.success && partsRes.data) {
        setParts(partsRes.data);
      }
      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
    } catch {
      showToast("Otomotiv verileri yüklenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, compareIds.length, selectedSystemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique lists for filters
  const brands = Array.from(new Set(vehicles.map((v) => v.brand))).filter(Boolean).sort();
  const segments = Array.from(new Set(vehicles.map((v) => v.segment))).filter(Boolean).sort();

  // Filtered Vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const hay = `${v.brand} ${v.model} ${v.trim} ${v.projectCode || ""} ${v.vinPrefix || ""}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (selectedBrand && v.brand !== selectedBrand) return false;
    if (selectedSegment && v.segment !== selectedSegment) return false;
    if (selectedStatus && v.status !== selectedStatus) return false;
    return true;
  });

  // Filtered Parts
  const filteredParts = parts.filter((p) => {
    if (selectedSystemId && p.systemId !== selectedSystemId) return false;
    if (selectedSubsystemId && p.subsystemId !== selectedSubsystemId) return false;
    if (epcSearch) {
      const s = epcSearch.toLowerCase();
      const match =
        p.partNumber.toLowerCase().includes(s) ||
        (p.oemNumber && p.oemNumber.toLowerCase().includes(s)) ||
        p.nameTr.toLowerCase().includes(s) ||
        p.nameEn.toLowerCase().includes(s) ||
        (p.nameCn && p.nameCn.toLowerCase().includes(s)) ||
        (p.location && p.location.toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });

  // Selected EPC Part object
  const selectedPart = parts.find((p) => p.id === selectedPartId) || filteredParts[0] || null;

  // Comparison Helpers
  const toggleCompare = (vehicleId: string) => {
    if (compareIds.includes(vehicleId)) {
      setCompareIds((prev) => prev.filter((id) => id !== vehicleId));
    } else {
      if (compareIds.length >= 6) {
        showToast("En fazla 6 araç karşılaştırabilirsiniz.");
        return;
      }
      setCompareIds((prev) => [...prev, vehicleId]);
    }
  };

  const comparedVehicles = compareIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter((v): v is VehicleSummaryDto => Boolean(v));

  // Safe JSON Parse helper
  const parseJson = <T,>(jsonStr: string | undefined, fallback: T): T => {
    if (!jsonStr) return fallback;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return fallback;
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Development":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Discontinued":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Active":
        return "Aktif Model";
      case "Development":
        return "Geliştirme / Ar-Ge";
      case "Discontinued":
        return "Üretim Durduruldu";
      default:
        return status;
    }
  };

  // Document Icon Helper
  const getDocIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "PDF":
        return <FileText className="h-5 w-5 text-rose-500" />;
      case "EXCEL":
      case "XLSX":
      case "CSV":
        return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
      case "CAD":
      case "STEP":
        return <Boxes className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-zinc-400" />;
    }
  };

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: "vehicle" | "part" | "document";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Handlers triggering Design System Modal
  const handleDeleteVehicle = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: "vehicle",
      id,
      title: name,
      subtitle: "Bu araca ait tüm teknik spesifikasyonlar, performans ve garanti kayıtları silinecektir.",
    });
  };

  const handleDeletePart = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: "part",
      id,
      title: name,
      subtitle: "Bu parça elektronik parça kataloğundan ve patlatılmış şema montaj konumlarından kaldırılacaktır.",
    });
  };

  const handleDeleteDocument = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: "document",
      id,
      title: name,
      subtitle: "Bu servis bülteni / teknik doküman kalıcı olarak arşivden silinecektir.",
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation || !activeTenant || isDeleting) return;
    setIsDeleting(true);

    const { id, type } = deleteConfirmation;

    try {
      if (type === "vehicle") {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        if (selectedVehicle?.id === id) setSelectedVehicle(null);
        setCompareIds((prev) => prev.filter((cId) => cId !== id));
        const res = await ApiClient.deleteVehicle(id, activeTenant.id);
        if (res.success) {
          showToast("Araç başarıyla silindi.");
        } else {
          loadData();
          showToast(res.message || "Silme işlemi başarısız.");
        }
      } else if (type === "part") {
        setParts((prev) => prev.filter((p) => p.id !== id));
        if (selectedPartId === id) setSelectedPartId(null);
        const res = await ApiClient.deleteEpcPart(id, activeTenant.id);
        if (res.success) {
          showToast("Parça başarıyla silindi.");
        } else {
          loadData();
          showToast(res.message || "Silme işlemi başarısız.");
        }
      } else if (type === "document") {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        const res = await ApiClient.deleteVehicleDocument(id, activeTenant.id);
        if (res.success) {
          showToast("Doküman başarıyla silindi.");
        } else {
          loadData();
          showToast(res.message || "Silme işlemi başarısız.");
        }
      }
    } catch {
      loadData();
      showToast("İşlem sırasında bir hata oluştu.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation(null);
    }
  };

  // Export Comparison CSV
  const handleExportComparisonCsv = () => {
    if (comparedVehicles.length < 2) {
      showToast("Karşılaştırma için en az 2 araç seçin.");
      return;
    }

    const headers = ["Özellik", ...comparedVehicles.map((v) => `${v.brand} ${v.model}${v.trim ? ` (${v.trim})` : ""}`)];
    const rows: string[][] = [
      ["Segment", ...comparedVehicles.map((v) => v.segment || "")],
      ["Model Yılı", ...comparedVehicles.map((v) => (v.modelYear ? v.modelYear.toString() : ""))],
      ["Kasa Tipi", ...comparedVehicles.map((v) => v.bodyType || "")],
      ["Çekiş", ...comparedVehicles.map((v) => v.driveType || "")],
      ["Motor", ...comparedVehicles.map((v) => v.engine || "")],
      ["Şanzıman", ...comparedVehicles.map((v) => v.transmission || "")],
      ["Yakıt", ...comparedVehicles.map((v) => v.fuel || "")],
      ["Fiyat USD", ...comparedVehicles.map((v) => (v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : ""))],
      ["Fiyat TRY", ...comparedVehicles.map((v) => (v.priceTry ? `₺${v.priceTry.toLocaleString()}` : ""))],
    ];

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `arac_karsilastirma_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Karşılaştırma CSV dosyası indirildi.");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200" href={`/${tenantSlug}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="font-bold text-violet-600 dark:text-violet-400">Otomotiv & Araçlar</span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Otomotiv & Araç İstihbarat Platformu
            </h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 border border-violet-200 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300">
              ULTRAND Engine
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Araç teknik kataloğu, çoklu kıyaslama masası, patlatılmış şemalı EPC parça kataloğu ve servis bültenleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "catalog" && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              onClick={() => {
                setEditingVehicleId(null);
                setIsCreateVehicleOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Araç Ekle</span>
            </button>
          )}

          {activeTab === "epc" && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              onClick={() => {
                setEditingPartId(null);
                setIsCreatePartOpen(true);
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Parça Ekle</span>
            </button>
          )}

          {activeTab === "docs" && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-violet-700 active:scale-95"
              onClick={() => setIsCreateDocOpen(true)}
              type="button"
            >
              <Upload className="h-4 w-4" />
              <span>Doküman Yükle</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Toplam Araç Modeli</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">{vehicles.length}</div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {vehicles.filter((v) => v.status === "Active").length} Aktif · {vehicles.filter((v) => v.status === "Development").length} Ar-Ge
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Marka Portföyü</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">{brands.length}</div>
          <div className="mt-1 text-[11px] text-zinc-400">Kendi Modellerimiz + Rakipler</div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">EPC Yedek Parça</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">{parts.length}</div>
          <div className="mt-1 text-[11px] text-zinc-400">{epcSystems.length} Ana Montaj Sisteminde</div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold">Teknik Doküman & TSB</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">{documents.length}</div>
          <div className="mt-1 text-[11px] text-zinc-400">Kılavuzlar, Homologasyon & CAD</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "catalog"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("catalog")}
          type="button"
        >
          <Car className="h-4 w-4" />
          <span>Araç Kataloğu & Veritabanı</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {filteredVehicles.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "compare"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("compare")}
          type="button"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Araç Karşılaştırma & Benchmarking</span>
          {compareIds.length > 0 && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/80 dark:text-violet-300">
              {compareIds.length} Seçili
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "epc"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("epc")}
          type="button"
        >
          <Wrench className="h-4 w-4" />
          <span>Elektronik Parça Kataloğu (EPC)</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {parts.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "docs"
              ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("docs")}
          type="button"
        >
          <FileText className="h-4 w-4" />
          <span>Teknik Bültenler & Dokümanlar</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {documents.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VEHICLES CATALOG */}
      {/* ========================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-zinc-200/80 bg-white py-2 pr-3 pl-9 text-xs text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Marka, model, proje kodu, VIN ara..."
                  type="text"
                  value={search}
                />
              </div>

              {/* Brand Filter */}
              <select
                aria-label="Marka Filtresi"
                className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                onChange={(e) => setSelectedBrand(e.target.value)}
                value={selectedBrand}
              >
                <option value="">Tüm Markalar</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Segment Filter */}
              <select
                aria-label="Segment Filtresi"
                className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                onChange={(e) => setSelectedSegment(e.target.value)}
                value={selectedSegment}
              >
                <option value="">Tüm Segmentler</option>
                {segments.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                aria-label="Durum Filtresi"
                className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                onChange={(e) => setSelectedStatus(e.target.value)}
                value={selectedStatus}
              >
                <option value="">Tüm Durumlar</option>
                <option value="Active">Aktif</option>
                <option value="Development">Geliştirme</option>
                <option value="Discontinued">Durduruldu</option>
              </select>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                className={`rounded-xl p-2 transition ${
                  catalogViewMode === "grid"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200/80 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
                onClick={() => setCatalogViewMode("grid")}
                title="Kart Görünümü"
                type="button"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={`rounded-xl p-2 transition ${
                  catalogViewMode === "table"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200/80 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
                onClick={() => setCatalogViewMode("table")}
                title="Tablo Görünümü"
                type="button"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grid View */}
          {catalogViewMode === "grid" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((v) => {
                const isCompared = compareIds.includes(v.id);
                const engineSpec = parseJson<{ power?: string; torque?: string }>(v.engineSpecJson, {});
                const performance = parseJson<{ accel?: string }>(v.performanceJson, {});

                return (
                  <div
                    className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-violet-300 hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-violet-700"
                    key={v.id}
                  >
                    <div>
                      {/* Top Row: Icon, Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-2xl dark:bg-zinc-800">
                            {v.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                              {v.brand} {v.model}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {[v.trim, v.modelYear].filter(Boolean).join(" · ") || "Model"}
                            </p>
                          </div>
                        </div>

                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(v.status)}`}>
                          {getStatusLabel(v.status)}
                        </span>
                      </div>

                      {/* Pills */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold min-h-[22px]">
                        {v.segment && (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {v.segment}
                          </span>
                        )}
                        {v.fuel && (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {v.fuel}
                          </span>
                        )}
                        {v.driveType && (
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {v.driveType}
                          </span>
                        )}
                        {v.projectCode && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 font-mono text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            {v.projectCode}
                          </span>
                        )}
                        {!v.segment && !v.fuel && !v.driveType && !v.projectCode && (
                          <span className="text-zinc-400 text-[11px] italic">Temel Tanım</span>
                        )}
                      </div>

                      {/* Specs Mini Grid */}
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
                        <div>
                          <div className="text-[10px] text-zinc-400">Güç</div>
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                            {engineSpec.power || v.engine || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">0-100 km/s</div>
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                            {performance.accel || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">Ref. Fiyat</div>
                          <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          isCompared
                            ? "border-violet-600 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-300"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                        onClick={() => toggleCompare(v.id)}
                        type="button"
                      >
                        {isCompared ? <Check className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                        <span>{isCompared ? "Kıyaslamada" : "Kıyasla"}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          onClick={() => {
                            setSelectedVehicle(v);
                            setVehicleDetailTab("overview");
                          }}
                          title="Teknik Kart İncele"
                          type="button"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition"
                          onClick={() => {
                            setEditingVehicleId(v.id);
                            setIsCreateVehicleOpen(true);
                          }}
                          title="Aracı Düzenle"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          onClick={() => handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)}
                          title="Aracı Sil"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredVehicles.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                  <Car className="mx-auto h-10 w-10 text-zinc-400" />
                  <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    Arama Kriterlerine Uygun Araç Bulunamadı
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Filtreleri sıfırlayabilir veya sağ üstteki "+ Yeni Araç Ekle" butonuyla yeni bir model oluşturabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {catalogViewMode === "table" && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <th className="py-3 pr-4 pl-5">Araç & Model</th>
                    <th className="py-3 px-4">Segment</th>
                    <th className="py-3 px-4">Model Yılı</th>
                    <th className="py-3 px-4">Motor & Yakıt</th>
                    <th className="py-3 px-4">Pazar</th>
                    <th className="py-3 px-4">Ref. Fiyat (USD)</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 pr-5 pl-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredVehicles.map((v) => (
                    <tr
                      className="cursor-pointer transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60"
                      key={v.id}
                      onClick={() => {
                        setSelectedVehicle(v);
                        setVehicleDetailTab("overview");
                      }}
                    >
                      <td className="py-3 pr-4 pl-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{v.icon}</span>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {v.brand} {v.model}
                            </div>
                            {v.trim && <div className="text-[11px] text-zinc-400">{v.trim}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-700 dark:text-zinc-300">{v.segment || "—"}</td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{v.modelYear || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{v.engine || "—"}</div>
                        {(v.fuel || v.transmission) && (
                          <div className="text-[11px] text-zinc-400">
                            {[v.fuel, v.transmission].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{v.market || "—"}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(v.status)}`}>
                          {getStatusLabel(v.status)}
                        </span>
                      </td>
                      <td className="py-3 pr-5 pl-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            onClick={() => {
                              setSelectedVehicle(v);
                              setVehicleDetailTab("overview");
                            }}
                            title="İncele"
                            type="button"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition"
                            onClick={() => {
                              setEditingVehicleId(v.id);
                              setIsCreateVehicleOpen(true);
                            }}
                            title="Aracı Düzenle"
                            type="button"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            onClick={() => handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)}
                            title="Aracı Sil"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MULTI-VEHICLE COMPARISON BENCHMARKING */}
      {/* ========================================================= */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          {/* Compare Toolbar & Picked Badges */}
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/90 dark:bg-zinc-900/90">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Karşılaştırma Masası ({comparedVehicles.length} Araç)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kendi modellerinizi ve rakipleri tüm teknik ve ticari boyutlarda yan yana kıyaslayın
              </p>

              {/* Selected Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {comparedVehicles.map((v) => (
                  <span
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    key={v.id}
                  >
                    <span>{v.icon}</span>
                    <span>
                      {v.brand} {v.model}
                    </span>
                    <button
                      className="text-zinc-400 hover:text-rose-600"
                      onClick={() => toggleCompare(v.id)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                onClick={handleExportComparisonCsv}
                type="button"
              >
                <Download className="h-4 w-4" />
                <span>CSV İndir</span>
              </button>

              <button
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-violet-700"
                onClick={() => window.print()}
                type="button"
              >
                <Printer className="h-4 w-4" />
                <span>Yazdır / PDF</span>
              </button>
            </div>
          </div>

          {comparedVehicles.length < 2 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <TrendingUp className="mx-auto h-10 w-10 text-zinc-400" />
              <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Karşılaştırma için en az 2 araç seçin
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                "Araç Kataloğu" sekmesine giderek dilediğiniz araçların altındaki "Kıyasla" butonuna tıklayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <th className="py-4 pr-4 pl-5 font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300 w-56">
                      Özellik Grubu
                    </th>
                    {comparedVehicles.map((v) => (
                      <th className="py-4 px-4 font-bold text-zinc-900 dark:text-zinc-100 min-w-[180px]" key={v.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{v.icon}</span>
                          <div>
                            <div>
                              {v.brand} {v.model}
                            </div>
                            {v.trim && <div className="text-[10px] font-normal text-zinc-400">{v.trim}</div>}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {/* Category: GENEL & KASA */}
                  <tr className="bg-zinc-100/60 font-bold text-[11px] text-violet-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-violet-400">
                    <td className="py-2.5 pr-4 pl-5" colSpan={comparedVehicles.length + 1}>
                      1. Genel Bilgiler & Kasa
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Segment</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200" key={v.id}>
                        {v.segment || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Model Yılı</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.modelYear || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Kasa Tipi / Kapı</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.bodyType || "—"}{v.doors || v.seats ? ` (${[v.doors ? `${v.doors} Kapı` : null, v.seats ? `${v.seats} Koltuk` : null].filter(Boolean).join(" / ")})` : ""}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Pazar & Ülke</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {[v.market, v.country].filter(Boolean).join(" · ") || "—"}
                      </td>
                    ))}
                  </tr>

                  {/* Category: MOTOR & PERFORMANS */}
                  <tr className="bg-zinc-100/60 font-bold text-[11px] text-violet-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-violet-400">
                    <td className="py-2.5 pr-4 pl-5" colSpan={comparedVehicles.length + 1}>
                      2. Motor & Güç Aktarımı
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Motor & Yakıt</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200" key={v.id}>
                        {v.engine || v.fuel ? `${v.engine || "—"}${v.fuel ? ` (${v.fuel})` : ""}` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Şanzıman & Çekiş</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {[v.transmission, v.driveType].filter(Boolean).join(" · ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Maksimum Güç</td>
                    {comparedVehicles.map((v) => {
                      const spec = parseJson<{ power?: string }>(v.engineSpecJson, {});
                      return (
                        <td className="py-2.5 px-4 font-bold text-violet-700 dark:text-violet-300" key={v.id}>
                          {spec.power || v.engine || "—"}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">0-100 km/s Hızlanma</td>
                    {comparedVehicles.map((v) => {
                      const perf = parseJson<{ accel?: string }>(v.performanceJson, {});
                      return (
                        <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200" key={v.id}>
                          {perf.accel || "—"}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Category: FİYAT & GARANTİ */}
                  <tr className="bg-zinc-100/60 font-bold text-[11px] text-violet-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-violet-400">
                    <td className="py-2.5 pr-4 pl-5" colSpan={comparedVehicles.length + 1}>
                      3. Fiyatlandırma & Garanti
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Referans Fiyat (USD)</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 font-bold text-emerald-600 dark:text-emerald-400" key={v.id}>
                        {v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Araç Garantisi</td>
                    {comparedVehicles.map((v) => {
                      const w = parseJson<{ vehicle?: string }>(v.warrantyJson, {});
                      return (
                        <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                          {w.vehicle || "3 Yıl / 100.000 km"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EPC (ELECTRONIC PARTS CATALOG) */}
      {/* ========================================================= */}
      {activeTab === "epc" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-h-[600px]">
          {/* Left Panel: Systems Tree (Col 3) */}
          <div className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90 overflow-y-auto max-h-[700px]">
            <div className="mb-3 font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              Sistem Ağacı (Montaj Grupları)
            </div>

            <div className="space-y-1">
              {epcSystems.map((sys) => {
                const isSelected = selectedSystemId === sys.id;

                return (
                  <div key={sys.id} className="space-y-0.5">
                    <button
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => {
                        setSelectedSystemId(sys.id);
                        setSelectedSubsystemId(null);
                      }}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <span>{sys.icon}</span>
                        <span>{sys.name}</span>
                      </div>
                      <span className="rounded-full bg-zinc-200/70 px-1.5 py-0.2 font-bold text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {sys.totalPartsCount}
                      </span>
                    </button>

                    {/* Subsystems */}
                    {isSelected && (
                      <div className="pl-6 space-y-0.5 border-l-2 border-violet-200 dark:border-violet-900 ml-3 mt-1">
                        {sys.subsystems.map((sub) => (
                          <button
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                              selectedSubsystemId === sub.id
                                ? "bg-violet-100/80 text-violet-900 font-bold dark:bg-violet-900/50 dark:text-violet-200"
                                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            }`}
                            key={sub.id}
                            onClick={() => setSelectedSubsystemId(sub.id)}
                            type="button"
                          >
                            <span>{sub.name}</span>
                            <span className="text-[10px] opacity-70">{sub.partsCount}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Panel: Exploded View & Parts Table (Col 6) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Exploded View Figure Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  Patlatılmış Şema & Hotspotlar (Exploded View)
                </span>
                <span className="text-[10px] text-zinc-400">Şemadaki numaralara tıklayarak parçayı seçin</span>
              </div>

              {/* Interactive SVG Diagram with Hotspots */}
              <div className="relative h-60 w-full overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 flex items-center justify-center">
                <svg className="h-full w-full opacity-60" viewBox="0 0 400 220">
                  <rect fill="currentColor" height="90" opacity="0.15" rx="16" width="220" x="90" y="65" />
                  <circle cx="130" cy="170" fill="currentColor" opacity="0.3" r="22" />
                  <circle cx="270" cy="170" fill="currentColor" opacity="0.3" r="22" />
                  <rect fill="currentColor" height="40" opacity="0.2" rx="10" width="140" x="130" y="40" />
                </svg>

                {/* Hotspots */}
                {filteredParts.slice(0, 8).map((part, index) => {
                  const defaultPositions = [
                    { x: 25, y: 30 },
                    { x: 45, y: 22 },
                    { x: 68, y: 28 },
                    { x: 80, y: 50 },
                    { x: 62, y: 65 },
                    { x: 38, y: 70 },
                    { x: 20, y: 60 },
                    { x: 50, y: 82 },
                  ];

                  const defaultPos = defaultPositions[index % defaultPositions.length] || { x: 50, y: 50 };
                  const pos = {
                    x: part.hotspotCoordX ?? defaultPos.x,
                    y: part.hotspotCoordY ?? defaultPos.y,
                  };

                  const isHotspotSelected = selectedPart?.id === part.id;

                  return (
                    <button
                      className={`absolute flex h-6 w-6 items-center justify-center rounded-full font-bold text-[10px] shadow-md transition-all ${
                        isHotspotSelected
                          ? "bg-violet-600 text-white ring-4 ring-violet-400/50 scale-125 z-10"
                          : "bg-zinc-900 text-white hover:scale-110 dark:bg-white dark:text-zinc-900"
                      }`}
                      key={part.id}
                      onClick={() => setSelectedPartId(part.id)}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      title={`${part.nameTr} (${part.partNumber})`}
                      type="button"
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parts List */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
              <div className="flex items-center justify-between mb-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-1.5 pr-3 pl-8 text-xs text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setEpcSearch(e.target.value)}
                    placeholder="Parça No / OEM / TR / EN / CN ara..."
                    type="text"
                    value={epcSearch}
                  />
                </div>
                <span className="text-[11px] font-bold text-zinc-500">{filteredParts.length} Parça</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[360px] overflow-y-auto">
                {filteredParts.map((p, idx) => {
                  const isPartSelected = selectedPart?.id === p.id;

                  return (
                    <div
                      className={`flex cursor-pointer items-center justify-between p-2.5 transition rounded-xl ${
                        isPartSelected
                          ? "bg-violet-50 dark:bg-violet-950/50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                      key={p.id}
                      onClick={() => setSelectedPartId(p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{p.nameTr}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{p.partNumber}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">×{p.qtyPerAssembly}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">${p.unitPrice}</span>
                        <button
                          className="rounded-lg p-1 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPartId(p.id);
                            setIsCreatePartOpen(true);
                          }}
                          title="Parçayı Düzenle"
                          type="button"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredParts.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-400">Bu grupta parça bulunamadı.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Part Details (Col 3) */}
          <div className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
            {selectedPart ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      {selectedPart.partNumber}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{selectedPart.nameTr}</h3>
                  </div>
                  <button
                    className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                    onClick={() => {
                      setEditingPartId(selectedPart.id);
                      setIsCreatePartOpen(true);
                    }}
                    title="Parçayı Düzenle"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Düzenle</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                    <span className="text-zinc-400">English (EN):</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedPart.nameEn}</span>
                  </div>
                  {selectedPart.nameCn && (
                    <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                      <span className="text-zinc-400">中文 (CN):</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedPart.nameCn}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                    <span className="text-zinc-400">OEM No:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {selectedPart.oemNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                    <span className="text-zinc-400">Stok Durumu:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        selectedPart.stockQuantity > 20
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {selectedPart.stockQuantity} adet
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                    <span className="text-zinc-400">Birim Fiyat:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${selectedPart.unitPrice}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
                    <span className="text-zinc-400">Süperseksiyon:</span>
                    <span className="text-zinc-600 dark:text-zinc-400">{selectedPart.supersession || "—"}</span>
                  </div>
                </div>

                {selectedPart.notes && (
                  <div className="rounded-xl bg-zinc-50 p-3 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 text-[11px]">
                    {selectedPart.notes}
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                    onClick={() => handleDeletePart(selectedPart.id, selectedPart.nameTr)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Parçayı Sil</span>
                  </button>

                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 font-bold text-xs text-white hover:bg-violet-700 transition"
                    onClick={() => {
                      setEditingPartId(selectedPart.id);
                      setIsCreatePartOpen(true);
                    }}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Düzenle</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-20 text-center text-xs text-zinc-400">
                <Wrench className="h-8 w-8 opacity-40 mb-2" />
                <span>Detaylarını görmek için sol listeden veya şemadan bir parça seçin.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: VEHICLE DOCUMENTS & TSB */}
      {/* ========================================================= */}
      {activeTab === "docs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {documents.map((doc) => {
              const tags = parseJson<string[]>(doc.tagsJson, []);

              return (
                <div
                  className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition hover:border-violet-300 hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90"
                  key={doc.id}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        {getDocIcon(doc.documentType)}
                      </div>
                      <button
                        className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => handleDeleteDocument(doc.id, doc.name)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <h4 className="mt-3 font-bold text-xs text-zinc-900 line-clamp-2 dark:text-zinc-100" title={doc.name}>
                      {doc.name}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>{doc.documentType}</span>
                      <span>·</span>
                      <span>{doc.fileSize}</span>
                    </div>

                    {doc.vehicleName && (
                      <div className="mt-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                        🚘 {doc.vehicleName}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span
                          className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          key={t}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3 text-[10px] text-zinc-400 flex justify-between items-center dark:border-zinc-800">
                    <span>{new Date(doc.createdAt).toLocaleDateString("tr-TR")}</span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                      Görüntüle ↗
                    </span>
                  </div>
                </div>
              );
            })}

            {documents.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <FileText className="mx-auto h-10 w-10 text-zinc-400" />
                <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                  Henüz Doküman Yüklenmemiş
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Kullanım kılavuzları, servis bültenleri (TSB) veya CAD dosyalarını yükleyebilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VEHICLE DETAIL DRAWER (SLIDE OVER) */}
      {/* ========================================================= */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedVehicle.icon}</span>
                <div>
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[selectedVehicle.trim, selectedVehicle.modelYear, selectedVehicle.segment].filter(Boolean).join(" · ") || "Model Tanımı"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                  onClick={() => {
                    setEditingVehicleId(selectedVehicle.id);
                    setIsCreateVehicleOpen(true);
                  }}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Düzenle</span>
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  onClick={() => setSelectedVehicle(null)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Specs Banner */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-zinc-900 p-3 text-center text-white dark:bg-zinc-800">
              <div>
                <div className="text-[10px] text-zinc-400">Güç</div>
                <div className="font-bold text-xs">
                  {parseJson<{ power?: string }>(selectedVehicle.engineSpecJson, {}).power || selectedVehicle.engine || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">0-100</div>
                <div className="font-bold text-xs">
                  {parseJson<{ accel?: string }>(selectedVehicle.performanceJson, {}).accel || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Ort. Tüketim</div>
                <div className="font-bold text-xs">
                  {parseJson<{ combined?: string }>(selectedVehicle.fuelEcoJson, {}).combined || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Ref. Fiyat</div>
                <div className="font-bold text-xs text-emerald-400">
                  {selectedVehicle.priceUsd ? `$${selectedVehicle.priceUsd.toLocaleString()}` : "—"}
                </div>
              </div>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-zinc-100 pb-1 text-xs dark:border-zinc-800">
              {[
                { id: "overview", label: "Genel Bakış" },
                { id: "specs", label: "Teknik & Motor" },
                { id: "dimensions", label: "Boyutlar" },
                { id: "safety", label: "Güvenlik & ADAS" },
                { id: "warranty", label: "Garanti" },
              ].map((tab) => (
                <button
                  className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap ${
                    vehicleDetailTab === tab.id
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                  key={tab.id}
                  onClick={() => setVehicleDetailTab(tab.id as typeof vehicleDetailTab)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4 space-y-3 text-xs">
              {vehicleDetailTab === "overview" && (
                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Marka / Model:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Platform:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.platform || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Proje Kodu:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.projectCode || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Pazar & Ülke:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {[selectedVehicle.market, selectedVehicle.country].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Üretim Tesisi:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.plant || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">VIN Öneki:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.vinPrefix || "—"}
                    </span>
                  </div>
                </div>
              )}

              {vehicleDetailTab === "specs" && (
                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Motor:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedVehicle.engine || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Şanzıman:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.transmission || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Çekiş Tipi:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.driveType || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Emisyon Standardı:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.emission || "—"}</span>
                  </div>
                </div>
              )}

              {vehicleDetailTab === "dimensions" && (
                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(() => {
                    const dims = parseJson<{
                      length?: number;
                      width?: number;
                      height?: number;
                      wheelbase?: number;
                    }>(selectedVehicle.dimensionsJson, {});
                    return (
                      <>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Uzunluk:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dims.length || "—"} mm</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Genişlik:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dims.width || "—"} mm</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Yükseklik:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dims.height || "—"} mm</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Dingil Mesafesi:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {dims.wheelbase || "—"} mm
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {vehicleDetailTab === "safety" && (
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                    <span className="text-zinc-400">Hava Yastığı Sayısı:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {parseJson<{ airbags?: number }>(selectedVehicle.safetyJson, {}).airbags || 7} Adet
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 block mb-2">ADAS Sürüş Destek Sistemleri:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        parseJson<{ adas?: string[] }>(selectedVehicle.safetyJson, {}).adas || [
                          "Adaptif Hız Sabitleyici",
                          "Şerit Takip Asistanı",
                          "Otonom Acil Fren",
                        ]
                      ).map((item) => (
                        <span
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          key={item}
                        >
                          ✓ {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {vehicleDetailTab === "warranty" && (
                <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Araç Garantisi:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {parseJson<{ vehicle?: string }>(selectedVehicle.warrantyJson, {}).vehicle || "3 Yıl / 100.000 km"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Güç Aktarma Garantisi:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {parseJson<{ powertrain?: string }>(selectedVehicle.warrantyJson, {}).powertrain ||
                        "5 Yıl / 150.000 km"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Action Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 font-semibold text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                onClick={() => {
                  const v = selectedVehicle;
                  setSelectedVehicle(null);
                  handleDeleteVehicle(v.id, `${v.brand} ${v.model}`);
                }}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Aracı Sil</span>
              </button>

              <button
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-bold text-xs text-white shadow-xs hover:bg-violet-700 transition"
                onClick={() => {
                  setEditingVehicleId(selectedVehicle.id);
                  setIsCreateVehicleOpen(true);
                  setSelectedVehicle(null);
                }}
                type="button"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Spesifikasyonları Düzenle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT VEHICLE */}
      {/* ========================================================= */}
      {isCreateVehicleOpen && (
        <CreateEditVehicleModal
          initialVehicle={vehicles.find((v) => v.id === editingVehicleId) || null}
          onClose={() => setIsCreateVehicleOpen(false)}
          onSuccess={() => {
            setIsCreateVehicleOpen(false);
            showToast(editingVehicleId ? "Araç güncellendi!" : "Yeni araç oluşturuldu!");
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT PART */}
      {/* ========================================================= */}
      {isCreatePartOpen && (
        <CreateEditPartModal
          initialPart={parts.find((p) => p.id === editingPartId) || null}
          onClose={() => setIsCreatePartOpen(false)}
          onSuccess={() => {
            setIsCreatePartOpen(false);
            showToast(editingPartId ? "Parça güncellendi!" : "Yeni parça eklendi!");
            loadData();
          }}
          systems={epcSystems}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / UPLOAD DOCUMENT */}
      {/* ========================================================= */}
      {isCreateDocOpen && (
        <CreateDocumentModal
          onClose={() => setIsCreateDocOpen(false)}
          onSuccess={() => {
            setIsCreateDocOpen(false);
            showToast("Doküman başarıyla yüklendi!");
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
          vehicles={vehicles}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION (DESIGN SYSTEM) */}
      {/* ========================================================= */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteConfirmation?.isOpen)}
        loading={isDeleting}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDelete}
        subtitle={deleteConfirmation?.subtitle}
        title={deleteConfirmation?.title || ""}
        type={deleteConfirmation?.type || "vehicle"}
      />
    </div>
  );
}

// --- 1. Adım Adım Sihirbaz (Multi-step Wizard) Araç Modalı ---
function CreateEditVehicleModal({
  initialVehicle,
  tenantId,
  onClose,
  onSuccess,
}: {
  initialVehicle: VehicleSummaryDto | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // 1. Temel Bilgiler & Pazar (Temiz / Boş Başlangıç)
  const [brand, setBrand] = useState(initialVehicle?.brand || "");
  const [model, setModel] = useState(initialVehicle?.model || "");
  const [trim, setTrim] = useState(initialVehicle?.trim || "");
  const [generation, setGeneration] = useState(initialVehicle?.generation || "");
  const [platform, setPlatform] = useState(initialVehicle?.platform || "");
  const [projectCode, setProjectCode] = useState(initialVehicle?.projectCode || "");
  const [modelYear, setModelYear] = useState<number | "">(initialVehicle?.modelYear ?? "");
  const [segment, setSegment] = useState(initialVehicle?.segment || "");
  const [bodyType, setBodyType] = useState(initialVehicle?.bodyType || "");
  const [market, setMarket] = useState(initialVehicle?.market || "");
  const [country, setCountry] = useState(initialVehicle?.country || "");
  const [plant, setPlant] = useState(initialVehicle?.plant || "");
  const [vinPrefix, setVinPrefix] = useState(initialVehicle?.vinPrefix || "");
  const [status, setStatus] = useState(initialVehicle?.status || "Active");
  const [icon, setIcon] = useState(initialVehicle?.icon || "");
  const [priceUsd, setPriceUsd] = useState<number | "">(initialVehicle?.priceUsd ?? "");
  const [priceTry, setPriceTry] = useState<number | "">(initialVehicle?.priceTry ?? "");

  // 2. Güç Aktarımı & Şasi
  const [engine, setEngine] = useState(initialVehicle?.engine || "");
  const [transmission, setTransmission] = useState(initialVehicle?.transmission || "");
  const [fuel, setFuel] = useState(initialVehicle?.fuel || "");
  const [driveType, setDriveType] = useState(initialVehicle?.driveType || "");
  const [emission, setEmission] = useState(initialVehicle?.emission || "");
  const [doors, setDoors] = useState<number | "">(initialVehicle?.doors ?? "");
  const [seats, setSeats] = useState<number | "">(initialVehicle?.seats ?? "");

  const initialSuspension = initialVehicle ? JSON.parse(initialVehicle.suspensionJson || "{}") : {};
  const [suspensionFront, setSuspensionFront] = useState(initialSuspension.front || "");
  const [suspensionRear, setSuspensionRear] = useState(initialSuspension.rear || "");

  const initialBrakes = initialVehicle ? JSON.parse(initialVehicle.brakesJson || "{}") : {};
  const [brakesFront, setBrakesFront] = useState(initialBrakes.front || "");
  const [brakesRear, setBrakesRear] = useState(initialBrakes.rear || "");
  const [tyres, setTyres] = useState(initialVehicle?.tyres || "");

  // 3. Boyutlar, Ağırlıklar & Motor Performansı
  const initialDims = initialVehicle ? JSON.parse(initialVehicle.dimensionsJson || "{}") : {};
  const [length, setLength] = useState<number | "">(initialDims.length ?? "");
  const [width, setWidth] = useState<number | "">(initialDims.width ?? "");
  const [height, setHeight] = useState<number | "">(initialDims.height ?? "");
  const [wheelbase, setWheelbase] = useState<number | "">(initialDims.wheelbase ?? "");
  const [groundClearance, setGroundClearance] = useState<number | "">(initialDims.groundClearance ?? "");
  const [cargoVolume, setCargoVolume] = useState<number | "">(initialDims.cargoVolume ?? "");
  const [fuelTank, setFuelTank] = useState<number | "">(initialDims.fuelTank ?? "");

  const initialWeights = initialVehicle ? JSON.parse(initialVehicle.weightsJson || "{}") : {};
  const [curbWeight, setCurbWeight] = useState<number | "">(initialWeights.curb ?? "");
  const [gvw, setGvw] = useState<number | "">(initialWeights.gvw ?? "");
  const [payload, setPayload] = useState<number | "">(initialWeights.payload ?? "");

  const initialEngineSpec = initialVehicle ? JSON.parse(initialVehicle.engineSpecJson || "{}") : {};
  const [power, setPower] = useState(initialEngineSpec.power || "");
  const [torque, setTorque] = useState(initialEngineSpec.torque || "");
  const [displacement, setDisplacement] = useState(initialEngineSpec.displacement || "");
  const [aspiration, setAspiration] = useState(initialEngineSpec.aspiration || "");

  const initialPerformance = initialVehicle ? JSON.parse(initialVehicle.performanceJson || "{}") : {};
  const [topSpeed, setTopSpeed] = useState(initialPerformance.topSpeed || "");
  const [accel, setAccel] = useState(initialPerformance.accel || "");

  // 4. Güvenlik, Garanti & Notlar
  const initialSafety = initialVehicle ? JSON.parse(initialVehicle.safetyJson || "{}") : {};
  const [airbags, setAirbags] = useState<number | "">(initialSafety.airbags ?? "");
  const [adasString, setAdasString] = useState(
    initialSafety.adas ? initialSafety.adas.join(", ") : ""
  );

  const initialWarranty = initialVehicle ? JSON.parse(initialVehicle.warrantyJson || "{}") : {};
  const [warrantyVehicle, setWarrantyVehicle] = useState(initialWarranty.vehicle || "");
  const [warrantyPowertrain, setWarrantyPowertrain] = useState(initialWarranty.powertrain || "");
  const [warrantyCorrosion, setWarrantyCorrosion] = useState(initialWarranty.corrosion || "");

  const [notes, setNotes] = useState(initialVehicle?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  // Quick ADAS Chip Toggles
  const quickAdasOptions = [
    "Adaptif Hız Sabitleyici (ACC)",
    "Şerit Takip Asistanı (LKA)",
    "Kör Nokta Uyarısı (BSD)",
    "Otonom Acil Fren (AEB)",
    "360° Çevre Görüş Kamerası",
    "Trafik İşareti Tanıma (TSR)",
    "Arka Çapraz Trafik Uyarısı (RCTA)",
  ];

  const toggleAdasChip = (item: string) => {
    const list = adasString.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (list.includes(item)) {
      setAdasString(list.filter((x: string) => x !== item).join(", "));
    } else {
      setAdasString([...list, item].join(", "));
    }
  };

  const isStep1Valid = brand.trim().length > 0 && model.trim().length > 0;

  const handleNextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (step === 1 && !isStep1Valid) return;
    if (step < 4) {
      setStep((s) => ((s + 1) as typeof step));
    }
  };

  const handlePrevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (step > 1) {
      setStep((s) => ((s - 1) as typeof step));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      if (step < 4 && (step > 1 || isStep1Valid)) {
        handleNextStep();
      }
    }
  };

  const handleSaveVehicle = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (step !== 4) return;
    if (!brand.trim() || !model.trim() || submitting) return;

    setSubmitting(true);
    const payloadData: CreateVehiclePayload = {
      bodyType: bodyType.trim() || undefined,
      brakesJson: JSON.stringify({
        front: brakesFront.trim() || undefined,
        rear: brakesRear.trim() || undefined,
      }),
      brand: brand.trim(),
      comfortJson: JSON.stringify({}),
      country: country.trim() || undefined,
      dimensionsJson: JSON.stringify({
        cargoVolume: cargoVolume ? Number(cargoVolume) : undefined,
        fuelTank: fuelTank ? Number(fuelTank) : undefined,
        groundClearance: groundClearance ? Number(groundClearance) : undefined,
        height: height ? Number(height) : undefined,
        length: length ? Number(length) : undefined,
        wheelbase: wheelbase ? Number(wheelbase) : undefined,
        width: width ? Number(width) : undefined,
      }),
      doors: doors ? Number(doors) : undefined,
      driveType: driveType.trim() || undefined,
      emission: emission.trim() || undefined,
      engine: engine.trim() || undefined,
      engineSpecJson: JSON.stringify({
        aspiration: aspiration.trim() || undefined,
        displacement: displacement.trim() || undefined,
        power: power.trim() || undefined,
        torque: torque.trim() || undefined,
      }),
      equipmentJson: JSON.stringify([]),
      fuel: fuel.trim() || undefined,
      fuelEcoJson: JSON.stringify({}),
      generation: generation.trim() || undefined,
      icon: icon.trim() || "🚗",
      infotainmentJson: JSON.stringify({}),
      internalCode: projectCode.trim() || undefined,
      market: market.trim() || undefined,
      model: model.trim(),
      modelYear: modelYear ? Number(modelYear) : undefined,
      notes: notes.trim() || undefined,
      performanceJson: JSON.stringify({
        accel: accel.trim() || undefined,
        topSpeed: topSpeed.trim() || undefined,
      }),
      plant: plant.trim() || undefined,
      platform: platform.trim() || undefined,
      priceTry: priceTry ? Number(priceTry) : undefined,
      priceUsd: priceUsd ? Number(priceUsd) : undefined,
      projectCode: projectCode.trim() || undefined,
      safetyJson: JSON.stringify({
        adas: adasString.split(",").map((s: string) => s.trim()).filter(Boolean),
        airbags: airbags ? Number(airbags) : undefined,
      }),
      seats: seats ? Number(seats) : undefined,
      segment: segment.trim() || undefined,
      series: generation.trim() || undefined,
      status: status.trim() || "Active",
      suspensionJson: JSON.stringify({
        front: suspensionFront.trim() || undefined,
        rear: suspensionRear.trim() || undefined,
      }),
      transmission: transmission.trim() || undefined,
      trim: trim.trim() || undefined,
      tyres: tyres.trim() || undefined,
      variant: trim.trim() || undefined,
      vinPrefix: vinPrefix.trim() || undefined,
      warrantyJson: JSON.stringify({
        corrosion: warrantyCorrosion.trim() || undefined,
        powertrain: warrantyPowertrain.trim() || undefined,
        vehicle: warrantyVehicle.trim() || undefined,
      }),
      weightsJson: JSON.stringify({
        curb: curbWeight ? Number(curbWeight) : undefined,
        gvw: gvw ? Number(gvw) : undefined,
        payload: payload ? Number(payload) : undefined,
      }),
    };

    try {
      const res = initialVehicle
        ? await ApiClient.updateVehicle(initialVehicle.id, payloadData as UpdateVehiclePayload, tenantId)
        : await ApiClient.createVehicle(payloadData, tenantId);

      if (res.success) {
        onSuccess();
      } else {
        alert(res.message || "İşlem sırasında bir hata oluştu.");
      }
    } catch {
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsConfig = [
    { num: 1, title: "Genel & Pazar", desc: "Marka, model, segment ve fiyat" },
    { num: 2, title: "Güç Aktarımı", desc: "Motor, şanzıman, yakıt ve şasi" },
    { num: 3, title: "Boyut & Performans", desc: "Ölçüler, ağırlıklar, hız ve tork" },
    { num: 4, title: "Güvenlik & Garanti", desc: "ADAS, garanti ve canlı önizleme" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon || "🚗"}</span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {initialVehicle ? "Araç Modelini Düzenle" : "Yeni Araç Modeli Ekle"}
              </h3>
              {initialVehicle && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {initialVehicle.brand} {initialVehicle.model}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Adım {step} / 4: {stepsConfig[step - 1]?.title} — {stepsConfig[step - 1]?.desc}
            </p>
          </div>
          <button
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Header */}
        <div className="grid grid-cols-4 border-b border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          {stepsConfig.map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <button
                className={`flex items-center gap-2.5 rounded-xl p-2 text-left transition ${
                  isCurrent
                    ? "bg-white shadow-xs ring-1 ring-violet-500/20 dark:bg-zinc-800"
                    : isDone
                      ? "opacity-80 hover:bg-white/60 dark:hover:bg-zinc-800/60"
                      : "opacity-40"
                }`}
                key={s.num}
                onClick={() => {
                  if (s.num === 1 || isStep1Valid) {
                    setStep(s.num as typeof step);
                  }
                }}
                type="button"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                    isCurrent
                      ? "bg-violet-600 text-white shadow-xs"
                      : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {isDone ? "✓" : s.num}
                </div>
                <div className="min-w-0">
                  <div
                    className={`truncate font-semibold text-xs ${
                      isCurrent
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {s.title}
                  </div>
                  <div className="hidden sm:block truncate text-[10px] text-zinc-400">
                    {s.num === 1 && (brand ? `${brand} ${model}` : "Temel")}
                    {s.num === 2 && (engine ? `${engine}` : "Motor")}
                    {s.num === 3 && (power ? `${power}` : "Teknik")}
                    {s.num === 4 && (airbags ? `${airbags} Airbag` : "İnceleme")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Wizard Form Content */}
        <form className="flex flex-1 flex-col overflow-hidden" onKeyDown={handleKeyDown} onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4">
            {/* ADIM 1: GENEL BİLGİLER, PAZAR & ÜRETİM */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    1.1 Temel Araç Tanımı
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Marka <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Örn. ULTRAND, Toyota, Ford"
                        required
                        type="text"
                        value={brand}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Örn. Voyager, RAV4, Ranger"
                        required
                        type="text"
                        value={model}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Trim / Donanım Paketi
                      </label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setTrim(e.target.value)}
                        placeholder="Örn. Elite, Wildtrak, Premium"
                        type="text"
                        value={trim}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Model Yılı
                      </label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setModelYear(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 2025"
                        type="number"
                        value={modelYear}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Segment</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        list="segment-options"
                        onChange={(e) => setSegment(e.target.value)}
                        placeholder="C-SUV, Pickup 1-Ton, Sedan D..."
                        value={segment}
                      />
                      <datalist id="segment-options">
                        <option value="B-SUV" />
                        <option value="C-SUV" />
                        <option value="D-SUV" />
                        <option value="Pickup 1-Ton" />
                        <option value="Sedan C" />
                        <option value="Sedan D" />
                        <option value="Hatchback B" />
                        <option value="MPV" />
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Kasa Tipi</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        list="bodytype-options"
                        onChange={(e) => setBodyType(e.target.value)}
                        placeholder="SUV, Pickup, Sedan..."
                        value={bodyType}
                      />
                      <datalist id="bodytype-options">
                        <option value="SUV" />
                        <option value="Pickup" />
                        <option value="Sedan" />
                        <option value="Hatchback" />
                        <option value="MPV" />
                        <option value="Coupe" />
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    1.2 Pazar, Üretim & Fiyatlandırma
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Pazar</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setMarket(e.target.value)}
                        placeholder="Örn. TR / EU / MENA"
                        type="text"
                        value={market}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Menşe Ülke</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Türkiye, Almanya..."
                        type="text"
                        value={country}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Üretim Tesisi</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setPlant(e.target.value)}
                        placeholder="Bursa Plant..."
                        type="text"
                        value={plant}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">VIN Öneki</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 font-mono focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setVinPrefix(e.target.value)}
                        placeholder="WVU / JTM"
                        type="text"
                        value={vinPrefix}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Durum</label>
                      <select
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setStatus(e.target.value)}
                        value={status}
                      >
                        <option value="Active">Aktif (Satışta)</option>
                        <option value="Development">Geliştirme / Ar-Ge</option>
                        <option value="Discontinued">Üretim Durduruldu</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">İkon / Emoji</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-center text-base focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="🚗, 🚙, 🛻, ⚡"
                        type="text"
                        value={icon}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Fiyat (USD)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Number(e.target.value);
                          setPriceUsd(val);
                          if (typeof val === "number" && !priceTry) {
                            setPriceTry(val * 35);
                          }
                        }}
                        placeholder="Örn. 32000"
                        type="number"
                        value={priceUsd}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Fiyat (TRY)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setPriceTry(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 1120000"
                        type="number"
                        value={priceTry}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">Proje Kodu</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="ULT-VOY-01"
                      type="text"
                      value={projectCode}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">Platform</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="P300 / TNGA-K"
                      type="text"
                      value={platform}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">Nesil / Seri</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      onChange={(e) => setGeneration(e.target.value)}
                      placeholder="1st Gen"
                      type="text"
                      value={generation}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 2: GÜÇ AKTARIMI & ŞASİ */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    2.1 Güç Aktarma Organları
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Motor Adı/Tipi</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setEngine(e.target.value)}
                        placeholder="Örn. 2.0L Turbo Petrol, 2.5L Hybrid"
                        type="text"
                        value={engine}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Şanzıman</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setTransmission(e.target.value)}
                        placeholder="Örn. 8-Speed Automatic, 7-Speed DCT"
                        type="text"
                        value={transmission}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Yakıt Türü</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        list="fuel-options"
                        onChange={(e) => setFuel(e.target.value)}
                        placeholder="Benzin, Dizel, Hibrit, EV..."
                        value={fuel}
                      />
                      <datalist id="fuel-options">
                        <option value="Petrol" />
                        <option value="Diesel" />
                        <option value="Hybrid" />
                        <option value="PHEV" />
                        <option value="Electric" />
                      </datalist>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Çekiş Tipi</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        list="drive-options"
                        onChange={(e) => setDriveType(e.target.value)}
                        placeholder="FWD, RWD, AWD, 4x4..."
                        value={driveType}
                      />
                      <datalist id="drive-options">
                        <option value="FWD" />
                        <option value="RWD" />
                        <option value="AWD" />
                        <option value="4x4" />
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Emisyon Sınıfı</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setEmission(e.target.value)}
                        placeholder="Euro 6d, Euro 6e"
                        type="text"
                        value={emission}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Kapı / Koltuk</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="rounded-xl border border-zinc-200 bg-white p-2.5 text-center text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setDoors(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Kapı (5)"
                          type="number"
                          value={doors}
                        />
                        <input
                          className="rounded-xl border border-zinc-200 bg-white p-2.5 text-center text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setSeats(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Koltuk (5)"
                          type="number"
                          value={seats}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    2.2 Şasi, Süspansiyon, Frenler & Lastik
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Ön Süspansiyon</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setSuspensionFront(e.target.value)}
                        placeholder="Örn. MacPherson Strut / Çift Salıncak"
                        type="text"
                        value={suspensionFront}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Arka Süspansiyon</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setSuspensionRear(e.target.value)}
                        placeholder="Örn. Multi-Link Bağımsız / Yaprak Yay"
                        type="text"
                        value={suspensionRear}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Fren Sistemi (Ön/Arka)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setBrakesFront(e.target.value)}
                          placeholder="Ön (Havadis Disk)"
                          type="text"
                          value={brakesFront}
                        />
                        <input
                          className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setBrakesRear(e.target.value)}
                          placeholder="Arka (Disk / Kampana)"
                          type="text"
                          value={brakesRear}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Lastik Ebatları</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setTyres(e.target.value)}
                        placeholder="Örn. 235/55 R19 veya 265/60 R18"
                        type="text"
                        value={tyres}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 3: BOYUTLAR, AĞIRLIKLAR & MOTOR PERFORMANSI */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    3.1 Ölçüler (mm) & Hacimler (L)
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Uzunluk (mm)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setLength(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 4520"
                        type="number"
                        value={length}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Genişlik (mm)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setWidth(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 1840"
                        type="number"
                        value={width}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Yükseklik (mm)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 1650"
                        type="number"
                        value={height}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Dingil Mesafesi (mm)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setWheelbase(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 2680"
                        type="number"
                        value={wheelbase}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Yerden Yükseklik (mm)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setGroundClearance(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 185"
                        type="number"
                        value={groundClearance}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Bagaj Hacmi (L)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setCargoVolume(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 480"
                        type="number"
                        value={cargoVolume}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Depo Hacmi (L)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setFuelTank(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 55"
                        type="number"
                        value={fuelTank}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    3.2 Ağırlıklar (kg) & Performans Değerleri
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Boş Ağırlık (kg)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setCurbWeight(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 1480"
                        type="number"
                        value={curbWeight}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Azami Yüklü (GVW kg)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setGvw(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 1980"
                        type="number"
                        value={gvw}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">İstiap Haddi / Taşıma (kg)</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setPayload(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Örn. 500"
                        type="number"
                        value={payload}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Güç</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setPower(e.target.value)}
                        placeholder="Örn. 238 hp veya 175 kW"
                        type="text"
                        value={power}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Tork</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setTorque(e.target.value)}
                        placeholder="Örn. 350 Nm"
                        type="text"
                        value={torque}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Motor Hacmi</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setDisplacement(e.target.value)}
                        placeholder="Örn. 1998 cc"
                        type="text"
                        value={displacement}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">0-100 km/s Hızlanma</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setAccel(e.target.value)}
                        placeholder="Örn. 7.8 sn"
                        type="text"
                        value={accel}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Hız</label>
                      <input
                        className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        onChange={(e) => setTopSpeed(e.target.value)}
                        placeholder="Örn. 205 km/h"
                        type="text"
                        value={topSpeed}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADIM 4: GÜVENLİK, GARANTİ & CANLI ÖNİZLEME */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sol Kolon: Güvenlik, ADAS & Garanti Form Alanları */}
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 space-y-3">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        4.1 Güvenlik & ADAS Sistemleri
                      </h4>
                      <div className="space-y-1">
                        <label className="font-medium text-zinc-700 dark:text-zinc-300">
                          Hava Yastığı Adedi
                        </label>
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setAirbags(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Örn. 7"
                          type="number"
                          value={airbags}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-medium text-zinc-700 dark:text-zinc-300">
                          Hızlı ADAS Seçimi (Tıklayıp Ekleyin)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {quickAdasOptions.map((opt) => {
                            const isSelected = adasString.includes(opt);
                            return (
                              <button
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                                  isSelected
                                    ? "bg-violet-600 text-white"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                }`}
                                key={opt}
                                onClick={() => toggleAdasChip(opt)}
                                type="button"
                              >
                                {isSelected ? "✓ " : "+ "} {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-zinc-700 dark:text-zinc-300">
                          Tüm Güvenlik & ADAS Listesi (Virgülle ayrılmış)
                        </label>
                        <textarea
                          className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setAdasString(e.target.value)}
                          placeholder="Adaptif Hız Sabitleyici, Kör Nokta, Şerit Takip..."
                          rows={2}
                          value={adasString}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20 space-y-3">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        4.2 Garanti Koşulları & Notlar
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-medium text-zinc-700 dark:text-zinc-300">
                            Araç Garantisi
                          </label>
                          <input
                            className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            onChange={(e) => setWarrantyVehicle(e.target.value)}
                            placeholder="Örn. 3 Yıl / 100.000 km"
                            type="text"
                            value={warrantyVehicle}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium text-zinc-700 dark:text-zinc-300">
                            Güç Aktarma Garantisi
                          </label>
                          <input
                            className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            onChange={(e) => setWarrantyPowertrain(e.target.value)}
                            placeholder="Örn. 5 Yıl / 150.000 km"
                            type="text"
                            value={warrantyPowertrain}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-zinc-700 dark:text-zinc-300">Notlar</label>
                        <textarea
                          className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Model yılı revizyonları, bayi filo notları veya özel üretim detayları..."
                          rows={2}
                          value={notes}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sağ Kolon: CANLI KART ÖNİZLEMESİ (Live Mini Preview) */}
                  <div className="flex flex-col rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 p-5 shadow-xs dark:border-violet-900/40 dark:from-violet-950/20 dark:via-zinc-900 dark:to-indigo-950/20">
                    <div className="flex items-center justify-between pb-3 border-b border-violet-100 dark:border-violet-900/30">
                      <span className="font-bold text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        ✦ Canlı Katalog Kartı Önizlemesi
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {status === "Active" ? "Satışta" : status === "Development" ? "Geliştirme" : "Durduruldu"}
                      </span>
                    </div>

                    <div className="py-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md text-3xl dark:bg-zinc-800">
                          {icon || "🚗"}
                        </div>
                        <div>
                          <div className="font-black text-base text-zinc-900 dark:text-zinc-100">
                            {brand || "Marka"} {model || "Model"}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {trim || "Donanım"} • {modelYear || "2025"} • {segment || "Segment"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/80 p-3 shadow-2xs dark:bg-zinc-800/80">
                        <div>
                          <div className="text-[10px] text-zinc-400">Güç</div>
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">
                            {power || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">0-100 km/s</div>
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">
                            {accel || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">Çekiş</div>
                          <div className="font-bold text-zinc-800 dark:text-zinc-200">
                            {driveType || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <div className="flex justify-between">
                          <span>Motor:</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {engine || "—"} ({fuel || "—"})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Şanzıman:</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {transmission || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fiyat (USD):</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {priceUsd ? `$${Number(priceUsd).toLocaleString("en-US")}` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Navigasyon */}
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  key="btn-step-prev"
                  onClick={handlePrevStep}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki Adım
                </button>
              )}

              {step < 4 && (
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-violet-700 disabled:opacity-40"
                  disabled={step === 1 && !isStep1Valid}
                  key="btn-step-next"
                  onClick={handleNextStep}
                  type="button"
                >
                  Sonraki Adım
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {step === 4 && (
                <button
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  disabled={submitting || !isStep1Valid}
                  key="btn-step-save"
                  onClick={handleSaveVehicle}
                  type="button"
                >
                  {submitting ? (
                    "Kaydediliyor..."
                  ) : initialVehicle ? (
                    "✓ Değişiklikleri Kaydet"
                  ) : (
                    "✓ Aracı Kataloğa Ekle"
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 2. Gelişmiş EPC Parça Ekleme / Düzenleme Modalı (Temiz Başlangıç) ---
function CreateEditPartModal({
  initialPart,
  systems,
  tenantId,
  onClose,
  onSuccess,
}: {
  initialPart: VehiclePartDto | null;
  systems: EpcSystemDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nameTr, setNameTr] = useState(initialPart?.nameTr || "");
  const [nameEn, setNameEn] = useState(initialPart?.nameEn || "");
  const [nameCn, setNameCn] = useState(initialPart?.nameCn || "");
  const [partNumber, setPartNumber] = useState(initialPart?.partNumber || "");
  const [oemNumber, setOemNumber] = useState(initialPart?.oemNumber || "");
  const [systemId, setSystemId] = useState(initialPart?.systemId || systems[0]?.id || "");
  const [subsystemId, setSubsystemId] = useState(initialPart?.subsystemId || systems[0]?.subsystems[0]?.id || "");
  const [qtyPerAssembly, setQtyPerAssembly] = useState<number | "">(initialPart?.qtyPerAssembly ?? "");
  const [location, setLocation] = useState(initialPart?.location || "");
  const [stockQuantity, setStockQuantity] = useState<number | "">(initialPart?.stockQuantity ?? "");
  const [unitPrice, setUnitPrice] = useState<number | "">(initialPart?.unitPrice ?? "");
  const [supersession, setSupersession] = useState(initialPart?.supersession || "");
  const [compatibleModels, setCompatibleModels] = useState(
    initialPart ? JSON.parse(initialPart.compatibleModelsJson || "[]").join(", ") : ""
  );
  const [hotspotCoordX, setHotspotCoordX] = useState<number | "">(initialPart?.hotspotCoordX ?? "");
  const [hotspotCoordY, setHotspotCoordY] = useState<number | "">(initialPart?.hotspotCoordY ?? "");
  const [notes, setNotes] = useState(initialPart?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const selectedSys = systems.find((s) => s.id === systemId) || systems[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTr.trim() || !partNumber.trim() || submitting) return;

    setSubmitting(true);
    const payload: CreatePartPayload = {
      compatibleModelsJson: JSON.stringify(compatibleModels.split(",").map((s: string) => s.trim()).filter(Boolean)),
      hotspotCoordX: hotspotCoordX !== "" ? Number(hotspotCoordX) : undefined,
      hotspotCoordY: hotspotCoordY !== "" ? Number(hotspotCoordY) : undefined,
      location: location.trim() || "Motor Bölmesi",
      nameCn: nameCn.trim() || undefined,
      nameEn: nameEn.trim() || nameTr.trim(),
      nameTr: nameTr.trim(),
      notes: notes.trim() || undefined,
      oemNumber: oemNumber.trim() || undefined,
      partNumber: partNumber.trim(),
      qtyPerAssembly: qtyPerAssembly !== "" ? Number(qtyPerAssembly) : 1,
      stockQuantity: stockQuantity !== "" ? Number(stockQuantity) : 0,
      subsystemId: subsystemId || undefined,
      supersession: supersession.trim() || undefined,
      systemId: systemId || undefined,
      unitPrice: unitPrice !== "" ? Number(unitPrice) : 0,
    };

    try {
      const res = initialPart
        ? await ApiClient.updateEpcPart(initialPart.id, payload as UpdatePartPayload, tenantId)
        : await ApiClient.createEpcPart(payload, tenantId);

      if (res.success) {
        onSuccess();
      } else {
        alert(res.message || "Parça kaydedilirken bir hata oluştu.");
      }
    } catch {
      alert("Parça kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {initialPart ? "EPC Parça Kartını Düzenle" : "Yeni EPC Parçası Ekle"}
            </h3>
            <p className="text-xs text-zinc-400">Çok dilli isimlendirme (TR / EN / CN), OEM no, stok ve şema konumu</p>
          </div>
          <button className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Çok Dilli Parça Adları */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                1. Parça Tanımı & Çok Dilli Çeviriler
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Parça Adı (TR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setNameTr(e.target.value)}
                    placeholder="Örn. Silindir Kapağı"
                    required
                    type="text"
                    value={nameTr}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Part Name (EN)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Cylinder Head"
                    type="text"
                    value={nameEn}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">零件名称 (CN)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setNameCn(e.target.value)}
                    placeholder="气缸盖"
                    type="text"
                    value={nameCn}
                  />
                </div>
              </div>
            </div>

            {/* Parça Numaraları & Montaj Sistemi */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                2. Numaralandırma & Sistem Hiyerarşisi
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Parça No <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 font-mono text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="ULT-10037"
                    required
                    type="text"
                    value={partNumber}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">OEM No</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 font-mono text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setOemNumber(e.target.value)}
                    placeholder="OEM-500911"
                    type="text"
                    value={oemNumber}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Ana Sistem</label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => {
                      setSystemId(e.target.value);
                      const s = systems.find((sys) => sys.id === e.target.value);
                      if (s && s.subsystems.length > 0 && s.subsystems[0]) {
                        setSubsystemId(s.subsystems[0].id);
                      }
                    }}
                    value={systemId}
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Alt Sistem</label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setSubsystemId(e.target.value)}
                    value={subsystemId}
                  >
                    {selectedSys?.subsystems.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stok, Fiyat, Montaj & Konum */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                3. Stok, Fiyat, Konum & Şema Koordinatları
              </h4>
              <div className="grid grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Montaj Miktarı</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setQtyPerAssembly(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="1"
                    type="number"
                    value={qtyPerAssembly}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Stok Adedi</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setStockQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    type="number"
                    value={stockQuantity}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Birim Fiyat ($)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    type="number"
                    value={unitPrice}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Şema %X</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setHotspotCoordX(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="% 0-100"
                    type="number"
                    value={hotspotCoordX}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Şema %Y</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setHotspotCoordY(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="% 0-100"
                    type="number"
                    value={hotspotCoordY}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Montaj Konumu</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    list="location-options"
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Motor Bölmesi, Şasi Altı..."
                    value={location}
                  />
                  <datalist id="location-options">
                    <option value="Motor Bölmesi" />
                    <option value="Şasi Altı" />
                    <option value="Ön Aks" />
                    <option value="Arka Aks" />
                    <option value="Kabin İçi" />
                    <option value="Kaporta" />
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Süperseksiyon</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 font-mono text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setSupersession(e.target.value)}
                    placeholder="ULT-9022 → ULT-10037"
                    type="text"
                    value={supersession}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Uyumlu Modeller</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setCompatibleModels(e.target.value)}
                    placeholder="Voyager, Ranger-X..."
                    type="text"
                    value={compatibleModels}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Parça Notları</label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Montaj torku, servis bülteni bağlantısı veya revizyon notları..."
                  rows={2}
                  value={notes}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-violet-600 px-6 py-2 font-bold text-white shadow-md hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting || !nameTr.trim() || !partNumber.trim()}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : initialPart ? "Değişiklikleri Kaydet" : "Parçayı Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 3. Temiz Doküman Yükleme Modalı ---
function CreateDocumentModal({
  vehicles,
  tenantId,
  onClose,
  onSuccess,
}: {
  vehicles: VehicleSummaryDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("PDF");
  const [category, setCategory] = useState("Kullanım Kılavuzu");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [fileSize, setFileSize] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    const payload: CreateVehicleDocumentPayload = {
      category,
      documentType,
      fileSize: fileSize.trim() || "1.2 MB",
      name: name.trim(),
      tagsJson: JSON.stringify(tags.split(",").map((s: string) => s.trim()).filter(Boolean)),
      vehicleId: vehicleId || undefined,
    };

    try {
      const res = await ApiClient.createVehicleDocument(payload, tenantId);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.message || "Doküman kaydedilirken bir hata oluştu.");
      }
    } catch {
      alert("Doküman kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Teknik Doküman Yükle</h3>
            <p className="text-xs text-zinc-400">Kılavuz, Servis Bülteni (TSB), Homologasyon veya CAD dosyası</p>
          </div>
          <button className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Doküman Adı <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Voyager_Kullanim_Kilavuzu_2025.pdf"
                required
                type="text"
                value={name}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Doküman Türü</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDocumentType(e.target.value)}
                  value={documentType}
                >
                  <option value="PDF">PDF Dokümanı</option>
                  <option value="Excel">Excel / Tablo</option>
                  <option value="Word">Word Dokümanı</option>
                  <option value="CAD">CAD / 3D Model (STEP)</option>
                  <option value="TSB">Teknik Servis Bülteni</option>
                  <option value="PowerPoint">Sunum (PPTX)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Kategori</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setCategory(e.target.value)}
                  value={category}
                >
                  <option value="Kullanım Kılavuzu">Kullanım Kılavuzu</option>
                  <option value="TSB">Servis Bülteni (TSB)</option>
                  <option value="Homologasyon">Homologasyon (WVTA)</option>
                  <option value="EPC">EPC Parça Listesi</option>
                  <option value="CAD">CAD / Mühendislik</option>
                  <option value="Garanti">Garanti & Politika</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Bağlı Araç</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setVehicleId(e.target.value)}
                  value={vehicleId}
                >
                  <option value="">— Genel (Bağlı Araç Yok) —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.icon} {v.brand} {v.model} ({v.trim})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Dosya Boyutu</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="Örn. 2.4 MB"
                  type="text"
                  value={fileSize}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Etiketler (Virgülle ayırın)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setTags(e.target.value)}
                placeholder="Örn. TSB, Motor, Garanti, Homologasyon"
                type="text"
                value={tags}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-violet-600 px-6 py-2 font-bold text-white shadow-md hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting || !name.trim()}
              type="submit"
            >
              {submitting ? "Yükleniyor..." : "Dokümanı Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 4. Design System Silme Onay Modalı (Delete Confirmation Modal) ---
function DeleteConfirmationModal({
  isOpen,
  type,
  title,
  subtitle,
  loading,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  type: "vehicle" | "part" | "document";
  title: string;
  subtitle?: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    document: "Teknik Doküman",
    part: "EPC Parçası",
    vehicle: "Araç Modeli",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/30">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Kalıcı Silme Onayı
            </span>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {typeLabels[type] || "Öğe"} Silinsin mi?
            </h3>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
          <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
            {title}
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Bu işlem geri alınamaz. İlgili kayıt kalıcı olarak kaldırılacaktır.</span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 font-bold text-xs text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition"
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Evet, Sil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


