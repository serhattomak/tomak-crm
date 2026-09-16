"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "table">(
    "grid"
  );

  // Catalog Filters
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Compare State (Array of vehicle IDs)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // EPC State
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(
    null
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [epcSearch, setEpcSearch] = useState("");

  // Documents Filter & Preview
  const [docSearch, setDocSearch] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [selectedPreviewDoc, setSelectedPreviewDoc] =
    useState<VehicleDocumentDto | null>(null);

  // Detail Drawers & Modals
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleSummaryDto | null>(null);
  const [vehicleDetailTab, setVehicleDetailTab] = useState<
    | "overview"
    | "specs"
    | "dimensions"
    | "safety"
    | "equipment"
    | "warranty"
    | "docs"
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
    if (!activeTenant) {
      return;
    }
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
  const brands = Array.from(
    new Set(vehicles.map((v) => v.brand).filter((b): b is string => Boolean(b)))
  ).sort();
  const segments = Array.from(
    new Set(
      vehicles.map((v) => v.segment).filter((s): s is string => Boolean(s))
    )
  ).sort();

  // Filtered Vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const hay =
      `${v.brand} ${v.model} ${v.trim} ${v.projectCode || ""} ${v.vinPrefix || ""}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) {
      return false;
    }
    if (selectedBrand && v.brand !== selectedBrand) {
      return false;
    }
    if (selectedSegment && v.segment !== selectedSegment) {
      return false;
    }
    if (selectedStatus && v.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Filtered Parts
  const filteredParts = parts.filter((p) => {
    if (selectedSystemId && p.systemId !== selectedSystemId) {
      return false;
    }
    if (selectedSubsystemId && p.subsystemId !== selectedSubsystemId) {
      return false;
    }
    if (epcSearch) {
      const s = epcSearch.toLowerCase();
      const match =
        p.partNumber.toLowerCase().includes(s) ||
        (p.oemNumber && p.oemNumber.toLowerCase().includes(s)) ||
        p.nameTr.toLowerCase().includes(s) ||
        p.nameEn.toLowerCase().includes(s) ||
        (p.nameCn && p.nameCn.toLowerCase().includes(s)) ||
        (p.location && p.location.toLowerCase().includes(s));
      if (!match) {
        return false;
      }
    }
    return true;
  });

  // Filtered Documents
  const filteredDocuments = documents.filter((doc) => {
    if (docCategoryFilter && doc.category !== docCategoryFilter) {
      return false;
    }
    if (
      docTypeFilter &&
      doc.documentType.toUpperCase() !== docTypeFilter.toUpperCase()
    ) {
      return false;
    }
    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchCategory = doc.category.toLowerCase().includes(q);
      const matchVehicle = doc.vehicleName?.toLowerCase().includes(q);
      const tags = parseJson<string[]>(doc.tagsJson, []);
      const matchTags = tags.some((t) => t.toLowerCase().includes(q));
      if (!(matchName || matchCategory || matchVehicle || matchTags)) {
        return false;
      }
    }
    return true;
  });

  // Selected EPC Part object
  const selectedPart =
    parts.find((p) => p.id === selectedPartId) || filteredParts[0] || null;

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
    if (!jsonStr) {
      return fallback;
    }
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
        return "bg-zinc-100 text-zinc-700 border-border dark:bg-zinc-800 dark:text-zinc-300";
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
      id,
      isOpen: true,
      subtitle:
        "Bu araca ait tüm teknik spesifikasyonlar, performans ve garanti kayıtları silinecektir.",
      title: name,
      type: "vehicle",
    });
  };

  const handleDeletePart = (id: string, name: string) => {
    setDeleteConfirmation({
      id,
      isOpen: true,
      subtitle:
        "Bu parça elektronik parça kataloğundan ve patlatılmış şema montaj konumlarından kaldırılacaktır.",
      title: name,
      type: "part",
    });
  };

  const handleDeleteDocument = (id: string, name: string) => {
    setDeleteConfirmation({
      id,
      isOpen: true,
      subtitle:
        "Bu servis bülteni / teknik doküman kalıcı olarak arşivden silinecektir.",
      title: name,
      type: "document",
    });
  };

  const confirmDelete = async () => {
    if (!(deleteConfirmation && activeTenant) || isDeleting) {
      return;
    }
    setIsDeleting(true);

    const { id, type } = deleteConfirmation;

    try {
      if (type === "vehicle") {
        setVehicles((prev) => prev.filter((v) => v.id !== id));
        if (selectedVehicle?.id === id) {
          setSelectedVehicle(null);
        }
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
        if (selectedPartId === id) {
          setSelectedPartId(null);
        }
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

    const headers = [
      "Özellik",
      ...comparedVehicles.map(
        (v) => `${v.brand} ${v.model}${v.trim ? ` (${v.trim})` : ""}`
      ),
    ];
    const rows: string[][] = [
      ["Segment", ...comparedVehicles.map((v) => v.segment || "")],
      [
        "Model Yılı",
        ...comparedVehicles.map((v) =>
          v.modelYear ? v.modelYear.toString() : ""
        ),
      ],
      ["Kasa Tipi", ...comparedVehicles.map((v) => v.bodyType || "")],
      ["Çekiş", ...comparedVehicles.map((v) => v.driveType || "")],
      ["Motor", ...comparedVehicles.map((v) => v.engine || "")],
      ["Şanzıman", ...comparedVehicles.map((v) => v.transmission || "")],
      ["Yakıt", ...comparedVehicles.map((v) => v.fuel || "")],
      [
        "Fiyat USD",
        ...comparedVehicles.map((v) =>
          v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : ""
        ),
      ],
      [
        "Fiyat TRY",
        ...comparedVehicles.map((v) =>
          v.priceTry ? `₺${v.priceTry.toLocaleString()}` : ""
        ),
      ],
    ];

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `arac_karsilastirma_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Karşılaştırma CSV dosyası indirildi.");
  };

  return (
    <PageContainer className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-border border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link
              className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200"
              href={`/${tenantSlug}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              Otomotiv & Araçlar
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Otomotiv & Araç İstihbarat Platformu
            </h1>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              ULTRAND Engine
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Araç teknik kataloğu, çoklu kıyaslama masası, patlatılmış şemalı EPC
            parça kataloğu ve servis bültenleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "catalog" && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-95"
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
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-95"
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
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-95"
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
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs">Toplam Araç Modeli</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
            {vehicles.length}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {vehicles.filter((v) => v.status === "Active").length} Aktif ·{" "}
            {vehicles.filter((v) => v.status === "Development").length} Ar-Ge
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs">Marka Portföyü</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
            {brands.length}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Kendi Modellerimiz + Rakipler
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs">EPC Yedek Parça</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
            {parts.length}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {epcSystems.length} Ana Montaj Sisteminde
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs">Teknik Doküman & TSB</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-2xl text-zinc-900 dark:text-zinc-100">
            {documents.length}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Kılavuzlar, Homologasyon & CAD
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-border border-b">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "catalog"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
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
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("compare")}
          type="button"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Araç Karşılaştırma & Benchmarking</span>
          {compareIds.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-[10px] text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
              {compareIds.length} Seçili
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "epc"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
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
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
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
                  className="w-full rounded-xl border border-border bg-card py-2 pr-3 pl-9 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Marka, model, proje kodu, VIN ara..."
                  type="text"
                  value={search}
                />
              </div>

              {/* Brand Filter */}
              <Select
                onValueChange={(val) =>
                  setSelectedBrand(val === "ALL" ? "" : val)
                }
                value={selectedBrand || "ALL"}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Tüm Markalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Markalar</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Segment Filter */}
              <Select
                onValueChange={(val) =>
                  setSelectedSegment(val === "ALL" ? "" : val)
                }
                value={selectedSegment || "ALL"}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Tüm Segmentler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Segmentler</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                onValueChange={(val) =>
                  setSelectedStatus(val === "ALL" ? "" : val)
                }
                value={selectedStatus || "ALL"}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                  <SelectItem value="Active">Aktif</SelectItem>
                  <SelectItem value="Development">Geliştirme</SelectItem>
                  <SelectItem value="Discontinued">Durduruldu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                className={`rounded-xl p-2 transition ${ catalogViewMode === "grid" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-border bg-card text-zinc-500 hover:bg-zinc-50" }`}
                onClick={() => setCatalogViewMode("grid")}
                title="Kart Görünümü"
                type="button"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={`rounded-xl p-2 transition ${ catalogViewMode === "table" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-border bg-card text-zinc-500 hover:bg-zinc-50" }`}
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
                const engineSpec = parseJson<{
                  power?: string;
                  torque?: string;
                }>(v.engineSpecJson, {});
                const performance = parseJson<{ accel?: string }>(
                  v.performanceJson,
                  {}
                );

                return (
                  <div
                    className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
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
                              {[v.trim, v.modelYear]
                                .filter(Boolean)
                                .join(" · ") || "Model"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-md border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(v.status)}`}
                        >
                          {getStatusLabel(v.status)}
                        </span>
                      </div>

                      {/* Pills */}
                      <div className="mt-3 flex min-h-[22px] flex-wrap gap-1.5 font-semibold text-[10px]">
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
                        {!(
                          v.segment ||
                          v.fuel ||
                          v.driveType ||
                          v.projectCode
                        ) && (
                          <span className="text-[11px] text-zinc-400 italic">
                            Temel Tanım
                          </span>
                        )}
                      </div>

                      {/* Specs Mini Grid */}
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-zinc-50/70 p-2.5 text-center dark:bg-zinc-800/40">
                        <div>
                          <div className="text-[10px] text-zinc-400">Güç</div>
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                            {engineSpec.power || v.engine || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">
                            0-100 km/s
                          </div>
                          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                            {performance.accel || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400">
                            Ref. Fiyat
                          </div>
                          <div className="font-bold text-emerald-600 text-xs dark:text-emerald-400">
                            {v.priceUsd
                              ? `$${v.priceUsd.toLocaleString()}`
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 flex items-center justify-between border-border border-t pt-3">
                      <button
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold text-xs transition ${ isCompared ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300" : "border-border text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800" }`}
                        onClick={() => toggleCompare(v.id)}
                        type="button"
                      >
                        {isCompared ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingUp className="h-3.5 w-3.5" />
                        )}
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
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50"
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
                          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                          onClick={() =>
                            handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)
                          }
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
                <div className="col-span-full rounded-3xl border border-border border-dashed bg-card py-16 text-center">
                  <Car className="mx-auto h-10 w-10 text-zinc-400" />
                  <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    Arama Kriterlerine Uygun Araç Bulunamadı
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Filtreleri sıfırlayabilir veya sağ üstteki "+ Yeni Araç
                    Ekle" butonuyla yeni bir model oluşturabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {catalogViewMode === "table" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50/70 font-semibold text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                    <TableHead className="py-3 pr-4 pl-5 h-auto">Araç & Model</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Segment</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Model Yılı</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Motor & Yakıt</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Pazar</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Ref. Fiyat (USD)</TableHead>
                    <TableHead className="px-4 py-3 h-auto">Durum</TableHead>
                    <TableHead className="py-3 pr-5 pl-4 text-right h-auto">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredVehicles.map((v) => (
                    <TableRow
                      className="cursor-pointer transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60"
                      key={v.id}
                      onClick={() => {
                        setSelectedVehicle(v);
                        setVehicleDetailTab("overview");
                      }}
                    >
                      <TableCell className="py-3 pr-4 pl-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{v.icon}</span>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {v.brand} {v.model}
                            </div>
                            {v.trim && (
                              <div className="text-[11px] text-zinc-400">
                                {v.trim}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        {v.segment || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {v.modelYear || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {v.engine || "—"}
                        </div>
                        {(v.fuel || v.transmission) && (
                          <div className="text-[11px] text-zinc-400">
                            {[v.fuel, v.transmission]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {v.market || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(v.status)}`}
                        >
                          {getStatusLabel(v.status)}
                        </span>
                      </TableCell>
                      <TableCell
                        className="py-3 pr-5 pl-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50"
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
                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                            onClick={() =>
                              handleDeleteVehicle(v.id, `${v.brand} ${v.model}`)
                            }
                            title="Aracı Sil"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Karşılaştırma Masası ({comparedVehicles.length} Araç)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kendi modellerinizi ve rakipleri tüm teknik ve ticari boyutlarda
                yan yana kıyaslayın
              </p>

              {/* Selected Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {comparedVehicles.map((v) => (
                  <span
                    className="flex items-center gap-2 rounded-xl border border-border bg-zinc-50 px-2.5 py-1 font-semibold text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
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
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:text-zinc-200"
                onClick={handleExportComparisonCsv}
                type="button"
              >
                <Download className="h-4 w-4" />
                <span>CSV İndir</span>
              </button>

              <button
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                onClick={() => window.print()}
                type="button"
              >
                <Printer className="h-4 w-4" />
                <span>Yazdır / PDF</span>
              </button>
            </div>
          </div>

          {comparedVehicles.length < 2 ? (
            <div className="rounded-3xl border border-border border-dashed bg-card py-16 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-zinc-400" />
              <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Karşılaştırma için en az 2 araç seçin
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                "Araç Kataloğu" sekmesine giderek dilediğiniz araçların
                altındaki "Kıyasla" butonuna tıklayabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xs">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50/70 dark:bg-zinc-800/50">
                    <TableHead className="w-56 py-4 pr-4 pl-5 font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300 h-auto">
                      Özellik Grubu
                    </TableHead>
                    {comparedVehicles.map((v) => (
                      <TableHead
                        className="min-w-[180px] px-4 py-4 font-bold text-zinc-900 dark:text-zinc-100 h-auto"
                        key={v.id}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{v.icon}</span>
                          <div>
                            <div>
                              {v.brand} {v.model}
                            </div>
                            {v.trim && (
                              <div className="font-normal text-[10px] text-zinc-400">
                                {v.trim}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {/* Category: GENEL & KASA */}
                  <TableRow className="bg-zinc-100/60 font-bold text-[11px] text-blue-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-blue-400">
                    <TableCell
                      className="py-2.5 pr-4 pl-5"
                      colSpan={comparedVehicles.length + 1}
                    >
                      1. Genel Bilgiler & Kasa
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Segment
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200"
                        key={v.id}
                      >
                        {v.segment || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Model Yılı
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                        key={v.id}
                      >
                        {v.modelYear || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Kasa Tipi / Kapı
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                        key={v.id}
                      >
                        {v.bodyType || "—"}
                        {v.doors || v.seats
                          ? ` (${[v.doors ? `${v.doors} Kapı` : null, v.seats ? `${v.seats} Koltuk` : null].filter(Boolean).join(" / ")})`
                          : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Pazar & Ülke
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                        key={v.id}
                      >
                        {[v.market, v.country].filter(Boolean).join(" · ") ||
                          "—"}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Category: MOTOR & PERFORMANS */}
                  <TableRow className="bg-zinc-100/60 font-bold text-[11px] text-blue-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-blue-400">
                    <TableCell
                      className="py-2.5 pr-4 pl-5"
                      colSpan={comparedVehicles.length + 1}
                    >
                      2. Motor & Güç Aktarımı
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Motor & Yakıt
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200"
                        key={v.id}
                      >
                        {v.engine || v.fuel
                          ? `${v.engine || "—"}${v.fuel ? ` (${v.fuel})` : ""}`
                          : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Şanzıman & Çekiş
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                        key={v.id}
                      >
                        {[v.transmission, v.driveType]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Maksimum Güç
                    </TableCell>
                    {comparedVehicles.map((v) => {
                      const spec = parseJson<{ power?: string }>(
                        v.engineSpecJson,
                        {}
                      );
                      return (
                        <TableCell
                          className="px-4 py-2.5 font-bold text-blue-700 dark:text-blue-300"
                          key={v.id}
                        >
                          {spec.power || v.engine || "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      0-100 km/s Hızlanma
                    </TableCell>
                    {comparedVehicles.map((v) => {
                      const perf = parseJson<{ accel?: string }>(
                        v.performanceJson,
                        {}
                      );
                      return (
                        <TableCell
                          className="px-4 py-2.5 font-semibold text-zinc-800 dark:text-zinc-200"
                          key={v.id}
                        >
                          {perf.accel || "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {/* Category: FİYAT & GARANTİ */}
                  <TableRow className="bg-zinc-100/60 font-bold text-[11px] text-blue-700 uppercase tracking-wider dark:bg-zinc-800/80 dark:text-blue-400">
                    <TableCell
                      className="py-2.5 pr-4 pl-5"
                      colSpan={comparedVehicles.length + 1}
                    >
                      3. Fiyatlandırma & Garanti
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Referans Fiyat (USD)
                    </TableCell>
                    {comparedVehicles.map((v) => (
                      <TableCell
                        className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400"
                        key={v.id}
                      >
                        {v.priceUsd ? `$${v.priceUsd.toLocaleString()}` : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-2.5 pr-4 pl-5 font-medium text-zinc-500">
                      Araç Garantisi
                    </TableCell>
                    {comparedVehicles.map((v) => {
                      const w = parseJson<{ vehicle?: string }>(
                        v.warrantyJson,
                        {}
                      );
                      return (
                        <TableCell
                          className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300"
                          key={v.id}
                        >
                          {w.vehicle || "3 Yıl / 100.000 km"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EPC (ELECTRONIC PARTS CATALOG) */}
      {/* ========================================================= */}
      {activeTab === "epc" && (
        <div className="grid min-h-[600px] grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Panel: Systems Tree (Col 3) */}
          <div className="max-h-[700px] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xs lg:col-span-3">
            <div className="mb-3 font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              Sistem Ağacı (Montaj Grupları)
            </div>

            <div className="space-y-1">
              {epcSystems.map((sys) => {
                const isSelected = selectedSystemId === sys.id;

                return (
                  <div className="space-y-0.5" key={sys.id}>
                    <button
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 font-semibold text-xs transition ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
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
                      <div className="mt-1 ml-3 space-y-0.5 border-blue-200 border-l-2 pl-6 dark:border-blue-900">
                        {sys.subsystems.map((sub) => (
                          <button
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-medium text-[11px] transition ${
                              selectedSubsystemId === sub.id
                                ? "bg-blue-100/80 font-bold text-blue-900 dark:bg-blue-900/50 dark:text-blue-200"
                                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            }`}
                            key={sub.id}
                            onClick={() => setSelectedSubsystemId(sub.id)}
                            type="button"
                          >
                            <span>{sub.name}</span>
                            <span className="text-[10px] opacity-70">
                              {sub.partsCount}
                            </span>
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
          <div className="space-y-4 lg:col-span-6">
            {/* Exploded View Figure Card */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  Patlatılmış Şema & Hotspotlar (Exploded View)
                </span>
                <span className="text-[10px] text-zinc-400">
                  Şemadaki numaralara tıklayarak parçayı seçin
                </span>
              </div>

              {/* Interactive SVG Diagram with Hotspots */}
              <div className="relative flex h-60 w-full items-center justify-center overflow-hidden rounded-xl border border-border border-dashed bg-zinc-50 dark:bg-zinc-800/50">
                <svg className="h-full w-full opacity-60" viewBox="0 0 400 220">
                  <rect
                    fill="currentColor"
                    height="90"
                    opacity="0.15"
                    rx="16"
                    width="220"
                    x="90"
                    y="65"
                  />
                  <circle
                    cx="130"
                    cy="170"
                    fill="currentColor"
                    opacity="0.3"
                    r="22"
                  />
                  <circle
                    cx="270"
                    cy="170"
                    fill="currentColor"
                    opacity="0.3"
                    r="22"
                  />
                  <rect
                    fill="currentColor"
                    height="40"
                    opacity="0.2"
                    rx="10"
                    width="140"
                    x="130"
                    y="40"
                  />
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

                  const defaultPos = defaultPositions[
                    index % defaultPositions.length
                  ] || { x: 50, y: 50 };
                  const pos = {
                    x: part.hotspotCoordX ?? defaultPos.x,
                    y: part.hotspotCoordY ?? defaultPos.y,
                  };

                  const isHotspotSelected = selectedPart?.id === part.id;

                  return (
                    <button
                      className={`absolute flex h-6 w-6 items-center justify-center rounded-full font-bold text-[10px] shadow-md transition-all ${
                        isHotspotSelected
                          ? "z-10 scale-125 bg-blue-600 text-white ring-4 ring-blue-400/50"
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
            <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    className="w-full rounded-xl border border-border bg-zinc-50/80 py-1.5 pr-3 pl-8 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setEpcSearch(e.target.value)}
                    placeholder="Parça No / OEM / TR / EN / CN ara..."
                    type="text"
                    value={epcSearch}
                  />
                </div>
                <span className="font-bold text-[11px] text-zinc-500">
                  {filteredParts.length} Parça
                </span>
              </div>

              <div className="max-h-[360px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
                {filteredParts.map((p, idx) => {
                  const isPartSelected = selectedPart?.id === p.id;

                  return (
                    <div
                      className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition ${
                        isPartSelected
                          ? "bg-blue-50 dark:bg-blue-950/50"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                      key={p.id}
                      onClick={() => setSelectedPartId(p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 font-bold text-[10px] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {p.nameTr}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400">
                            {p.partNumber}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ×{p.qtyPerAssembly}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${p.unitPrice}
                        </span>
                        <button
                          className="rounded-lg p-1 text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50"
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
                  <div className="py-8 text-center text-xs text-zinc-400">
                    Bu grupta parça bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Part Details (Col 3) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs lg:col-span-3">
            {selectedPart ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-start justify-between border-border border-b pb-3">
                  <div>
                    <span className="font-bold font-mono text-[10px] text-blue-600 dark:text-blue-400">
                      {selectedPart.partNumber}
                    </span>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {selectedPart.nameTr}
                    </h3>
                  </div>
                  <button
                    className="flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1 font-semibold text-xs text-zinc-700 transition hover:bg-zinc-50 hover:text-blue-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
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
                  <div className="flex justify-between border-border border-b pb-1.5">
                    <span className="text-zinc-400">English (EN):</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedPart.nameEn}
                    </span>
                  </div>
                  {selectedPart.nameCn && (
                    <div className="flex justify-between border-border border-b pb-1.5">
                      <span className="text-zinc-400">中文 (CN):</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {selectedPart.nameCn}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-border border-b pb-1.5">
                    <span className="text-zinc-400">OEM No:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {selectedPart.oemNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1.5">
                    <span className="text-zinc-400">Stok Durumu:</span>
                    <span
                      className={`rounded-md px-2 py-0.5 font-bold ${
                        selectedPart.stockQuantity > 20
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {selectedPart.stockQuantity} adet
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1.5">
                    <span className="text-zinc-400">Birim Fiyat:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${selectedPart.unitPrice}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1.5">
                    <span className="text-zinc-400">Süperseksiyon:</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {selectedPart.supersession || "—"}
                    </span>
                  </div>
                </div>

                {selectedPart.notes && (
                  <div className="rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    {selectedPart.notes}
                  </div>
                )}

                <div className="flex items-center justify-between border-border border-t pt-2">
                  <button
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 font-semibold text-rose-600 text-xs transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    onClick={() =>
                      handleDeletePart(selectedPart.id, selectedPart.nameTr)
                    }
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Parçayı Sil</span>
                  </button>

                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 font-bold text-white text-xs transition hover:bg-blue-700"
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
                <Wrench className="mb-2 h-8 w-8 opacity-40" />
                <span>
                  Detaylarını görmek için sol listeden veya şemadan bir parça
                  seçin.
                </span>
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
          {/* Documents Control & Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] max-w-md flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-border bg-zinc-50/80 py-2 pr-3 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Doküman adı, bülten no veya etiket ara..."
                  type="text"
                  value={docSearch}
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  "",
                  "TSB",
                  "Kullanım Kılavuzu",
                  "Homologasyon",
                  "EPC",
                  "CAD",
                  "Garanti",
                ].map((cat) => (
                  <button
                    className={`rounded-xl px-2.5 py-1.5 font-semibold text-xs transition ${ docCategoryFilter === cat ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-border bg-card text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700" }`}
                    key={cat || "all"}
                    onClick={() => setDocCategoryFilter(cat)}
                    type="button"
                  >
                    {cat || "Tüm Kategoriler"}
                  </button>
                ))}
              </div>

              {/* Format Filter */}
              <Select
                onValueChange={(val) =>
                  setDocTypeFilter(val === "ALL" ? "" : val)
                }
                value={docTypeFilter || "ALL"}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="Tüm Formatlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Formatlar</SelectItem>
                  <SelectItem value="PDF">PDF Dokümanı</SelectItem>
                  <SelectItem value="CAD">CAD / 3D Model</SelectItem>
                  <SelectItem value="Excel">Excel / Tablo</SelectItem>
                  <SelectItem value="Word">Word</SelectItem>
                  <SelectItem value="Görsel">Görsel / Şema</SelectItem>
                  <SelectItem value="Arşiv">Arşiv (ZIP/RAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-auto">
              <span className="font-bold text-xs text-zinc-500 dark:text-zinc-400">
                {filteredDocuments.length} Doküman
              </span>
              <button
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700"
                onClick={() => setIsCreateDocOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Doküman Yükle</span>
              </button>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredDocuments.map((doc) => {
              const tags = parseJson<string[]>(doc.tagsJson, []);

              return (
                <div
                  className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs transition hover:border-blue-300 hover:shadow-md"
                  key={doc.id}
                  onClick={() => setSelectedPreviewDoc(doc)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        {getDocIcon(doc.documentType)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id, doc.name);
                          }}
                          title="Dokümanı Sil"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4
                      className="mt-3 line-clamp-2 font-bold text-xs text-zinc-900 transition group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400"
                      title={doc.name}
                    >
                      {doc.name}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                        {doc.category || "Genel"}
                      </span>
                      <span>·</span>
                      <span>{doc.documentType}</span>
                      <span>·</span>
                      <span>{doc.fileSize}</span>
                    </div>

                    {doc.vehicleName && (
                      <div className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        <Car className="h-3 w-3" />
                        <span>{doc.vehicleName}</span>
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span
                            className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-semibold text-[9px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            key={t}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-border border-t pt-3 text-[11px] text-zinc-400">
                    <span>
                      {new Date(doc.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {doc.fileUrl && (
                        <a
                          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"
                          download={doc.name}
                          href={doc.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                          title="Dosyayı İndir"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        className="flex items-center gap-0.5 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => setSelectedPreviewDoc(doc)}
                        type="button"
                      >
                        <span>İncele</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDocuments.length === 0 && (
              <div className="col-span-full rounded-3xl border border-border border-dashed bg-card py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-zinc-400" />
                <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                  {docSearch || docCategoryFilter || docTypeFilter
                    ? "Aramanıza uygun doküman bulunamadı"
                    : "Henüz Doküman Yüklenmemiş"}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {docSearch || docCategoryFilter || docTypeFilter
                    ? "Filtreleri temizleyebilir veya yeni bir doküman yükleyebilirsiniz."
                    : "Kullanım kılavuzları, servis bültenleri (TSB) veya CAD şemalarını sisteme yükleyin."}
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700"
                  onClick={() => setIsCreateDocOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Doküman Yükle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VEHICLE DETAIL DRAWER (SLIDE OVER) */}
      {/* ========================================================= */}
      {selectedVehicle && (
        <Sheet
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVehicle(null);
            }
          }}
          open
        >
          <SheetContent
            aria-describedby={undefined}
            className="data-[side=right]:w-full max-w-2xl overflow-y-auto border-border p-6 data-[side=right]:sm:max-w-2xl"
            side="right"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-border border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedVehicle.icon}</span>
                <div>
                  <SheetTitle className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </SheetTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[
                      selectedVehicle.trim,
                      selectedVehicle.modelYear,
                      selectedVehicle.segment,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Model Tanımı"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 font-semibold text-xs text-zinc-700 transition hover:bg-zinc-50 hover:text-blue-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  onClick={() => {
                    setEditingVehicleId(selectedVehicle.id);
                    setIsCreateVehicleOpen(true);
                  }}
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Düzenle</span>
                </button>
                <SheetClose asChild>
                  <button
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>
            </div>

            {/* Quick Specs Banner */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-zinc-900 p-3 text-center text-white dark:bg-zinc-800">
              <div>
                <div className="text-[10px] text-zinc-400">Güç</div>
                <div className="font-bold text-xs">
                  {parseJson<{ power?: string }>(
                    selectedVehicle.engineSpecJson,
                    {}
                  ).power ||
                    selectedVehicle.engine ||
                    "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">0-100</div>
                <div className="font-bold text-xs">
                  {parseJson<{ accel?: string }>(
                    selectedVehicle.performanceJson,
                    {}
                  ).accel || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Ort. Tüketim</div>
                <div className="font-bold text-xs">
                  {parseJson<{ combined?: string }>(
                    selectedVehicle.fuelEcoJson,
                    {}
                  ).combined || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Ref. Fiyat</div>
                <div className="font-bold text-emerald-400 text-xs">
                  {selectedVehicle.priceUsd
                    ? `$${selectedVehicle.priceUsd.toLocaleString()}`
                    : "—"}
                </div>
              </div>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="mt-4 flex gap-1 overflow-x-auto border-border border-b pb-1 text-xs">
              {[
                { id: "overview", label: "Genel Bakış" },
                { id: "specs", label: "Teknik & Motor" },
                { id: "dimensions", label: "Boyutlar" },
                { id: "safety", label: "Güvenlik & ADAS" },
                { id: "warranty", label: "Garanti" },
              ].map((tab) => (
                <button
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition ${
                    vehicleDetailTab === tab.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                  key={tab.id}
                  onClick={() =>
                    setVehicleDetailTab(tab.id as typeof vehicleDetailTab)
                  }
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
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.platform || "—"}
                    </span>
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
                      {[selectedVehicle.market, selectedVehicle.country]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Üretim Tesisi:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.plant || "—"}
                    </span>
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
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.engine || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Şanzıman:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.transmission || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Çekiş Tipi:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.driveType || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">Emisyon Standardı:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {selectedVehicle.emission || "—"}
                    </span>
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
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {dims.length || "—"} mm
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Genişlik:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {dims.width || "—"} mm
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Yükseklik:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {dims.height || "—"} mm
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">
                            Dingil Mesafesi:
                          </span>
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
                  <div className="flex justify-between border-border border-b pb-2">
                    <span className="text-zinc-400">Hava Yastığı Sayısı:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {parseJson<{ airbags?: number }>(
                        selectedVehicle.safetyJson,
                        {}
                      ).airbags || 7}{" "}
                      Adet
                    </span>
                  </div>

                  <div>
                    <span className="mb-2 block text-zinc-400">
                      ADAS Sürüş Destek Sistemleri:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        parseJson<{ adas?: string[] }>(
                          selectedVehicle.safetyJson,
                          {}
                        ).adas || [
                          "Adaptif Hız Sabitleyici",
                          "Şerit Takip Asistanı",
                          "Otonom Acil Fren",
                        ]
                      ).map((item) => (
                        <span
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 text-xs dark:bg-emerald-950/50 dark:text-emerald-300"
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
                      {parseJson<{ vehicle?: string }>(
                        selectedVehicle.warrantyJson,
                        {}
                      ).vehicle || "3 Yıl / 100.000 km"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400">
                      Güç Aktarma Garantisi:
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {parseJson<{ powertrain?: string }>(
                        selectedVehicle.warrantyJson,
                        {}
                      ).powertrain || "5 Yıl / 150.000 km"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Action Footer */}
            <div className="mt-6 flex items-center justify-between border-border border-t pt-4">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 font-semibold text-rose-600 text-xs transition hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700"
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
          </SheetContent>
        </Sheet>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT VEHICLE */}
      {/* ========================================================= */}
      {isCreateVehicleOpen && (
        <CreateEditVehicleModal
          initialVehicle={
            vehicles.find((v) => v.id === editingVehicleId) || null
          }
          onClose={() => setIsCreateVehicleOpen(false)}
          onSuccess={() => {
            setIsCreateVehicleOpen(false);
            showToast(
              editingVehicleId ? "Araç güncellendi!" : "Yeni araç oluşturuldu!"
            );
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
            showToast(
              editingPartId ? "Parça güncellendi!" : "Yeni parça eklendi!"
            );
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
          parts={parts}
          tenantId={activeTenant?.id || ""}
          vehicles={vehicles}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: DOCUMENT PREVIEW */}
      {/* ========================================================= */}
      {selectedPreviewDoc && (
        <DocumentPreviewModal
          document={selectedPreviewDoc}
          onClose={() => setSelectedPreviewDoc(null)}
          onDelete={(id, name) => {
            setSelectedPreviewDoc(null);
            handleDeleteDocument(id, name);
          }}
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
    </PageContainer>
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
  const [generation, setGeneration] = useState(
    initialVehicle?.generation || ""
  );
  const [platform, setPlatform] = useState(initialVehicle?.platform || "");
  const [projectCode, setProjectCode] = useState(
    initialVehicle?.projectCode || ""
  );
  const [modelYear, setModelYear] = useState<number | "">(
    initialVehicle?.modelYear ?? ""
  );
  const [segment, setSegment] = useState(initialVehicle?.segment || "");
  const [bodyType, setBodyType] = useState(initialVehicle?.bodyType || "");
  const [market, setMarket] = useState(initialVehicle?.market || "");
  const [country, setCountry] = useState(initialVehicle?.country || "");
  const [plant, setPlant] = useState(initialVehicle?.plant || "");
  const [vinPrefix, setVinPrefix] = useState(initialVehicle?.vinPrefix || "");
  const [status, setStatus] = useState(initialVehicle?.status || "Active");
  const [icon, setIcon] = useState(initialVehicle?.icon || "");
  const [priceUsd, setPriceUsd] = useState<number | "">(
    initialVehicle?.priceUsd ?? ""
  );
  const [priceTry, setPriceTry] = useState<number | "">(
    initialVehicle?.priceTry ?? ""
  );

  // 2. Güç Aktarımı & Şasi
  const [engine, setEngine] = useState(initialVehicle?.engine || "");
  const [transmission, setTransmission] = useState(
    initialVehicle?.transmission || ""
  );
  const [fuel, setFuel] = useState(initialVehicle?.fuel || "");
  const [driveType, setDriveType] = useState(initialVehicle?.driveType || "");
  const [emission, setEmission] = useState(initialVehicle?.emission || "");
  const [doors, setDoors] = useState<number | "">(initialVehicle?.doors ?? "");
  const [seats, setSeats] = useState<number | "">(initialVehicle?.seats ?? "");

  const initialSuspension = initialVehicle
    ? JSON.parse(initialVehicle.suspensionJson || "{}")
    : {};
  const [suspensionFront, setSuspensionFront] = useState(
    initialSuspension.front || ""
  );
  const [suspensionRear, setSuspensionRear] = useState(
    initialSuspension.rear || ""
  );

  const initialBrakes = initialVehicle
    ? JSON.parse(initialVehicle.brakesJson || "{}")
    : {};
  const [brakesFront, setBrakesFront] = useState(initialBrakes.front || "");
  const [brakesRear, setBrakesRear] = useState(initialBrakes.rear || "");
  const [tyres, setTyres] = useState(initialVehicle?.tyres || "");

  // 3. Boyutlar, Ağırlıklar & Motor Performansı
  const initialDims = initialVehicle
    ? JSON.parse(initialVehicle.dimensionsJson || "{}")
    : {};
  const [length, setLength] = useState<number | "">(initialDims.length ?? "");
  const [width, setWidth] = useState<number | "">(initialDims.width ?? "");
  const [height, setHeight] = useState<number | "">(initialDims.height ?? "");
  const [wheelbase, setWheelbase] = useState<number | "">(
    initialDims.wheelbase ?? ""
  );
  const [groundClearance, setGroundClearance] = useState<number | "">(
    initialDims.groundClearance ?? ""
  );
  const [cargoVolume, setCargoVolume] = useState<number | "">(
    initialDims.cargoVolume ?? ""
  );
  const [fuelTank, setFuelTank] = useState<number | "">(
    initialDims.fuelTank ?? ""
  );

  const initialWeights = initialVehicle
    ? JSON.parse(initialVehicle.weightsJson || "{}")
    : {};
  const [curbWeight, setCurbWeight] = useState<number | "">(
    initialWeights.curb ?? ""
  );
  const [gvw, setGvw] = useState<number | "">(initialWeights.gvw ?? "");
  const [payload, setPayload] = useState<number | "">(
    initialWeights.payload ?? ""
  );

  const initialEngineSpec = initialVehicle
    ? JSON.parse(initialVehicle.engineSpecJson || "{}")
    : {};
  const [power, setPower] = useState(initialEngineSpec.power || "");
  const [torque, setTorque] = useState(initialEngineSpec.torque || "");
  const [displacement, setDisplacement] = useState(
    initialEngineSpec.displacement || ""
  );
  const [aspiration, setAspiration] = useState(
    initialEngineSpec.aspiration || ""
  );

  const initialPerformance = initialVehicle
    ? JSON.parse(initialVehicle.performanceJson || "{}")
    : {};
  const [topSpeed, setTopSpeed] = useState(initialPerformance.topSpeed || "");
  const [accel, setAccel] = useState(initialPerformance.accel || "");

  // 4. Güvenlik, Garanti & Notlar
  const initialSafety = initialVehicle
    ? JSON.parse(initialVehicle.safetyJson || "{}")
    : {};
  const [airbags, setAirbags] = useState<number | "">(
    initialSafety.airbags ?? ""
  );
  const [adasString, setAdasString] = useState(
    initialSafety.adas ? initialSafety.adas.join(", ") : ""
  );

  const initialWarranty = initialVehicle
    ? JSON.parse(initialVehicle.warrantyJson || "{}")
    : {};
  const [warrantyVehicle, setWarrantyVehicle] = useState(
    initialWarranty.vehicle || ""
  );
  const [warrantyPowertrain, setWarrantyPowertrain] = useState(
    initialWarranty.powertrain || ""
  );
  const [warrantyCorrosion, setWarrantyCorrosion] = useState(
    initialWarranty.corrosion || ""
  );

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
    const list = adasString
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
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
    if (step === 1 && !isStep1Valid) {
      return;
    }
    if (step < 4) {
      setStep((s) => (s + 1) as typeof step);
    }
  };

  const handlePrevStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (step > 1) {
      setStep((s) => (s - 1) as typeof step);
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
    if (step !== 4) {
      return;
    }
    if (!(brand.trim() && model.trim()) || submitting) {
      return;
    }

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
        adas: adasString
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
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
        ? await ApiClient.updateVehicle(
            initialVehicle.id,
            payloadData as UpdateVehiclePayload,
            tenantId
          )
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
    { desc: "Marka, model, segment ve fiyat", num: 1, title: "Genel & Pazar" },
    { desc: "Motor, şanzıman, yakıt ve şasi", num: 2, title: "Güç Aktarımı" },
    {
      desc: "Ölçüler, ağırlıklar, hız ve tork",
      num: 3,
      title: "Boyut & Performans",
    },
    {
      desc: "ADAS, garanti ve canlı önizleme",
      num: 4,
      title: "Güvenlik & Garanti",
    },
  ];

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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon || "🚗"}</span>
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {initialVehicle
                  ? "Araç Modelini Düzenle"
                  : "Yeni Araç Modeli Ekle"}
              </DialogTitle>
              {initialVehicle && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {initialVehicle.brand} {initialVehicle.model}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Adım {step} / 4: {stepsConfig[step - 1]?.title} —{" "}
              {stepsConfig[step - 1]?.desc}
            </p>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* Stepper Progress Header */}
        <div className="grid grid-cols-4 border-border border-b bg-zinc-50/50 p-3 dark:bg-zinc-950/40">
          {stepsConfig.map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <button
                className={`flex items-center gap-2.5 rounded-xl p-2 text-left transition ${ isCurrent ? "bg-card shadow-xs ring-1 ring-blue-500/20" : isDone ? "opacity-80 hover:bg-white/60 dark:hover:bg-zinc-800/60" : "opacity-40" }`}
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
                      ? "bg-blue-600 text-white shadow-xs"
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
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {s.title}
                  </div>
                  <div className="hidden truncate text-[10px] text-zinc-400 sm:block">
                    {s.num === 1 && (brand ? `${brand} ${model}` : "Temel")}
                    {s.num === 2 && (engine ? `${engine}` : "Motor")}
                    {s.num === 3 && (power ? `${power}` : "Teknik")}
                    {s.num === 4 &&
                      (airbags ? `${airbags} Airbag` : "İnceleme")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Wizard Form Content */}
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onKeyDown={handleKeyDown}
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
            {/* ADIM 1: GENEL BİLGİLER, PAZAR & ÜRETİM */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    1.1 Temel Araç Tanımı
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Marka <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setTrim(e.target.value)}
                        placeholder="Örn. Elite, Wildtrak, Premium"
                        type="text"
                        value={trim}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Model Yılı
                      </Label>
                      <NumberInput
                        onChange={(val) => setModelYear(val || "")}
                        placeholder="Örn. 2025"
                        value={
                          typeof modelYear === "number" ? modelYear : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Segment
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Kasa Tipi
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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

                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    1.2 Pazar, Üretim & Fiyatlandırma
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Pazar
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setMarket(e.target.value)}
                        placeholder="Örn. TR / EU / MENA"
                        type="text"
                        value={market}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Menşe Ülke
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Türkiye, Almanya..."
                        type="text"
                        value={country}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Üretim Tesisi
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setPlant(e.target.value)}
                        placeholder="Bursa Plant..."
                        type="text"
                        value={plant}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        VIN Öneki
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 font-mono text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setVinPrefix(e.target.value)}
                        placeholder="WVU / JTM"
                        type="text"
                        value={vinPrefix}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Durum
                      </Label>
                      <Select
                        onValueChange={(val) => setStatus(val)}
                        value={status}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Durum Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">
                            Aktif (Satışta)
                          </SelectItem>
                          <SelectItem value="Development">
                            Geliştirme / Ar-Ge
                          </SelectItem>
                          <SelectItem value="Discontinued">
                            Üretim Durduruldu
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        İkon / Emoji
                      </Label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-center text-base focus:border-blue-500 focus:outline-none"
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="🚗, 🚙, 🛻, ⚡"
                        type="text"
                        value={icon}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Fiyat (USD)
                      </Label>
                      <NumberInput
                        onChange={(val) => {
                          const num = val || "";
                          setPriceUsd(num);
                          if (typeof num === "number" && !priceTry) {
                            setPriceTry(num * 35);
                          }
                        }}
                        placeholder="Örn. 32000"
                        prefix="$"
                        value={
                          typeof priceUsd === "number" ? priceUsd : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Fiyat (TRY)
                      </Label>
                      <NumberInput
                        onChange={(val) => setPriceTry(val || "")}
                        placeholder="Örn. 1120000"
                        prefix="₺"
                        value={
                          typeof priceTry === "number" ? priceTry : undefined
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Proje Kodu
                    </label>
                    <input
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="ULT-VOY-01"
                      type="text"
                      value={projectCode}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Platform
                    </label>
                    <input
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="P300 / TNGA-K"
                      type="text"
                      value={platform}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Nesil / Seri
                    </label>
                    <input
                      className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    2.1 Güç Aktarma Organları
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Motor Adı/Tipi
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setEngine(e.target.value)}
                        placeholder="Örn. 2.0L Turbo Petrol, 2.5L Hybrid"
                        type="text"
                        value={engine}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Şanzıman
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setTransmission(e.target.value)}
                        placeholder="Örn. 8-Speed Automatic, 7-Speed DCT"
                        type="text"
                        value={transmission}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Yakıt Türü
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Çekiş Tipi
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Emisyon Sınıfı
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setEmission(e.target.value)}
                        placeholder="Euro 6d, Euro 6e"
                        type="text"
                        value={emission}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Kapı / Koltuk
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <NumberInput
                          min={1}
                          onChange={(val) => setDoors(val || "")}
                          placeholder="Kapı (5)"
                          showStepper
                          value={typeof doors === "number" ? doors : undefined}
                        />
                        <NumberInput
                          min={1}
                          onChange={(val) => setSeats(val || "")}
                          placeholder="Koltuk (5)"
                          showStepper
                          value={typeof seats === "number" ? seats : undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    2.2 Şasi, Süspansiyon, Frenler & Lastik
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Ön Süspansiyon
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setSuspensionFront(e.target.value)}
                        placeholder="Örn. MacPherson Strut / Çift Salıncak"
                        type="text"
                        value={suspensionFront}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Arka Süspansiyon
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setSuspensionRear(e.target.value)}
                        placeholder="Örn. Multi-Link Bağımsız / Yaprak Yay"
                        type="text"
                        value={suspensionRear}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Fren Sistemi (Ön/Arka)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                          onChange={(e) => setBrakesFront(e.target.value)}
                          placeholder="Ön (Havadis Disk)"
                          type="text"
                          value={brakesFront}
                        />
                        <input
                          className="rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                          onChange={(e) => setBrakesRear(e.target.value)}
                          placeholder="Arka (Disk / Kampana)"
                          type="text"
                          value={brakesRear}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Lastik Ebatları
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    3.1 Ölçüler (mm) & Hacimler (L)
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Uzunluk (mm)
                      </Label>
                      <NumberInput
                        onChange={(val) => setLength(val || "")}
                        placeholder="Örn. 4520"
                        suffix="mm"
                        value={typeof length === "number" ? length : undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Genişlik (mm)
                      </Label>
                      <NumberInput
                        onChange={(val) => setWidth(val || "")}
                        placeholder="Örn. 1840"
                        suffix="mm"
                        value={typeof width === "number" ? width : undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Yükseklik (mm)
                      </Label>
                      <NumberInput
                        onChange={(val) => setHeight(val || "")}
                        placeholder="Örn. 1650"
                        suffix="mm"
                        value={typeof height === "number" ? height : undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Dingil Mesafesi (mm)
                      </Label>
                      <NumberInput
                        onChange={(val) => setWheelbase(val || "")}
                        placeholder="Örn. 2680"
                        suffix="mm"
                        value={
                          typeof wheelbase === "number" ? wheelbase : undefined
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Yerden Yükseklik (mm)
                      </Label>
                      <NumberInput
                        onChange={(val) => setGroundClearance(val || "")}
                        placeholder="Örn. 185"
                        suffix="mm"
                        value={
                          typeof groundClearance === "number"
                            ? groundClearance
                            : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Bagaj Hacmi (L)
                      </Label>
                      <NumberInput
                        onChange={(val) => setCargoVolume(val || "")}
                        placeholder="Örn. 480"
                        suffix="L"
                        value={
                          typeof cargoVolume === "number"
                            ? cargoVolume
                            : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Depo Hacmi (L)
                      </Label>
                      <NumberInput
                        onChange={(val) => setFuelTank(val || "")}
                        placeholder="Örn. 55"
                        suffix="L"
                        value={
                          typeof fuelTank === "number" ? fuelTank : undefined
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                  <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    3.2 Ağırlıklar (kg) & Performans Değerleri
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Boş Ağırlık (kg)
                      </Label>
                      <NumberInput
                        onChange={(val) => setCurbWeight(val || "")}
                        placeholder="Örn. 1480"
                        suffix="kg"
                        value={
                          typeof curbWeight === "number"
                            ? curbWeight
                            : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Azami Yüklü (GVW kg)
                      </Label>
                      <NumberInput
                        onChange={(val) => setGvw(val || "")}
                        placeholder="Örn. 1980"
                        suffix="kg"
                        value={typeof gvw === "number" ? gvw : undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                        İstiap Haddi / Taşıma (kg)
                      </Label>
                      <NumberInput
                        onChange={(val) => setPayload(val || "")}
                        placeholder="Örn. 500"
                        suffix="kg"
                        value={
                          typeof payload === "number" ? payload : undefined
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Maksimum Güç
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setPower(e.target.value)}
                        placeholder="Örn. 238 hp veya 175 kW"
                        type="text"
                        value={power}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Maksimum Tork
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setTorque(e.target.value)}
                        placeholder="Örn. 350 Nm"
                        type="text"
                        value={torque}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Motor Hacmi
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setDisplacement(e.target.value)}
                        placeholder="Örn. 1998 cc"
                        type="text"
                        value={displacement}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        0-100 km/s Hızlanma
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                        onChange={(e) => setAccel(e.target.value)}
                        placeholder="Örn. 7.8 sn"
                        type="text"
                        value={accel}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Maksimum Hız
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Sol Kolon: Güvenlik, ADAS & Garanti Form Alanları */}
                  <div className="space-y-3">
                    <div className="space-y-3 rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        4.1 Güvenlik & ADAS Sistemleri
                      </h4>
                      <div className="space-y-1">
                        <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                          Hava Yastığı Adedi
                        </Label>
                        <NumberInput
                          min={0}
                          onChange={(val) => setAirbags(val || "")}
                          placeholder="Örn. 7"
                          showStepper
                          value={
                            typeof airbags === "number" ? airbags : undefined
                          }
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
                                className={`rounded-lg px-2.5 py-1 font-medium text-[11px] transition ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
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
                          className="w-full rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                          onChange={(e) => setAdasString(e.target.value)}
                          placeholder="Adaptif Hız Sabitleyici, Kör Nokta, Şerit Takip..."
                          rows={2}
                          value={adasString}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        4.2 Garanti Koşulları & Notlar
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-medium text-zinc-700 dark:text-zinc-300">
                            Araç Garantisi
                          </label>
                          <input
                            className="w-full rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
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
                            className="w-full rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                            onChange={(e) =>
                              setWarrantyPowertrain(e.target.value)
                            }
                            placeholder="Örn. 5 Yıl / 150.000 km"
                            type="text"
                            value={warrantyPowertrain}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-zinc-700 dark:text-zinc-300">
                          Notlar
                        </label>
                        <textarea
                          className="w-full rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Model yılı revizyonları, bayi filo notları veya özel üretim detayları..."
                          rows={2}
                          value={notes}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sağ Kolon: CANLI KART ÖNİZLEMESİ (Live Mini Preview) */}
                  <div className="flex flex-col rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-5 shadow-xs dark:border-blue-900/40 dark:from-blue-950/20 dark:via-zinc-900 dark:to-indigo-950/20">
                    <div className="flex items-center justify-between border-blue-100 border-b pb-3 dark:border-blue-900/30">
                      <span className="font-bold text-blue-600 text-xs uppercase tracking-wider dark:text-blue-400">
                        ✦ Canlı Katalog Kartı Önizlemesi
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {status === "Active"
                          ? "Satışta"
                          : status === "Development"
                            ? "Geliştirme"
                            : "Durduruldu"}
                      </span>
                    </div>

                    <div className="space-y-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-3xl shadow-md">
                          {icon || "🚗"}
                        </div>
                        <div>
                          <div className="font-black text-base text-zinc-900 dark:text-zinc-100">
                            {brand || "Marka"} {model || "Model"}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {trim || "Donanım"} • {modelYear || "2025"} •{" "}
                            {segment || "Segment"}
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
                          <div className="text-[10px] text-zinc-400">
                            0-100 km/s
                          </div>
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
                            {priceUsd
                              ? `$${Number(priceUsd).toLocaleString("en-US")}`
                              : "—"}
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
          <div className="flex items-center justify-between border-border border-t bg-zinc-50/60 px-6 py-3.5 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200"
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
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40"
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
                  {submitting
                    ? "Kaydediliyor..."
                    : initialVehicle
                      ? "✓ Değişiklikleri Kaydet"
                      : "✓ Aracı Kataloğa Ekle"}
                </button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const [systemId, setSystemId] = useState(
    initialPart?.systemId || systems[0]?.id || ""
  );
  const [subsystemId, setSubsystemId] = useState(
    initialPart?.subsystemId || systems[0]?.subsystems[0]?.id || ""
  );
  const [qtyPerAssembly, setQtyPerAssembly] = useState<number | "">(
    initialPart?.qtyPerAssembly ?? ""
  );
  const [location, setLocation] = useState(initialPart?.location || "");
  const [stockQuantity, setStockQuantity] = useState<number | "">(
    initialPart?.stockQuantity ?? ""
  );
  const [unitPrice, setUnitPrice] = useState<number | "">(
    initialPart?.unitPrice ?? ""
  );
  const [supersession, setSupersession] = useState(
    initialPart?.supersession || ""
  );
  const [compatibleModels, setCompatibleModels] = useState(
    initialPart
      ? JSON.parse(initialPart.compatibleModelsJson || "[]").join(", ")
      : ""
  );
  const [hotspotCoordX, setHotspotCoordX] = useState<number | "">(
    initialPart?.hotspotCoordX ?? ""
  );
  const [hotspotCoordY, setHotspotCoordY] = useState<number | "">(
    initialPart?.hotspotCoordY ?? ""
  );
  const [notes, setNotes] = useState(initialPart?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const selectedSys = systems.find((s) => s.id === systemId) || systems[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(nameTr.trim() && partNumber.trim()) || submitting) {
      return;
    }

    setSubmitting(true);
    const payload: CreatePartPayload = {
      compatibleModelsJson: JSON.stringify(
        compatibleModels
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      ),
      hotspotCoordX: hotspotCoordX === "" ? undefined : Number(hotspotCoordX),
      hotspotCoordY: hotspotCoordY === "" ? undefined : Number(hotspotCoordY),
      location: location.trim() || "Motor Bölmesi",
      nameCn: nameCn.trim() || undefined,
      nameEn: nameEn.trim() || nameTr.trim(),
      nameTr: nameTr.trim(),
      notes: notes.trim() || undefined,
      oemNumber: oemNumber.trim() || undefined,
      partNumber: partNumber.trim(),
      qtyPerAssembly: qtyPerAssembly === "" ? 1 : Number(qtyPerAssembly),
      stockQuantity: stockQuantity === "" ? 0 : Number(stockQuantity),
      subsystemId: subsystemId || undefined,
      supersession: supersession.trim() || undefined,
      systemId: systemId || undefined,
      unitPrice: unitPrice === "" ? 0 : Number(unitPrice),
    };

    try {
      const res = initialPart
        ? await ApiClient.updateEpcPart(
            initialPart.id,
            payload as UpdatePartPayload,
            tenantId
          )
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
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {initialPart
                ? "EPC Parça Kartını Düzenle"
                : "Yeni EPC Parçası Ekle"}
            </DialogTitle>
            <p className="text-xs text-zinc-400">
              Çok dilli isimlendirme (TR / EN / CN), OEM no, stok ve şema konumu
            </p>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
            {/* Çok Dilli Parça Adları */}
            <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                1. Parça Tanımı & Çok Dilli Çeviriler
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Parça Adı (TR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setNameTr(e.target.value)}
                    placeholder="Örn. Silindir Kapağı"
                    required
                    type="text"
                    value={nameTr}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Part Name (EN)
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Cylinder Head"
                    type="text"
                    value={nameEn}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    零件名称 (CN)
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setNameCn(e.target.value)}
                    placeholder="气缸盖"
                    type="text"
                    value={nameCn}
                  />
                </div>
              </div>
            </div>

            {/* Parça Numaraları & Montaj Sistemi */}
            <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                2. Numaralandırma & Sistem Hiyerarşisi
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Parça No <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 font-mono text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="ULT-10037"
                    required
                    type="text"
                    value={partNumber}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    OEM No
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 font-mono text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setOemNumber(e.target.value)}
                    placeholder="OEM-500911"
                    type="text"
                    value={oemNumber}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Ana Sistem
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      setSystemId(val);
                      const s = systems.find((sys) => sys.id === val);
                      if (s && s.subsystems.length > 0 && s.subsystems[0]) {
                        setSubsystemId(s.subsystems[0].id);
                      }
                    }}
                    value={systemId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sistem Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Alt Sistem
                  </Label>
                  <Select
                    onValueChange={(val) => setSubsystemId(val)}
                    value={subsystemId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Alt Sistem Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSys?.subsystems.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stok, Fiyat, Montaj & Konum */}
            <div className="rounded-2xl border border-border bg-zinc-50/40 p-4 dark:bg-zinc-950/20">
              <h4 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
                3. Stok, Fiyat, Konum & Şema Koordinatları
              </h4>
              <div className="grid grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Montaj Miktarı
                  </Label>
                  <NumberInput
                    min={1}
                    onChange={(val) => setQtyPerAssembly(val || "")}
                    placeholder="1"
                    showStepper
                    value={
                      typeof qtyPerAssembly === "number"
                        ? qtyPerAssembly
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Stok Adedi
                  </Label>
                  <NumberInput
                    min={0}
                    onChange={(val) => setStockQuantity(val || "")}
                    placeholder="0"
                    showStepper
                    value={
                      typeof stockQuantity === "number"
                        ? stockQuantity
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Birim Fiyat ($)
                  </Label>
                  <NumberInput
                    min={0}
                    onChange={(val) => setUnitPrice(val || "")}
                    placeholder="0"
                    prefix="$"
                    value={
                      typeof unitPrice === "number" ? unitPrice : undefined
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Şema %X
                  </Label>
                  <NumberInput
                    max={100}
                    min={0}
                    onChange={(val) => setHotspotCoordX(val || "")}
                    placeholder="% 0-100"
                    suffix="%"
                    value={
                      typeof hotspotCoordX === "number"
                        ? hotspotCoordX
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Şema %Y
                  </Label>
                  <NumberInput
                    max={100}
                    min={0}
                    onChange={(val) => setHotspotCoordY(val || "")}
                    placeholder="% 0-100"
                    suffix="%"
                    value={
                      typeof hotspotCoordY === "number"
                        ? hotspotCoordY
                        : undefined
                    }
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Montaj Konumu
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
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
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Süperseksiyon
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 font-mono text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setSupersession(e.target.value)}
                    placeholder="ULT-9022 → ULT-10037"
                    type="text"
                    value={supersession}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Uyumlu Modeller
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setCompatibleModels(e.target.value)}
                    placeholder="Voyager, Ranger-X..."
                    type="text"
                    value={compatibleModels}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Parça Notları
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Montaj torku, servis bülteni bağlantısı veya revizyon notları..."
                  rows={2}
                  value={notes}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-border border-t bg-zinc-50/60 px-6 py-3.5 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || !nameTr.trim() || !partNumber.trim()}
              type="submit"
            >
              {submitting
                ? "Kaydediliyor..."
                : initialPart
                  ? "Değişiklikleri Kaydet"
                  : "Parçayı Ekle"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- 3. Gelişmiş Doküman Yükleme Modalı (Drag & Drop + Auto Detect) ---
function CreateDocumentModal({
  vehicles,
  parts = [],
  tenantId,
  onClose,
  onSuccess,
}: {
  vehicles: VehicleSummaryDto[];
  parts?: VehiclePartDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("PDF");
  const [category, setCategory] = useState("Kullanım Kılavuzu");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [partId, setPartId] = useState<string>("");
  const [fileSize, setFileSize] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["TSB"]);
  const [customTagInput, setCustomTagInput] = useState("");

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickTagPresets = [
    "TSB",
    "Kullanım Kılavuzu",
    "Motor",
    "Garanti",
    "Homologasyon",
    "Elektrik",
    "Bakım",
    "HV Batarya",
    "Şasi",
    "Yazılım",
  ];

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) {
      return;
    }
    const cleanTag = customTagInput.trim();
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags((prev) => [...prev, cleanTag]);
    }
    setCustomTagInput("");
  };

  const handleFileUpload = async (file: File) => {
    if (!file) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await ApiClient.uploadVehicleDocument(formData, tenantId);
      if (res.success && res.data) {
        setFileUrl(res.data.fileUrl);
        setUploadedFileName(file.name);
        setFileSize(res.data.fileSize);
        setDocumentType(res.data.documentType);
        if (!name.trim()) {
          setName(res.data.fileName);
        }
      } else {
        setUploadError(
          res.message || "Dosya yüklenemedi. Lütfen tekrar deneyin."
        );
      }
    } catch {
      setUploadError("Dosya yüklenirken bir bağlantı hatası oluştu.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    const payload: CreateVehicleDocumentPayload = {
      category,
      documentType,
      fileSize: fileSize.trim() || "1.2 MB",
      fileUrl: fileUrl.trim() || undefined,
      name: name.trim(),
      partId: partId || undefined,
      tagsJson: JSON.stringify(selectedTags),
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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Teknik Doküman & Arşiv
            </DialogTitle>
            <p className="text-xs text-zinc-400">
              Kılavuz, Servis Bülteni (TSB), Homologasyon veya CAD dosyası
              yükleyin
            </p>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-border border-b bg-zinc-50/70 p-2 dark:bg-zinc-900/50">
          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-zinc-200/60 p-1 dark:bg-zinc-800">
            <button
              className={`flex items-center justify-center gap-2 rounded-xl py-2 font-bold text-xs transition ${ mode === "upload" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200" }`}
              onClick={() => setMode("upload")}
              type="button"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Dosya Yükle (Drag & Drop)</span>
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-xl py-2 font-bold text-xs transition ${ mode === "url" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200" }`}
              onClick={() => setMode("url")}
              type="button"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Harici URL / OEM Bağlantısı</span>
            </button>
          </div>
        </div>

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
            {/* Upload Zone (Upload Mode) */}
            {mode === "upload" ? (
              <div className="space-y-2">
                <input
                  accept=".pdf,.dwg,.dxf,.step,.stp,.iges,.igs,.cad,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp,.svg,.zip,.rar,.7z,.tar,.mp4"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  ref={fileInputRef}
                  type="file"
                />

                {uploadedFileName ? (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-emerald-950 text-xs dark:text-emerald-100">
                          {uploadedFileName}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          {fileSize} · {documentType} olarak algılandı
                        </div>
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-xl border border-emerald-300 px-3 py-1.5 font-semibold text-[11px] text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                      onClick={() => {
                        setUploadedFileName(null);
                        setFileUrl("");
                      }}
                      type="button"
                    >
                      Değiştir
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${ isDragging ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30" : "border-border bg-zinc-50/60 hover:border-blue-400 hover:bg-zinc-50 dark:bg-zinc-800/40 dark:hover:border-blue-500" }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDrop={handleDrop}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center py-2">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          Dosya Yükleniyor...
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Format ve boyut taranıyor
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                          <Upload className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          Dosyayı buraya sürükleyip bırakın veya seçin
                        </span>
                        <span className="mt-1 text-[11px] text-zinc-400">
                          PDF, CAD (.STEP/.DWG), Excel, Word, Görsel veya ZIP
                          (Maks. 50 MB)
                        </span>
                      </>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600 text-xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Harici Doküman Linki / URL{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ExternalLink className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                  <input
                    className="w-full rounded-xl border border-border bg-card py-2 pr-3 pl-9 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://oem-portal.example.com/docs/tsb-2026-01.pdf"
                    type="url"
                    value={fileUrl}
                  />
                </div>
              </div>
            )}

            {/* Document Title */}
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Doküman Başlığı <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Voyager 2025 Periyodik Bakım ve Tork Tablosu"
                required
                type="text"
                value={name}
              />
            </div>

            {/* Type & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Doküman Formatı
                </Label>
                <Select
                  onValueChange={(val) => setDocumentType(val)}
                  value={documentType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Format Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Dokümanı</SelectItem>
                    <SelectItem value="CAD">
                      CAD / 3D Model (STEP/DWG)
                    </SelectItem>
                    <SelectItem value="Excel">
                      Excel / Tablo (XLSX/CSV)
                    </SelectItem>
                    <SelectItem value="Word">Word Dokümanı (DOCX)</SelectItem>
                    <SelectItem value="Görsel">
                      Teknik Çizim / Görsel
                    </SelectItem>
                    <SelectItem value="Arşiv">
                      Arşiv Paketi (ZIP/RAR)
                    </SelectItem>
                    <SelectItem value="Video">Eğitim Videosu (MP4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Kategori
                </Label>
                <Select
                  onValueChange={(val) => setCategory(val)}
                  value={category}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kategori Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kullanım Kılavuzu">
                      Kullanım Kılavuzu
                    </SelectItem>
                    <SelectItem value="TSB">Servis Bülteni (TSB)</SelectItem>
                    <SelectItem value="Homologasyon">
                      Homologasyon (WVTA)
                    </SelectItem>
                    <SelectItem value="EPC">EPC Parça Listesi</SelectItem>
                    <SelectItem value="CAD">CAD / Mühendislik</SelectItem>
                    <SelectItem value="Garanti">Garanti & Politika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Associations: Vehicle & Part */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                  İlişkili Araç Modeli
                </Label>
                <Select
                  onValueChange={(val) =>
                    setVehicleId(val === "NONE" ? "" : val)
                  }
                  value={vehicleId || "NONE"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— Genel (Tüm Araçlar) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      — Genel (Tüm Araçlar) —
                    </SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.icon} {v.brand} {v.model}{" "}
                        {v.trim ? `(${v.trim})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-medium text-zinc-700 dark:text-zinc-300">
                  İlişkili EPC Parçası
                </Label>
                <Select
                  onValueChange={(val) => setPartId(val === "NONE" ? "" : val)}
                  value={partId || "NONE"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— Parça Bağlantısı Yok —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      — Parça Bağlantısı Yok —
                    </SelectItem>
                    {parts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.partNumber} - {p.nameTr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Size (auto or manual) */}
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Dosya Boyutu
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                onChange={(e) => setFileSize(e.target.value)}
                placeholder="Örn. 3.4 MB"
                type="text"
                value={fileSize}
              />
            </div>

            {/* Quick Tag Selector & Custom Tags */}
            <div className="space-y-2">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Etiketler
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickTagPresets.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      className={`rounded-lg px-2.5 py-1 font-semibold text-[11px] transition ${ isSelected ? "bg-blue-600 text-white shadow-2xs" : "border border-border bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700" }`}
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      type="button"
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  className="flex-1 rounded-xl border border-border bg-card p-2 text-zinc-900 focus:border-blue-500 dark:text-zinc-100"
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="Yeni etiket yazıp ekleyin..."
                  type="text"
                  value={customTagInput}
                />
                <button
                  className="rounded-xl border border-border px-3 py-2 font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={handleAddCustomTag}
                  type="button"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-border border-t bg-zinc-50/60 px-6 py-3.5 dark:bg-zinc-950/60">
            <button
              className="rounded-xl border border-border px-4 py-2 font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2 font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || isUploading || !name.trim()}
              type="submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Dokümanı Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- 3.1 Gelişmiş Doküman Önizleme Modalı (PDF, Image, CAD, vs.) ---
function DocumentPreviewModal({
  document,
  onClose,
  onDelete,
}: {
  document: VehicleDocumentDto;
  onClose: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const isPdf =
    document.documentType.toUpperCase() === "PDF" ||
    document.fileUrl?.toLowerCase().endsWith(".pdf");
  const isImage =
    document.documentType.toUpperCase() === "GÖRSEL" ||
    document.documentType.toUpperCase() === "IMAGE" ||
    Boolean(document.fileUrl?.match(/\.(png|jpe?g|webp|svg)$/i));

  const tags = (() => {
    try {
      return JSON.parse(document.tagsJson || "[]") as string[];
    } catch {
      return [];
    }
  })();

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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle
                  className="truncate font-bold text-sm text-zinc-900 dark:text-zinc-100"
                  title={document.name}
                >
                  {document.name}
                </DialogTitle>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-bold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {document.documentType}
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {document.category}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {document.fileSize} ·{" "}
                {new Date(document.createdAt).toLocaleDateString("tr-TR")}{" "}
                tarihinde yüklendi
                {document.vehicleName && ` · 🚘 ${document.vehicleName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.fileUrl && (
              <>
                <a
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 font-semibold text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  download={document.name}
                  href={document.fileUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="Dosyayı İndir"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>İndir</span>
                </a>
                <a
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 font-semibold text-xs text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  href={document.fileUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="Yeni Sekmede Aç"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Yeni Sekme</span>
                </a>
              </>
            )}
            <button
              className="rounded-xl p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              onClick={() => onDelete(document.id, document.name)}
              title="Dokümanı Sil"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <DialogClose asChild>
              <button
                className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Preview Viewer Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isPdf && document.fileUrl ? (
            <div className="h-[65vh] w-full overflow-hidden rounded-2xl border border-border bg-zinc-100 dark:bg-zinc-950">
              <iframe
                className="h-full w-full"
                src={`${document.fileUrl}#toolbar=1`}
                title={document.name}
              />
            </div>
          ) : isImage && document.fileUrl ? (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-zinc-100 p-4 dark:bg-zinc-950">
              <img
                alt={document.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                src={document.fileUrl}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-zinc-50/70 p-12 text-center dark:bg-zinc-800/40">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Boxes className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {document.name}
              </h4>
              <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
                Bu doküman ({document.documentType}) tarayıcı içi doğrudan
                önizlemeyi desteklemeyen bir formatta (CAD / Excel / STEP /
                Arşiv) olabilir. Dosyayı indirerek ilgili CAD veya ofis
                yazılımında açabilirsiniz.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {document.fileUrl ? (
                  <a
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white text-xs shadow-md transition hover:bg-blue-700"
                    download={document.name}
                    href={document.fileUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="h-4 w-4" />
                    <span>Dosyayı İndir ({document.fileSize})</span>
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400">
                    Fiziksel dosya bağlantısı bulunamadı.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-zinc-50/50 p-4 text-xs sm:grid-cols-4 dark:bg-zinc-800/30">
            <div>
              <span className="block text-[10px] text-zinc-400">Kategori</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {document.category}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400">
                Dosya Boyutu
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {document.fileSize}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400">
                İlişkili Araç
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {document.vehicleName || "Genel (Tüm Filo)"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400">
                İlişkili Parça
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {document.partName || "—"}
              </span>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] text-zinc-400">Etiketler:</span>
              {tags.map((t) => (
                <span
                  className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  key={t}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  if (!isOpen) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    document: "Teknik Doküman",
    part: "EPC Parçası",
    vehicle: "Araç Modeli",
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
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-8 ring-rose-50 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-950/30">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-[11px] text-rose-600 uppercase tracking-wider dark:text-rose-400">
              Kalıcı Silme Onayı
            </span>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {typeLabels[type] || "Öğe"} Silinsin mi?
            </DialogTitle>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-zinc-50/70 p-3.5 dark:bg-zinc-800/40">
          <div className="truncate font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            {title}
          </div>
          {subtitle && (
            <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-700 text-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Bu işlem geri alınamaz. İlgili kayıt kalıcı olarak kaldırılacaktır.
          </span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 font-bold text-white text-xs shadow-md transition hover:bg-rose-700 disabled:opacity-50"
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
      </DialogContent>
    </Dialog>
  );
}
