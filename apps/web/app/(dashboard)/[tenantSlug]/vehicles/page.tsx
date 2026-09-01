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
  Maximize2,
  Milestone,
  MoreVertical,
  Package,
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

  // Delete Vehicle
  const handleDeleteVehicle = async (id: string, name: string) => {
    if (!activeTenant) return;
    if (!confirm(`"${name}" aracını ve tüm teknik kartını silmek istediğinize emin misiniz?`)) return;

    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (selectedVehicle?.id === id) setSelectedVehicle(null);
    setCompareIds((prev) => prev.filter((cId) => cId !== id));

    try {
      const res = await ApiClient.deleteVehicle(id, activeTenant.id);
      if (res.success) showToast("Araç silindi.");
    } catch {
      loadData();
    }
  };

  // Delete Part
  const handleDeletePart = async (id: string, name: string) => {
    if (!activeTenant) return;
    if (!confirm(`"${name}" parçasını silmek istediğinize emin misiniz?`)) return;

    setParts((prev) => prev.filter((p) => p.id !== id));
    if (selectedPartId === id) setSelectedPartId(null);

    try {
      const res = await ApiClient.deleteEpcPart(id, activeTenant.id);
      if (res.success) showToast("Parça silindi.");
    } catch {
      loadData();
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, name: string) => {
    if (!activeTenant) return;
    if (!confirm(`"${name}" dokümanını silmek istediğinize emin misiniz?`)) return;

    setDocuments((prev) => prev.filter((d) => d.id !== id));

    try {
      const res = await ApiClient.deleteVehicleDocument(id, activeTenant.id);
      if (res.success) showToast("Doküman silindi.");
    } catch {
      loadData();
    }
  };

  // Export Comparison CSV
  const handleExportComparisonCsv = () => {
    if (comparedVehicles.length < 2) {
      showToast("Karşılaştırma için en az 2 araç seçin.");
      return;
    }

    const headers = ["Özellik", ...comparedVehicles.map((v) => `${v.brand} ${v.model} (${v.trim})`)];
    const rows: string[][] = [
      ["Segment", ...comparedVehicles.map((v) => v.segment)],
      ["Model Yılı", ...comparedVehicles.map((v) => v.modelYear.toString())],
      ["Kasa Tipi", ...comparedVehicles.map((v) => v.bodyType)],
      ["Çekiş", ...comparedVehicles.map((v) => v.driveType)],
      ["Motor", ...comparedVehicles.map((v) => v.engine)],
      ["Şanzıman", ...comparedVehicles.map((v) => v.transmission)],
      ["Yakıt", ...comparedVehicles.map((v) => v.fuel)],
      ["Fiyat USD", ...comparedVehicles.map((v) => `$${v.priceUsd.toLocaleString()}`)],
      ["Fiyat TRY", ...comparedVehicles.map((v) => `₺${v.priceTry.toLocaleString()}`)],
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
                              {v.trim} · {v.modelYear}
                            </p>
                          </div>
                        </div>

                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(v.status)}`}>
                          {getStatusLabel(v.status)}
                        </span>
                      </div>

                      {/* Pills */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {v.segment}
                        </span>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {v.fuel}
                        </span>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {v.driveType}
                        </span>
                        {v.projectCode && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 font-mono text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            {v.projectCode}
                          </span>
                        )}
                      </div>

                      {/* Specs Mini Grid */}
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
                        <div>
                          <div className="text-[10px] text-zinc-400">Güç</div>
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                            {engineSpec.power || v.engine}
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
                            ${v.priceUsd.toLocaleString()}
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
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          onClick={() => {
                            setEditingVehicleId(v.id);
                            setIsCreateVehicleOpen(true);
                          }}
                          title="Düzenle"
                          type="button"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                          onClick={() => handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)}
                          title="Sil"
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
                            <div className="text-[11px] text-zinc-400">{v.trim}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-700 dark:text-zinc-300">{v.segment}</td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{v.modelYear}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{v.engine}</div>
                        <div className="text-[11px] text-zinc-400">
                          {v.fuel} · {v.transmission}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{v.market}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ${v.priceUsd.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(v.status)}`}>
                          {getStatusLabel(v.status)}
                        </span>
                      </td>
                      <td className="py-3 pr-5 pl-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                            className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                            onClick={() => handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)}
                            title="Sil"
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
                            <div className="text-[10px] font-normal text-zinc-400">{v.trim}</div>
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
                        {v.segment}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Model Yılı</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.modelYear}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Kasa Tipi / Kapı</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.bodyType} ({v.doors} Kapı / {v.seats} Koltuk)
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Pazar & Ülke</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.market} · {v.country}
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
                        {v.engine} ({v.fuel})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Şanzıman & Çekiş</td>
                    {comparedVehicles.map((v) => (
                      <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300" key={v.id}>
                        {v.transmission} · {v.driveType}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">Maksimum Güç</td>
                    {comparedVehicles.map((v) => {
                      const spec = parseJson<{ power?: string }>(v.engineSpecJson, {});
                      return (
                        <td className="py-2.5 px-4 font-bold text-violet-700 dark:text-violet-300" key={v.id}>
                          {spec.power || v.engine}
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
                        ${v.priceUsd.toLocaleString()}
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

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">×{p.qtyPerAssembly}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">${p.unitPrice}</span>
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
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setEditingPartId(selectedPart.id);
                      setIsCreatePartOpen(true);
                    }}
                    title="Düzenle"
                    type="button"
                  >
                    <Settings className="h-4 w-4" />
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

                <div className="pt-2 flex justify-end">
                  <button
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                    onClick={() => handleDeletePart(selectedPart.id, selectedPart.nameTr)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Parçayı Sil</span>
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
                    {selectedVehicle.trim} · {selectedVehicle.modelYear} · {selectedVehicle.segment}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                  {parseJson<{ power?: string }>(selectedVehicle.engineSpecJson, {}).power || selectedVehicle.engine}
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
                  ${selectedVehicle.priceUsd.toLocaleString()}
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
                      {selectedVehicle.market} · {selectedVehicle.country}
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
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedVehicle.engine}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Şanzıman:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.transmission}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Çekiş Tipi:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.driveType}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Emisyon Standardı:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{selectedVehicle.emission}</span>
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
    </div>
  );
}

// --- 1. Comprehensive Create/Edit Vehicle Modal (100% HTML Match) ---
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
  const [tab, setTab] = useState<"general" | "production" | "powertrain" | "dimensions" | "performance" | "safety">("general");

  // General Fields
  const [brand, setBrand] = useState(initialVehicle?.brand || "ULTRAND");
  const [model, setModel] = useState(initialVehicle?.model || "");
  const [trim, setTrim] = useState(initialVehicle?.trim || "Elite");
  const [generation, setGeneration] = useState(initialVehicle?.generation || "1st Gen");
  const [platform, setPlatform] = useState(initialVehicle?.platform || "P300");
  const [projectCode, setProjectCode] = useState(initialVehicle?.projectCode || "");
  const [modelYear, setModelYear] = useState(initialVehicle?.modelYear || 2025);
  const [segment, setSegment] = useState(initialVehicle?.segment || "C-SUV");
  const [bodyType, setBodyType] = useState(initialVehicle?.bodyType || "SUV");
  const [doors, setDoors] = useState(initialVehicle?.doors || 5);
  const [seats, setSeats] = useState(initialVehicle?.seats || 5);

  // Production & Market
  const [market, setMarket] = useState(initialVehicle?.market || "TR / EU / MENA");
  const [country, setCountry] = useState(initialVehicle?.country || "Türkiye");
  const [plant, setPlant] = useState(initialVehicle?.plant || "Bursa Plant");
  const [vinPrefix, setVinPrefix] = useState(initialVehicle?.vinPrefix || "WVU");
  const [status, setStatus] = useState(initialVehicle?.status || "Active");
  const [icon, setIcon] = useState(initialVehicle?.icon || "🚙");
  const [priceUsd, setPriceUsd] = useState(initialVehicle?.priceUsd || 32000);
  const [priceTry, setPriceTry] = useState(initialVehicle?.priceTry || 1120000);

  // Powertrain
  const [engine, setEngine] = useState(initialVehicle?.engine || "2.0L Turbo Petrol");
  const [transmission, setTransmission] = useState(initialVehicle?.transmission || "8-Speed Automatic");
  const [fuel, setFuel] = useState(initialVehicle?.fuel || "Petrol");
  const [driveType, setDriveType] = useState(initialVehicle?.driveType || "AWD");
  const [emission, setEmission] = useState(initialVehicle?.emission || "Euro 6d");

  // Dimensions & Weights
  const initialDims = initialVehicle ? JSON.parse(initialVehicle.dimensionsJson || "{}") : {};
  const [length, setLength] = useState(initialDims.length || 4520);
  const [width, setWidth] = useState(initialDims.width || 1840);
  const [height, setHeight] = useState(initialDims.height || 1650);
  const [wheelbase, setWheelbase] = useState(initialDims.wheelbase || 2680);
  const [groundClearance, setGroundClearance] = useState(initialDims.groundClearance || 175);
  const [cargoVolume, setCargoVolume] = useState(initialDims.cargoVolume || 480);
  const [fuelTank, setFuelTank] = useState(initialDims.fuelTank || 55);

  const initialWeights = initialVehicle ? JSON.parse(initialVehicle.weightsJson || "{}") : {};
  const [curbWeight, setCurbWeight] = useState(initialWeights.curb || 1480);
  const [gvw, setGvw] = useState(initialWeights.gvw || 1980);
  const [payload, setPayload] = useState(initialWeights.payload || 520);

  // Engine & Performance Specs
  const initialEngineSpec = initialVehicle ? JSON.parse(initialVehicle.engineSpecJson || "{}") : {};
  const [power, setPower] = useState(initialEngineSpec.power || "238 hp");
  const [torque, setTorque] = useState(initialEngineSpec.torque || "350 Nm");
  const [displacement, setDisplacement] = useState(initialEngineSpec.displacement || "1998 cc");

  const initialPerformance = initialVehicle ? JSON.parse(initialVehicle.performanceJson || "{}") : {};
  const [topSpeed, setTopSpeed] = useState(initialPerformance.topSpeed || "205 km/h");
  const [accel, setAccel] = useState(initialPerformance.accel || "7.8 sn (0-100)");

  // Safety & Warranty
  const initialSafety = initialVehicle ? JSON.parse(initialVehicle.safetyJson || "{}") : {};
  const [airbags, setAirbags] = useState(initialSafety.airbags || 7);
  const [adasString, setAdasString] = useState(
    initialSafety.adas ? initialSafety.adas.join(", ") : "Adaptif Hız Sabitleyici, Şerit Takip Asistanı, Kör Nokta Uyarısı, Otonom Acil Fren, 360° Kamera"
  );

  const initialWarranty = initialVehicle ? JSON.parse(initialVehicle.warrantyJson || "{}") : {};
  const [warrantyVehicle, setWarrantyVehicle] = useState(initialWarranty.vehicle || "3 Yıl / 100.000 km");
  const [warrantyPowertrain, setWarrantyPowertrain] = useState(initialWarranty.powertrain || "5 Yıl / 150.000 km");

  const [notes, setNotes] = useState(initialVehicle?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim() || submitting) return;

    setSubmitting(true);
    const payloadData: CreateVehiclePayload = {
      bodyType: bodyType.trim(),
      brakesJson: JSON.stringify({ front: "Havalandırmalı Disk", rear: bodyType === "Pickup" ? "Kampana" : "Disk" }),
      brand: brand.trim(),
      comfortJson: JSON.stringify({ climate: "3 Bölgeli Klima", seats: "Deri, Isıtmalı/Soğutmalı, Elektrikli" }),
      country: country.trim(),
      dimensionsJson: JSON.stringify({ cargoVolume, fuelTank, groundClearance, height, length, wheelbase, width }),
      doors: Number(doors),
      driveType: driveType.trim(),
      emission: emission.trim(),
      engine: engine.trim(),
      engineSpecJson: JSON.stringify({ aspiration: fuel === "Electric" ? "—" : "Turbo", cylinders: fuel === "Electric" ? "—" : "4", displacement, power, torque }),
      equipmentJson: JSON.stringify(["LED Farlar", "Alaşım Jantlar", "Geri Görüş Kamerası", "Park Sensörleri", "Panoramik Cam Tavan"]),
      fuel: fuel.trim(),
      fuelEcoJson: JSON.stringify({ combined: "7.2 L/100km", urban: "8.5 L/100km", wltp: "7.4 L/100km (WLTP)" }),
      generation: generation.trim() || undefined,
      icon: icon.trim() || "🚗",
      infotainmentJson: JSON.stringify({ features: ["Apple CarPlay", "Android Auto", "Sesli Asistan"], screen: '12.3" Dokunmatik Ekran' }),
      internalCode: projectCode.trim() || undefined,
      market: market.trim(),
      model: model.trim(),
      modelYear: Number(modelYear),
      notes: notes.trim() || undefined,
      performanceJson: JSON.stringify({ accel, topSpeed }),
      plant: plant.trim() || undefined,
      platform: platform.trim() || undefined,
      priceTry: Number(priceTry) || Number(priceUsd) * 35,
      priceUsd: Number(priceUsd),
      projectCode: projectCode.trim() || undefined,
      safetyJson: JSON.stringify({ adas: adasString.split(",").map((s: string) => s.trim()).filter(Boolean), airbags }),
      seats: Number(seats),
      segment: segment.trim(),
      series: generation.trim() || undefined,
      status: status.trim(),
      suspensionJson: JSON.stringify({ front: bodyType === "Pickup" ? "Çift Yamuk Kol" : "MacPherson Strut", rear: bodyType === "Pickup" ? "Yaprak Yay (Rijit Aks)" : "Çok Bağlantılı (Multi-Link)" }),
      transmission: transmission.trim(),
      trim: trim.trim(),
      tyres: bodyType === "Pickup" ? "265/60 R18" : "235/55 R19",
      variant: trim.trim() || undefined,
      vinPrefix: vinPrefix.trim() || undefined,
      warrantyJson: JSON.stringify({ corrosion: "6 Yıl", powertrain: warrantyPowertrain, vehicle: warrantyVehicle }),
      weightsJson: JSON.stringify({ curb: curbWeight, gvw, payload }),
    };

    try {
      if (initialVehicle) {
        await ApiClient.updateVehicle(initialVehicle.id, payloadData as UpdateVehiclePayload, tenantId);
      } else {
        await ApiClient.createVehicle(payloadData, tenantId);
      }
      onSuccess();
    } catch {
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] flex flex-col">
        {/* Modal Head */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {initialVehicle ? "Araç Kartını Düzenle" : "Yeni Araç Modeli Ekle"}
            </h3>
            <p className="text-xs text-zinc-400">Teknik, ticari ve üretim spesifikasyonları</p>
          </div>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 py-2 text-xs dark:border-zinc-800">
          {[
            { id: "general", label: "1. Genel Bilgiler" },
            { id: "production", label: "2. Pazar & Üretim" },
            { id: "powertrain", label: "3. Güç Aktarımı" },
            { id: "dimensions", label: "4. Boyut & Ağırlık" },
            { id: "performance", label: "5. Motor & Performans" },
            { id: "safety", label: "6. Güvenlik & Garanti" },
          ].map((t) => (
            <button
              className={`rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap ${
                tab === t.id
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4 text-xs" onSubmit={handleSubmit}>
          {tab === "general" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Marka *</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Örn. ULTRAND, Toyota"
                  required
                  type="text"
                  value={brand}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Model *</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Örn. Voyager, RAV4"
                  required
                  type="text"
                  value={model}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Trim / Donanım</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setTrim(e.target.value)}
                  placeholder="Elite / Comfort / Wildtrak"
                  type="text"
                  value={trim}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Nesil / Generation</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setGeneration(e.target.value)}
                  placeholder="1st Gen / 5th Gen"
                  type="text"
                  value={generation}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Platform</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="P300 / TNGA-K / MQB Evo"
                  type="text"
                  value={platform}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Proje Kodu</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="ULT-VOY-01"
                  type="text"
                  value={projectCode}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Model Yılı</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setModelYear(Number(e.target.value))}
                  type="number"
                  value={modelYear}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Segment</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setSegment(e.target.value)}
                  value={segment}
                >
                  <option value="B-SUV">B-SUV</option>
                  <option value="C-SUV">C-SUV</option>
                  <option value="D-SUV">D-SUV</option>
                  <option value="Pickup 1-Ton">Pickup 1-Ton</option>
                  <option value="Sedan C">Sedan C</option>
                  <option value="Sedan D">Sedan D</option>
                  <option value="Hatchback B">Hatchback B</option>
                  <option value="MPV">MPV</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Kasa Tipi</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setBodyType(e.target.value)}
                  value={bodyType}
                >
                  <option value="SUV">SUV</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="MPV">MPV</option>
                  <option value="Coupe">Coupe</option>
                </select>
              </div>
            </div>
          )}

          {tab === "production" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Hedef Pazar</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder="TR / EU / MENA / Global"
                  type="text"
                  value={market}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Menşe Ülke</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Türkiye / Japonya / Almanya"
                  type="text"
                  value={country}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Üretim Tesisi</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setPlant(e.target.value)}
                  placeholder="Bursa Plant"
                  type="text"
                  value={plant}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">VIN Öneki</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setVinPrefix(e.target.value)}
                  placeholder="WVU / JTM / WVG"
                  type="text"
                  value={vinPrefix}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Durum</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setStatus(e.target.value)}
                  value={status}
                >
                  <option value="Active">Aktif (Satışta)</option>
                  <option value="Development">Geliştirme / Ar-Ge</option>
                  <option value="Discontinued">Üretim Durduruldu</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">İkon (Emoji)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🚙, 🛻, 🚗, ⚡"
                  type="text"
                  value={icon}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Referans Fiyat (USD)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => {
                    const usd = Number(e.target.value);
                    setPriceUsd(usd);
                    setPriceTry(usd * 35);
                  }}
                  type="number"
                  value={priceUsd}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Referans Fiyat (TRY)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setPriceTry(Number(e.target.value))}
                  type="number"
                  value={priceTry}
                />
              </div>
            </div>
          )}

          {tab === "powertrain" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Motor</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setEngine(e.target.value)}
                  placeholder="2.0L Turbo Petrol"
                  type="text"
                  value={engine}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Şanzıman</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setTransmission(e.target.value)}
                  placeholder="8-Speed Automatic"
                  type="text"
                  value={transmission}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Yakıt Tipi</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setFuel(e.target.value)}
                  value={fuel}
                >
                  <option value="Petrol">Benzin (Petrol)</option>
                  <option value="Diesel">Dizel (Diesel)</option>
                  <option value="Hybrid">Hibrit (Hybrid)</option>
                  <option value="PHEV">Plug-in Hibrit (PHEV)</option>
                  <option value="Electric">Elektrikli (EV)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Çekiş Tipi</label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDriveType(e.target.value)}
                  value={driveType}
                >
                  <option value="FWD">Önden Çekiş (FWD)</option>
                  <option value="RWD">Arkadan İtiş (RWD)</option>
                  <option value="AWD">Dört Tekerden Çekiş (AWD)</option>
                  <option value="4x4">Arazi 4x4 (4WD)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Emisyon</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setEmission(e.target.value)}
                  placeholder="Euro 6d / Euro 6e"
                  type="text"
                  value={emission}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Kapı / Koltuk</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-center text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setDoors(Number(e.target.value))}
                    placeholder="Kapı"
                    type="number"
                    value={doors}
                  />
                  <input
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-center text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setSeats(Number(e.target.value))}
                    placeholder="Koltuk"
                    type="number"
                    value={seats}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "dimensions" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Uzunluk (mm)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setLength(Number(e.target.value))}
                    type="number"
                    value={length}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Genişlik (mm)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setWidth(Number(e.target.value))}
                    type="number"
                    value={width}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Yükseklik (mm)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setHeight(Number(e.target.value))}
                    type="number"
                    value={height}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Dingil Mesafesi (mm)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setWheelbase(Number(e.target.value))}
                    type="number"
                    value={wheelbase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Boş Ağırlık (kg)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setCurbWeight(Number(e.target.value))}
                    type="number"
                    value={curbWeight}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Azami Yüklü Ağırlık (GVW kg)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setGvw(Number(e.target.value))}
                    type="number"
                    value={gvw}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Bagaj Hacmi (L)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setCargoVolume(Number(e.target.value))}
                    type="number"
                    value={cargoVolume}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "performance" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Güç</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setPower(e.target.value)}
                  placeholder="238 hp"
                  type="text"
                  value={power}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Tork</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setTorque(e.target.value)}
                  placeholder="350 Nm"
                  type="text"
                  value={torque}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Motor Hacmi</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDisplacement(e.target.value)}
                  placeholder="1998 cc"
                  type="text"
                  value={displacement}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">0-100 km/s Hızlanma</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setAccel(e.target.value)}
                  placeholder="7.8 sn (0-100)"
                  type="text"
                  value={accel}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Maksimum Hız</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setTopSpeed(e.target.value)}
                  placeholder="205 km/h"
                  type="text"
                  value={topSpeed}
                />
              </div>
            </div>
          )}

          {tab === "safety" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Hava Yastığı</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setAirbags(Number(e.target.value))}
                    type="number"
                    value={airbags}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Araç Garantisi</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setWarrantyVehicle(e.target.value)}
                    placeholder="3 Yıl / 100.000 km"
                    type="text"
                    value={warrantyVehicle}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">Güç Aktarma Garantisi</label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setWarrantyPowertrain(e.target.value)}
                    placeholder="5 Yıl / 150.000 km"
                    type="text"
                    value={warrantyPowertrain}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">ADAS Özellikleri (Virgülle ayırın)</label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setAdasString(e.target.value)}
                  placeholder="Adaptif Hız Sabitleyici, Şerit Takip, Kör Nokta Uyarısı"
                  type="text"
                  value={adasString}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">Notlar</label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bu araçla ilgili mühendislik, bayi veya filo notları..."
                  rows={2}
                  value={notes}
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : initialVehicle ? "Değişiklikleri Kaydet" : "Aracı Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 2. Comprehensive Create/Edit Part Modal (100% HTML Match) ---
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
  const [partNumber, setPartNumber] = useState(initialPart?.partNumber || "ULT-10001");
  const [oemNumber, setOemNumber] = useState(initialPart?.oemNumber || "OEM-500001");
  const [systemId, setSystemId] = useState(initialPart?.systemId || systems[0]?.id || "");
  const [subsystemId, setSubsystemId] = useState(initialPart?.subsystemId || systems[0]?.subsystems[0]?.id || "");
  const [qtyPerAssembly, setQtyPerAssembly] = useState(initialPart?.qtyPerAssembly || 1);
  const [location, setLocation] = useState(initialPart?.location || "Motor Bölmesi");
  const [stockQuantity, setStockQuantity] = useState(initialPart?.stockQuantity || 50);
  const [unitPrice, setUnitPrice] = useState(initialPart?.unitPrice || 120);
  const [supersession, setSupersession] = useState(initialPart?.supersession || "—");
  const [compatibleModels, setCompatibleModels] = useState(
    initialPart ? JSON.parse(initialPart.compatibleModelsJson || "[]").join(", ") : "ULTRAND Voyager, Ranger-X"
  );
  const [hotspotCoordX, setHotspotCoordX] = useState(initialPart?.hotspotCoordX || 45);
  const [hotspotCoordY, setHotspotCoordY] = useState(initialPart?.hotspotCoordY || 35);
  const [notes, setNotes] = useState(initialPart?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const selectedSys = systems.find((s) => s.id === systemId) || systems[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTr.trim() || !partNumber.trim() || submitting) return;

    setSubmitting(true);
    const payload: CreatePartPayload = {
      compatibleModelsJson: JSON.stringify(compatibleModels.split(",").map((s: string) => s.trim()).filter(Boolean)),
      hotspotCoordX: Number(hotspotCoordX),
      hotspotCoordY: Number(hotspotCoordY),
      location: location.trim(),
      nameCn: nameCn.trim() || undefined,
      nameEn: nameEn.trim() || nameTr.trim(),
      nameTr: nameTr.trim(),
      notes: notes.trim() || undefined,
      oemNumber: oemNumber.trim() || undefined,
      partNumber: partNumber.trim(),
      qtyPerAssembly: Number(qtyPerAssembly),
      stockQuantity: Number(stockQuantity),
      subsystemId: subsystemId || undefined,
      supersession: supersession.trim() || "—",
      systemId: systemId || undefined,
      unitPrice: Number(unitPrice),
    };

    try {
      if (initialPart) {
        await ApiClient.updateEpcPart(initialPart.id, payload as UpdatePartPayload, tenantId);
      } else {
        await ApiClient.createEpcPart(payload, tenantId);
      }
      onSuccess();
    } catch {
      alert("Parça kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {initialPart ? "Parçayı Düzenle" : "Yeni EPC Parça Ekle"}
            </h3>
            <p className="text-xs text-zinc-400">3 Dilli (TR / EN / CN) Parça & OEM Kartı</p>
          </div>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5 text-xs" onSubmit={handleSubmit}>
          {/* Multilingual Names */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Parça Adı (TR) *</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Cylinder Head"
                type="text"
                value={nameEn}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">零件名称 (CN)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setNameCn(e.target.value)}
                placeholder="气缸盖"
                type="text"
                value={nameCn}
              />
            </div>
          </div>

          {/* Numbers & System Selection */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Parça Numarası *</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="ULT-10037"
                required
                type="text"
                value={partNumber}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">OEM Numarası</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setOemNumber(e.target.value)}
                placeholder="OEM-500911"
                type="text"
                value={oemNumber}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Montaj Sistemi</label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
          </div>

          {/* Subsystem, Qty & Location */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Alt Sistem</label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Montaj Başına Miktar</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setQtyPerAssembly(Number(e.target.value))}
                type="number"
                value={qtyPerAssembly}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Konum</label>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setLocation(e.target.value)}
                value={location}
              >
                <option value="Motor Bölmesi">Motor Bölmesi</option>
                <option value="Şasi Altı">Şasi Altı</option>
                <option value="Ön Aks">Ön Aks</option>
                <option value="Arka Aks">Arka Aks</option>
                <option value="Kabin İçi">Kabin İçi</option>
                <option value="Kaporta">Kaporta</option>
              </select>
            </div>
          </div>

          {/* Stock, Price & Hotspot */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Stok Miktarı</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                type="number"
                value={stockQuantity}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Birim Fiyat (USD)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                type="number"
                value={unitPrice}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Şema X (% 0-100)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setHotspotCoordX(Number(e.target.value))}
                type="number"
                value={hotspotCoordX}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Şema Y (% 0-100)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setHotspotCoordY(Number(e.target.value))}
                type="number"
                value={hotspotCoordY}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Süperseksiyon (Değişen Parça)</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 font-mono dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setSupersession(e.target.value)}
                placeholder="ULT-9022 → ULT-10037"
                type="text"
                value={supersession}
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">Uyumlu Modeller</label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setCompatibleModels(e.target.value)}
                placeholder="ULTRAND Voyager, Ranger-X"
                type="text"
                value={compatibleModels}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">Notlar</label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Montaj torku, revizyon veya servis uyarıları..."
              rows={2}
              value={notes}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : initialPart ? "Değişiklikleri Kaydet" : "Parça Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 3. Create / Upload Document Modal ---
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
  const [fileSize, setFileSize] = useState("2.4 MB");
  const [tags, setTags] = useState("Kılavuz, Servis");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    const payload: CreateVehicleDocumentPayload = {
      category,
      documentType,
      fileSize,
      name: name.trim(),
      tagsJson: JSON.stringify(tags.split(",").map((s) => s.trim()).filter(Boolean)),
      vehicleId: vehicleId || undefined,
    };

    try {
      await ApiClient.createVehicleDocument(payload, tenantId);
      onSuccess();
    } catch {
      alert("Doküman kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Teknik Doküman Yükle</h3>
            <p className="text-xs text-zinc-400">TSB, Homologasyon, Kılavuz veya CAD dosyası</p>
          </div>
          <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">Doküman Dosya Adı *</label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setFileSize(e.target.value)}
                placeholder="2.4 MB / 860 KB"
                type="text"
                value={fileSize}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">Etiketler (Virgülle ayırın)</label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-zinc-900 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) => setTags(e.target.value)}
              placeholder="TSB, Motor, Garanti, Homologasyon"
              type="text"
              value={tags}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting}
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

