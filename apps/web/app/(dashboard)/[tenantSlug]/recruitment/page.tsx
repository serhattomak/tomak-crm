"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  FileText,
  Filter,
  GripVertical,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Megaphone,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClient,
  type ApplicationDto,
  type CandidateDto,
  type RequisitionDto,
  type StageDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type RecruitmentTab = "ilanlar" | "adaylar" | "basvurular" | "ayarlar";

const VALID_TABS: RecruitmentTab[] = [
  "ilanlar",
  "adaylar",
  "basvurular",
  "ayarlar",
];

const isValidTab = (value: string | null): value is RecruitmentTab =>
  value !== null && (VALID_TABS as string[]).includes(value);

export default function RecruitmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-xs">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="font-semibold text-xs">İşe alım yükleniyor...</p>
        </div>
      }
    >
      <RecruitmentPageContent />
    </Suspense>
  );
}

function RecruitmentPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<RecruitmentTab>(
    isValidTab(tabParam) ? tabParam : "ilanlar"
  );

  useEffect(() => {
    if (isValidTab(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: RecruitmentTab) => {
    setActiveTab(tab);
    router.push(`/${tenantSlug}/recruitment?tab=${tab}`);
  };

  // Data
  const [requisitions, setRequisitions] = useState<RequisitionDto[]>([]);
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [stages, setStages] = useState<StageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState<string>("all");
  const [reqPublishedFilter, setReqPublishedFilter] = useState<string>("all");
  const [candSearch, setCandSearch] = useState("");
  const [candSourceFilter, setCandSourceFilter] = useState<string>("all");
  const [appSearch, setAppSearch] = useState("");
  const [appStageFilter, setAppStageFilter] = useState<string>("all");

  // Pagination
  const [reqPage, setReqPage] = useState(1);
  const [candPage, setCandPage] = useState(1);
  const [appPage, setAppPage] = useState(1);
  const PAGE_SIZE = 10;

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modals - requisition/candidate/application/stage
  const [showReqModal, setShowReqModal] = useState(false);
  const [editingRequisition, setEditingRequisition] =
    useState<RequisitionDto | null>(null);
  const [showCandModal, setShowCandModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateDto | null>(
    null
  );
  const [showAppModal, setShowAppModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<StageDto | null>(null);

  // Drawers
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  const loadData = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [reqRes, candRes, appRes, stageRes] = await Promise.all([
        ApiClient.getRequisitions({}, activeTenant.id),
        ApiClient.getCandidates({}, activeTenant.id),
        ApiClient.getApplications({}, activeTenant.id),
        ApiClient.getStages(activeTenant.id),
      ]);

      if (reqRes.success && reqRes.data) {
        setRequisitions(reqRes.data.items);
      }
      if (candRes.success && candRes.data) {
        setCandidates(candRes.data.items);
      }
      if (appRes.success && appRes.data) {
        setApplications(appRes.data.items);
      }
      if (stageRes.success && stageRes.data) {
        setStages(stageRes.data);
      }
    } catch {
      toast.error("İşe alım verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setReqPage(1);
  }, [reqSearch, reqStatusFilter, reqPublishedFilter]);

  useEffect(() => {
    setCandPage(1);
  }, [candSearch, candSourceFilter]);

  useEffect(() => {
    setAppPage(1);
  }, [appSearch, appStageFilter]);

  // Sorted stages
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages]
  );

  const activeStages = useMemo(
    () => sortedStages.filter((s) => s.isActive),
    [sortedStages]
  );

  // Filtered lists via useMemo
  const filteredRequisitions = useMemo(
    () =>
      requisitions.filter((r) => {
        const matchesSearch =
          reqSearch === "" ||
          r.title.toLowerCase().includes(reqSearch.toLowerCase()) ||
          (r.departmentName &&
            r.departmentName.toLowerCase().includes(reqSearch.toLowerCase())) ||
          (r.location &&
            r.location.toLowerCase().includes(reqSearch.toLowerCase()));
        const matchesStatus =
          reqStatusFilter === "all" || r.status === reqStatusFilter;
        const matchesPublished =
          reqPublishedFilter === "all" ||
          (reqPublishedFilter === "published" && r.isPublished) ||
          (reqPublishedFilter === "draft" && !r.isPublished);
        return matchesSearch && matchesStatus && matchesPublished;
      }),
    [requisitions, reqSearch, reqStatusFilter, reqPublishedFilter]
  );

  const pagedRequisitions = useMemo(() => {
    const start = (reqPage - 1) * PAGE_SIZE;
    return filteredRequisitions.slice(start, start + PAGE_SIZE);
  }, [filteredRequisitions, reqPage]);

  const filteredCandidates = useMemo(
    () =>
      candidates.filter((c) => {
        const q = candSearch.toLowerCase();
        const matchesSearch =
          candSearch === "" ||
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));
        const matchesSource =
          candSourceFilter === "all" || c.source === candSourceFilter;
        return matchesSearch && matchesSource;
      }),
    [candidates, candSearch, candSourceFilter]
  );

  const pagedCandidates = useMemo(() => {
    const start = (candPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(start, start + PAGE_SIZE);
  }, [filteredCandidates, candPage]);

  const filteredApplications = useMemo(
    () =>
      applications.filter((a) => {
        const q = appSearch.toLowerCase();
        const matchesSearch =
          appSearch === "" ||
          a.candidateName.toLowerCase().includes(q) ||
          a.candidateEmail.toLowerCase().includes(q) ||
          a.requisitionTitle.toLowerCase().includes(q) ||
          (a.stageName && a.stageName.toLowerCase().includes(q));
        const matchesStage =
          appStageFilter === "all" || a.stageId === appStageFilter;
        return matchesSearch && matchesStage;
      }),
    [applications, appSearch, appStageFilter]
  );

  const pagedApplications = useMemo(() => {
    const start = (appPage - 1) * PAGE_SIZE;
    return filteredApplications.slice(start, start + PAGE_SIZE);
  }, [filteredApplications, appPage]);

  const applicationsByStage = useMemo(() => {
    const map = new Map<string, ApplicationDto[]>();
    for (const s of sortedStages) {
      map.set(s.id, []);
    }
    const unassigned: ApplicationDto[] = [];
    for (const app of filteredApplications) {
      if (app.stageId && map.has(app.stageId)) {
        map.get(app.stageId)?.push(app);
      } else {
        unassigned.push(app);
      }
    }
    return { map, unassigned };
  }, [filteredApplications, sortedStages]);

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  );

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedApplicationId) || null,
    [applications, selectedApplicationId]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return "border border-emerald-200 bg-emerald-50 text-emerald-700";
      case "Draft":
        return "border border-border bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400";
      case "Closed":
        return "border border-rose-200 bg-rose-50 text-rose-700";
      case "Cancelled":
        return "border border-border bg-zinc-100 text-zinc-600";
      default:
        return "border border-border bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Open":
        return "Yayında";
      case "Draft":
        return "Taslak";
      case "Closed":
        return "Kapalı";
      case "Cancelled":
        return "İptal";
      default:
        return status;
    }
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "—";
    }
    try {
      return new Date(value).toLocaleDateString("tr-TR");
    } catch {
      return value;
    }
  };

  const handleMoveStage = useCallback(
    async (applicationId: string, targetStageId: string) => {
      if (!activeTenant?.id) {
        return;
      }
      const prev = applications.find((a) => a.id === applicationId);
      if (!prev || prev.stageId === targetStageId) {
        return;
      }
      const targetStage = stages.find((s) => s.id === targetStageId);
      // optimistic
      setApplications((curr) =>
        curr.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                stageColorHex: targetStage?.colorHex,
                stageId: targetStageId,
                stageName: targetStage?.name,
              }
            : a
        )
      );
      const res = await ApiClient.moveApplicationStage(
        applicationId,
        targetStageId,
        activeTenant.id
      );
      if (res.success) {
        toast.success("Aşama güncellendi.");
        if (res.data?.headcountWarning) {
          toast.warning(res.data.headcountWarning);
        }
        if (res.data) {
          setApplications((curr) =>
            curr.map((a) =>
              a.id === applicationId ? { ...a, ...res.data } : a
            )
          );
        } else {
          loadData();
        }
      } else {
        toast.error(res.message || "Aşama güncellenemedi.");
        setApplications((curr) =>
          curr.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  stageColorHex: prev.stageColorHex,
                  stageId: prev.stageId,
                  stageName: prev.stageName,
                }
              : a
          )
        );
      }
    },
    [activeTenant?.id, applications, stages, loadData]
  );

  const openReqModalForCreate = () => {
    setEditingRequisition(null);
    setShowReqModal(true);
  };

  const openReqModalForEdit = (req: RequisitionDto) => {
    setEditingRequisition(req);
    setShowReqModal(true);
  };

  const openCandModalForCreate = () => {
    setEditingCandidate(null);
    setShowCandModal(true);
  };

  const openCandModalForEdit = (cand: CandidateDto) => {
    setEditingCandidate(cand);
    setShowCandModal(true);
  };

  const openStageModalForCreate = () => {
    setEditingStage(null);
    setShowStageModal(true);
  };

  const openStageModalForEdit = (stage: StageDto) => {
    setEditingStage(stage);
    setShowStageModal(true);
  };

  const handleDeleteRequisition = (id: string) => {
    setConfirmDialog({
      confirmText: "Sil",
      description: "Bu ilanı silmek istediğinize emin misiniz?",
      onConfirm: async () => {
        if (!activeTenant?.id) {
          return;
        }
        const res = await ApiClient.deleteRequisition(id, activeTenant.id);
        if (res.success) {
          toast.success("İlan silindi.");
          loadData();
        } else {
          toast.error(res.message || "Silme başarısız.");
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      open: true,
      title: "İlanı Sil",
      variant: "destructive",
    });
  };

  const handleDeleteCandidate = (id: string) => {
    setConfirmDialog({
      confirmText: "Sil",
      description: "Aday soft-delete edilecek (KVKK 2 yıl anonim). Devam?",
      onConfirm: async () => {
        if (!activeTenant?.id) {
          return;
        }
        const res = await ApiClient.deleteCandidate(id, activeTenant.id);
        if (res.success) {
          toast.success("Aday silindi.");
          loadData();
        } else {
          toast.error(res.message || "Silme başarısız.");
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      open: true,
      title: "Adayı Sil",
      variant: "destructive",
    });
  };

  const handleDeleteStage = (stage: StageDto) => {
    if (stage.isDefault) {
      toast.error("Varsayılan aşama silinemez.");
      return;
    }
    if (stage.applicationCount > 0) {
      toast.error("Bağlı başvurusu olan aşama silinemez.");
      return;
    }
    setConfirmDialog({
      confirmText: "Sil",
      description: `"${stage.name}" aşamasını silmek istiyor musunuz?`,
      onConfirm: async () => {
        if (!activeTenant?.id) {
          return;
        }
        const res = await ApiClient.deleteStage(stage.id, activeTenant.id);
        if (res.success) {
          toast.success("Aşama silindi.");
          loadData();
        } else {
          toast.error(res.message || "Silme başarısız.");
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      open: true,
      title: "Aşamayı Sil",
      variant: "destructive",
    });
  };

  const handleToggleStageActive = async (stage: StageDto) => {
    if (!activeTenant?.id) {
      return;
    }
    const res = await ApiClient.updateStage(
      stage.id,
      {
        colorHex: stage.colorHex,
        isActive: !stage.isActive,
        name: stage.name,
        slug: stage.slug,
        stageType: stage.stageType,
      },
      activeTenant.id
    );
    if (res.success) {
      toast.success(
        stage.isActive ? "Aşama pasif edildi." : "Aşama aktif edildi."
      );
      loadData();
    } else {
      toast.error(res.message || "Güncelleme başarısız.");
    }
  };

  const handleReorderStage = async (
    index: number,
    direction: "up" | "down"
  ) => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sortedStages.length) {
      return;
    }
    if (!activeTenant?.id) {
      return;
    }
    const reordered = [...sortedStages];
    const temp = reordered[index];
    if (!(temp && reordered[target])) {
      return;
    }
    // swap sortOrder
    const a = reordered[index]!;
    const b = reordered[target]!;
    const aOrder = a.sortOrder;
    const bOrder = b.sortOrder;
    // optimistic local reorder by swapping
    const items = sortedStages.map((s, idx) => {
      if (idx === index) {
        return { id: s.id, sortOrder: bOrder };
      }
      if (idx === target) {
        return { id: s.id, sortOrder: aOrder };
      }
      return { id: s.id, sortOrder: s.sortOrder };
    });
    // optimistic update stages
    setStages((prev) =>
      prev
        .map((s) => {
          const found = items.find((i) => i.id === s.id);
          return found ? { ...s, sortOrder: found.sortOrder } : s;
        })
        .sort((x, y) => x.sortOrder - y.sortOrder)
    );
    const res = await ApiClient.reorderStages(items, activeTenant.id);
    if (res.success) {
      toast.success("Sıralama güncellendi.");
      if (res.data) {
        setStages(res.data);
      }
    } else {
      toast.error(res.message || "Sıralama güncellenemedi.");
      loadData();
    }
  };

  const handlePublishRequisition = async (id: string) => {
    if (!activeTenant?.id) {
      return;
    }
    const res = await ApiClient.publishRequisition(id, activeTenant.id);
    if (res.success) {
      toast.success("İlan yayına alındı.");
      loadData();
    } else {
      toast.error(res.message || "Yayınlama başarısız.");
    }
  };

  const handleCloseRequisition = async (id: string) => {
    if (!activeTenant?.id) {
      return;
    }
    const res = await ApiClient.closeRequisition(id, activeTenant.id);
    if (res.success) {
      toast.success("İlan kapatıldı.");
      loadData();
    } else {
      toast.error(res.message || "Kapatma başarısız.");
    }
  };

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-semibold text-primary  text-xs uppercase tracking-wider">
            <Megaphone className="h-4 w-4" />
            <span>İşe Alım & Aday Takibi</span>
          </div>
          <h1 className="font-semibold text-2xl text-zinc-900 tracking-tight  dark:text-zinc-100">
            İşe Alım
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            İş ilanları, aday havuzu, başvurular ve işe alım aşamalarını tek
            ekrandan yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={openCandModalForCreate}
            type="button"
          >
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span>Yeni Aday</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 font-semibold text-background text-xs shadow-xs transition-all hover:bg-foreground/90"
            onClick={openReqModalForCreate}
            type="button"
          >
            <Plus className="h-4 w-4 text-blue-400" />
            <span>Yeni İlan Oluştur</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-border border-b pb-3">
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
          <button
            aria-current={activeTab === "ilanlar" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${activeTab === "ilanlar" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            onClick={() => handleTabChange("ilanlar")}
            type="button"
          >
            <Briefcase className="h-4 w-4 text-blue-500" />
            <span>İlanlar ({requisitions.length})</span>
          </button>

          <button
            aria-current={activeTab === "adaylar" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${activeTab === "adaylar" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            onClick={() => handleTabChange("adaylar")}
            type="button"
          >
            <Users className="h-4 w-4 text-cyan-500" />
            <span>Adaylar ({candidates.length})</span>
          </button>

          <button
            aria-current={activeTab === "basvurular" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${activeTab === "basvurular" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            onClick={() => handleTabChange("basvurular")}
            type="button"
          >
            <FileText className="h-4 w-4 text-emerald-500" />
            <span>Başvurular ({applications.length})</span>
          </button>

          <button
            aria-current={activeTab === "ayarlar" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${activeTab === "ayarlar" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
            onClick={() => handleTabChange("ayarlar")}
            type="button"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Ayarlar</span>
          </button>
        </div>

        <button
          className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 font-medium text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          disabled={isLoading}
          onClick={loadData}
          type="button"
        >
          <RotateCcw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-500" : "text-muted-foreground"}`}
          />
          <span>Yenile</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-xs">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="font-semibold text-xs">Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {activeTab === "ilanlar" && (
            <section aria-label="İlanlar tablosu" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    aria-label="İlan ara"
                    className="w-full rounded-xl border border-border bg-zinc-50 py-2 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                    onChange={(e) => setReqSearch(e.target.value)}
                    placeholder="Başlık, departman veya lokasyon ara..."
                    type="text"
                    value={reqSearch}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    onValueChange={(val) => setReqStatusFilter(val)}
                    value={reqStatusFilter}
                  >
                    <SelectTrigger
                      aria-label="Durum filtresi"
                      className="h-9 w-[150px] text-xs"
                    >
                      <SelectValue placeholder="Tüm Durumlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="Draft">Taslak</SelectItem>
                      <SelectItem value="Open">Yayında</SelectItem>
                      <SelectItem value="Closed">Kapalı</SelectItem>
                      <SelectItem value="Cancelled">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(val) => setReqPublishedFilter(val)}
                    value={reqPublishedFilter}
                  >
                    <SelectTrigger
                      aria-label="Yayın filtresi"
                      className="h-9 w-[130px] text-xs"
                    >
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="published">Yayında</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {pagedRequisitions.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                    <Briefcase className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                    <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      İlan bulunamadı
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Filtrelerinizi değiştirin veya yeni bir iş ilanı
                      oluşturun. İlanlar burada listelenir.
                    </p>
                    <button
                      className="mt-4 rounded-xl bg-foreground px-4 py-2 font-semibold text-background text-xs hover:bg-foreground/90"
                      onClick={openReqModalForCreate}
                      type="button"
                    >
                      Yeni İlan Ekle
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="border-border bg-zinc-50/90 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                          <TableRow>
                            <TableHead className="px-6 py-3.5 h-auto">
                              İlan Başlığı
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Departman
                            </TableHead>
                            <TableHead className="px-6 py-3.5 text-center h-auto">
                              Kontenjan
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Durum / Yayın
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Kapanış
                            </TableHead>
                            <TableHead className="px-6 py-3.5 text-right h-auto">
                              İşlemler
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {pagedRequisitions.map((req) => (
                            <TableRow
                              className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                              key={req.id}
                            >
                              <TableCell className="px-6 py-4">
                                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {req.title}
                                </div>
                                <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                                  {req.location && <span>{req.location}</span>}
                                  {req.workModel && (
                                    <>
                                      <span>•</span>
                                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-semibold text-3xs dark:bg-zinc-800">
                                        {req.workModel}
                                      </span>
                                    </>
                                  )}
                                  {req.employmentType && (
                                    <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 font-semibold text-3xs text-blue-700 dark:text-blue-300">
                                      {req.employmentType}
                                    </span>
                                  )}
                                </div>
                                {req.headcountWarning && (
                                  <p className="mt-1 text-2xs text-amber-700 dark:text-amber-400">
                                    {req.headcountWarning}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {req.departmentName || "—"}
                                </div>
                                <div className="text-2xs text-muted-foreground">
                                  {req.jobPositionTitle ||
                                    "Pozisyon belirtilmedi"}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-center">
                                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 font-bold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  {req.hiredCount}/{req.headcount}
                                </span>
                                <div className="mt-1 text-3xs text-muted-foreground">
                                  {req.applicationCount} başvuru
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-3xs ${getStatusBadge(req.status)}`}
                                >
                                  {getStatusLabel(req.status)}
                                </span>
                                <div className="mt-1 text-2xs text-muted-foreground">
                                  {req.isPublished ? (
                                    <span className="text-emerald-700 dark:text-emerald-300">
                                      Yayında
                                      {req.publishedAt
                                        ? ` • ${formatDate(req.publishedAt)}`
                                        : ""}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Taslak
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                                {req.closingDate
                                  ? formatDate(req.closingDate)
                                  : "—"}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-2xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                    onClick={() => openReqModalForEdit(req)}
                                    type="button"
                                  >
                                    Düzenle
                                  </button>
                                  {req.status === "Draft" &&
                                    !req.isPublished && (
                                      <button
                                        className="rounded-lg bg-emerald-700 px-2.5 py-1 font-semibold text-2xs text-white hover:bg-emerald-800"
                                        onClick={() =>
                                          handlePublishRequisition(req.id)
                                        }
                                        type="button"
                                      >
                                        Yayınla
                                      </button>
                                    )}
                                  {req.status === "Open" && (
                                    <button
                                      className="rounded-lg bg-amber-600 px-2.5 py-1 font-semibold text-2xs text-white hover:bg-amber-700"
                                      onClick={() =>
                                        handleCloseRequisition(req.id)
                                      }
                                      type="button"
                                    >
                                      Kapat
                                    </button>
                                  )}
                                  <button
                                    aria-label="İlanı sil"
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:text-rose-400 dark:text-zinc-500"
                                    onClick={() =>
                                      handleDeleteRequisition(req.id)
                                    }
                                    type="button"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={reqPage}
                      onPageChange={setReqPage}
                      pageSize={PAGE_SIZE}
                      totalCount={filteredRequisitions.length}
                    />
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === "adaylar" && (
            <section aria-label="Adaylar tablosu" className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    aria-label="Aday ara"
                    className="w-full rounded-xl border border-border bg-zinc-50 py-2 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                    onChange={(e) => setCandSearch(e.target.value)}
                    placeholder="Ad, e-posta, telefon veya etiket ara..."
                    type="text"
                    value={candSearch}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold">Kaynak:</span>
                  </div>
                  <Select
                    onValueChange={(val) => setCandSourceFilter(val)}
                    value={candSourceFilter}
                  >
                    <SelectTrigger
                      aria-label="Kaynak filtresi"
                      className="h-9 w-[160px] text-xs"
                    >
                      <SelectValue placeholder="Tüm Kaynaklar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                      <SelectItem value="Manual">Manuel</SelectItem>
                      <SelectItem value="CsvImport">CSV İçe Aktarım</SelectItem>
                      <SelectItem value="PublicForm">Public Form</SelectItem>
                      <SelectItem value="Referral">Referans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {pagedCandidates.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                    <Users className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                    <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      Aday bulunamadı
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Filtreleri değiştirin veya yeni aday ekleyin. KVKK onayı
                      zorunludur.
                    </p>
                    <button
                      className="mt-4 rounded-xl bg-foreground px-4 py-2 font-semibold text-background text-xs hover:bg-foreground/90"
                      onClick={openCandModalForCreate}
                      type="button"
                    >
                      Yeni Aday Ekle
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="border-border bg-zinc-50/90 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                          <TableRow>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Aday
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              E-posta / Telefon
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Kaynak
                            </TableHead>
                            <TableHead className="px-6 py-3.5 h-auto">
                              Etiketler
                            </TableHead>
                            <TableHead className="px-6 py-3.5 text-right h-auto">
                              İşlemler
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {pagedCandidates.map((c) => (
                            <TableRow
                              className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                              key={c.id}
                            >
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft font-extrabold text-accent-foreground text-xs shadow-xs">
                                    {c.firstName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                      {c.fullName}
                                    </div>
                                    <div className="text-2xs text-muted-foreground">
                                      {c.applicationCount} başvuru •{" "}
                                      {formatDate(c.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <div className="font-medium font-mono text-2xs text-zinc-800 dark:text-zinc-200">
                                  {c.email}
                                </div>
                                <div className="text-2xs text-muted-foreground">
                                  {c.phone || "Telefon yok"}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold text-3xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {c.source}
                                </span>
                                <div className="mt-1 text-3xs text-muted-foreground">
                                  {c.consentGiven ? "KVKK ✓" : "Onay yok"}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                {c.tags && c.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {c.tags.slice(0, 3).map((tag) => (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-3xs text-blue-700 dark:text-blue-300"
                                        key={`${c.id}-${tag}`}
                                      >
                                        <Tags className="h-2.5 w-2.5" />
                                        {tag}
                                      </span>
                                    ))}
                                    {c.tags.length > 3 && (
                                      <span className="text-3xs text-muted-foreground">
                                        +{c.tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-2xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                    onClick={() => setSelectedCandidateId(c.id)}
                                    type="button"
                                  >
                                    Görüntüle
                                  </button>
                                  <button
                                    aria-label="Adayı düzenle"
                                    className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    onClick={() => openCandModalForEdit(c)}
                                    type="button"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    aria-label="Adayı sil"
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:text-rose-400 dark:text-zinc-500"
                                    onClick={() => handleDeleteCandidate(c.id)}
                                    type="button"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={candPage}
                      onPageChange={setCandPage}
                      pageSize={PAGE_SIZE}
                      totalCount={filteredCandidates.length}
                    />
                  </>
                )}
              </div>
            </section>
          )}

          {activeTab === "basvurular" && (
            <section aria-label="Başvurular" className="space-y-4">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    aria-label="Başvuru ara"
                    className="w-full rounded-xl border border-border bg-zinc-50 py-2 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="Aday, e-posta, ilan veya aşama ara..."
                    type="text"
                    value={appSearch}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                    <button
                      aria-label="Tablo görünümü"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs ${viewMode === "table" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground"}`}
                      onClick={() => setViewMode("table")}
                      type="button"
                    >
                      <List className="h-3.5 w-3.5" />
                      Tablo
                    </button>
                    <button
                      aria-label="Kanban görünümü"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs ${viewMode === "kanban" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-muted-foreground"}`}
                      onClick={() => setViewMode("kanban")}
                      type="button"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Kanban
                    </button>
                  </div>
                  <Select
                    onValueChange={(val) => setAppStageFilter(val)}
                    value={appStageFilter}
                  >
                    <SelectTrigger
                      aria-label="Aşama filtresi"
                      className="h-9 w-[160px] text-xs"
                    >
                      <SelectValue placeholder="Tüm Aşamalar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Aşamalar</SelectItem>
                      {sortedStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 font-semibold text-background text-xs hover:bg-foreground/90"
                    onClick={() => setShowAppModal(true)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Başvuru Ekle
                  </button>
                </div>
              </div>

              {viewMode === "kanban" ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-[800px] gap-4">
                    {sortedStages
                      .filter((s) => s.isActive)
                      .map((stage) => {
                        const apps =
                          applicationsByStage.map.get(stage.id) || [];
                        return (
                          <div
                            className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-zinc-50 dark:bg-zinc-800/50"
                            key={stage.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggedAppId) {
                                handleMoveStage(draggedAppId, stage.id);
                                setDraggedAppId(null);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between rounded-t-2xl border-border border-b bg-card px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full border border-white shadow-xs"
                                  style={{ backgroundColor: stage.colorHex }}
                                />
                                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                  {stage.name}
                                </span>
                                {stage.isDefault && (
                                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.5 font-bold text-3xs text-blue-700 dark:text-blue-300">
                                    Varsayılan
                                  </span>
                                )}
                              </div>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-2xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                {apps.length}
                              </span>
                            </div>
                            <div className="flex max-h-[560px] min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                              {apps.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-card p-4 text-center text-xs text-muted-foreground">
                                  Bu aşamada başvuru yok
                                </div>
                              ) : (
                                apps.map((app) => (
                                  <div
                                    className="group cursor-grab rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:shadow-md active:cursor-grabbing"
                                    draggable
                                    key={app.id}
                                    onClick={() =>
                                      setSelectedApplicationId(app.id)
                                    }
                                    onDragEnd={() => setDraggedAppId(null)}
                                    onDragStart={() => setDraggedAppId(app.id)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                        {app.candidateName}
                                      </div>
                                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-300 group-hover:text-muted-foreground dark:text-zinc-600 dark:hover:text-zinc-400" />
                                    </div>
                                    <div className="font-mono text-2xs text-muted-foreground">
                                      {app.candidateEmail}
                                    </div>
                                    <div className="mt-1 font-semibold text-2xs text-zinc-600 dark:text-zinc-400">
                                      {app.requisitionTitle}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-3xs text-muted-foreground">
                                        {formatDate(app.createdAt)}
                                      </span>
                                      {app.score !== undefined &&
                                        app.score !== null && (
                                          <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 font-bold text-3xs text-blue-700 dark:text-blue-300">
                                            Puan {app.score}
                                          </span>
                                        )}
                                    </div>
                                    <div
                                      className="mt-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Select
                                        onValueChange={(val) => {
                                          if (val && val !== "NONE") {
                                            handleMoveStage(app.id, val);
                                          }
                                        }}
                                        value={app.stageId || "NONE"}
                                      >
                                        <SelectTrigger
                                          aria-label="Aşama değiştir"
                                          className="h-7 w-full text-2xs"
                                        >
                                          <SelectValue placeholder="Aşama taşı..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="NONE">
                                            Aşama taşı...
                                          </SelectItem>
                                          {activeStages.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                              {s.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {app.headcountWarning && (
                                      <p className="mt-1 text-2xs text-amber-700 dark:text-amber-400">
                                        {app.headcountWarning}
                                      </p>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {applicationsByStage.unassigned.length > 0 && (
                      <div className="flex w-72 shrink-0 flex-col rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/60">
                        <div className="flex items-center justify-between rounded-t-2xl border-amber-200 dark:border-amber-800 border-b bg-card px-3 py-2.5">
                          <span className="font-bold text-amber-800 text-xs">
                            Atanmamış
                          </span>
                          <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 font-bold text-2xs text-amber-700 dark:text-amber-400 dark:text-amber-300">
                            {applicationsByStage.unassigned.length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 p-2">
                          {applicationsByStage.unassigned.map((app) => (
                            <div
                              className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card p-3 shadow-xs"
                              key={app.id}
                            >
                              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                {app.candidateName}
                              </div>
                              <div className="text-2xs text-muted-foreground">
                                {app.requisitionTitle}
                              </div>
                              <button
                                className="mt-2 w-full rounded-lg bg-foreground px-2 py-1 font-semibold text-2xs text-background hover:bg-foreground/90"
                                onClick={() => setSelectedApplicationId(app.id)}
                                type="button"
                              >
                                Görüntüle
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                  {pagedApplications.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                      <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                      <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                        Başvuru bulunamadı
                      </h3>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        Adayları ilanlara bağlayarak başvuru oluşturun.
                      </p>
                      <button
                        className="mt-4 rounded-xl bg-foreground px-4 py-2 font-semibold text-background text-xs hover:bg-foreground/90"
                        onClick={() => setShowAppModal(true)}
                        type="button"
                      >
                        Başvuru Oluştur
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="border-border bg-zinc-50/90 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                            <TableRow>
                              <TableHead className="px-6 py-3.5 h-auto">
                                Aday
                              </TableHead>
                              <TableHead className="px-6 py-3.5 h-auto">
                                İlan
                              </TableHead>
                              <TableHead className="px-6 py-3.5 h-auto">
                                Aşama
                              </TableHead>
                              <TableHead className="px-6 py-3.5 text-center h-auto">
                                Puan
                              </TableHead>
                              <TableHead className="px-6 py-3.5 text-right h-auto">
                                İşlemler
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {pagedApplications.map((app) => (
                              <TableRow
                                className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                                key={app.id}
                              >
                                <TableCell className="px-6 py-4">
                                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                    {app.candidateName}
                                  </div>
                                  <div className="font-mono text-2xs text-muted-foreground">
                                    {app.candidateEmail}
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {app.requisitionTitle}
                                  </div>
                                  <div className="text-2xs text-muted-foreground">
                                    {formatDate(app.createdAt)}
                                  </div>
                                  {app.headcountWarning && (
                                    <p className="text-2xs text-amber-700 dark:text-amber-400">
                                      {app.headcountWarning}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  {app.stageName ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold text-2xs"
                                      style={{
                                        backgroundColor: `${app.stageColorHex || "#f1f5f9"}18`,
                                        borderColor:
                                          app.stageColorHex || "#e2e8f0",
                                        color: app.stageColorHex || "#475569",
                                      }}
                                    >
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{
                                          backgroundColor:
                                            app.stageColorHex || "#64748b",
                                        }}
                                      />
                                      {app.stageName}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                  <div className="mt-1 text-3xs text-muted-foreground">
                                    {app.status}
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                  {app.score !== undefined &&
                                  app.score !== null ? (
                                    <span className="rounded-lg bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300 text-xs">
                                      {app.score}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-2xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                      onClick={() =>
                                        setSelectedApplicationId(app.id)
                                      }
                                      type="button"
                                    >
                                      Detay
                                    </button>
                                    <Select
                                      onValueChange={(val) => {
                                        if (val && val !== "NONE") {
                                          handleMoveStage(app.id, val);
                                        }
                                      }}
                                      value={app.stageId || "NONE"}
                                    >
                                      <SelectTrigger
                                        aria-label="Aşama taşı"
                                        className="h-7 w-[120px] text-2xs"
                                      >
                                        <SelectValue placeholder="Aşama seç" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="NONE">
                                          Aşama seç
                                        </SelectItem>
                                        {activeStages.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Pagination
                        currentPage={appPage}
                        onPageChange={setAppPage}
                        pageSize={PAGE_SIZE}
                        totalCount={filteredApplications.length}
                      />
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === "ayarlar" && (
            <section aria-label="Ayarlar - aşamalar" className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      İşe Alım Aşamaları
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Hibrit aşama yönetimi — tenant bazlı, sıralama ve renk
                      destekli. Varsayılan aşamalar silinemez.
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 font-semibold text-background text-xs hover:bg-foreground/90"
                    onClick={openStageModalForCreate}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Yeni Aşama
                  </button>
                </div>

                {sortedStages.length === 0 ? (
                  <div className="mt-6 flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-zinc-50 p-8 text-center dark:bg-zinc-800/50">
                    <Layers className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="mt-2 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                      Henüz aşama yok
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Varsayılan 7 aşama seed ile gelir; yoksa ekleyin.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border">
                    <Table>
                      <TableHeader className="bg-zinc-50 font-bold text-muted-foreground dark:bg-zinc-800/50">
                        <TableRow>
                          <TableHead className="px-3 py-3 h-auto">#</TableHead>
                          <TableHead className="px-3 py-3 h-auto">
                            Aşama
                          </TableHead>
                          <TableHead className="px-3 py-3 h-auto">
                            Slug
                          </TableHead>
                          <TableHead className="px-3 py-3 h-auto">
                            Tür
                          </TableHead>
                          <TableHead className="px-3 py-3 h-auto">
                            Durum
                          </TableHead>
                          <TableHead className="px-3 py-3 text-center h-auto">
                            Başvuru
                          </TableHead>
                          <TableHead className="px-3 py-3 text-right h-auto">
                            İşlemler
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {sortedStages.map((s, idx) => (
                          <TableRow
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            key={s.id}
                          >
                            <TableCell className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-muted-foreground">
                                  {s.sortOrder}
                                </span>
                                <div className="flex flex-col">
                                  <button
                                    aria-label="Yukarı taşı"
                                    className="rounded p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                    disabled={idx === 0}
                                    onClick={() =>
                                      handleReorderStage(idx, "up")
                                    }
                                    type="button"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    aria-label="Aşağı taşı"
                                    className="rounded p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                    disabled={idx === sortedStages.length - 1}
                                    onClick={() =>
                                      handleReorderStage(idx, "down")
                                    }
                                    type="button"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full border border-white shadow-xs"
                                  style={{ backgroundColor: s.colorHex }}
                                />
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {s.name}
                                </span>
                                {s.isDefault && (
                                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 font-bold text-3xs text-blue-700 dark:text-blue-300">
                                    Varsayılan
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3 font-mono text-2xs text-muted-foreground">
                              {s.slug}
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-semibold text-3xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {s.stageType}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <button
                                aria-label={
                                  s.isActive ? "Pasif et" : "Aktif et"
                                }
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.isActive ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
                                onClick={() => handleToggleStageActive(s)}
                                type="button"
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow transition-transform ${s.isActive ? "translate-x-5" : "translate-x-1"}`}
                                />
                              </button>
                              <span className="ml-2 font-bold text-3xs text-zinc-600 dark:text-zinc-400">
                                {s.isActive ? "Aktif" : "Pasif"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-3 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                              {s.applicationCount}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  aria-label="Aşamayı düzenle"
                                  className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                  onClick={() => openStageModalForEdit(s)}
                                  type="button"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 dark:text-zinc-500"
                                  disabled={s.isDefault}
                                  onClick={() => handleDeleteStage(s)}
                                  title={
                                    s.isDefault
                                      ? "Varsayılan aşama silinemez"
                                      : "Sil"
                                  }
                                  type="button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-3 text-amber-800 dark:text-amber-300 text-xs">
                  <p className="font-bold">Notlar</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>
                      Varsayılan aşamalar (is_default) silinemez — 400 döner.
                    </li>
                    <li>Bağlı başvurusu olan aşama silinemez.</li>
                    <li>
                      Yukarı/Aşağı ile sıralı; oklar Reorder endpointini
                      çağırır.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Kanal & KVKK Ayarları (Bilgi)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Public başvuru linki / embed iframe, CSV içe aktarım (500
                  satır, duplicate skip), CV storage 5MB PDF/DOC/DOCX — kurallar
                  API’de uygulanır. Faz 2’de raporlama & işe alım → çalışan
                  dönüşümü eklenecek.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {showReqModal && (
        <RequisitionModal
          onClose={() => {
            setShowReqModal(false);
            setEditingRequisition(null);
          }}
          onSuccess={() => {
            setShowReqModal(false);
            setEditingRequisition(null);
            loadData();
          }}
          requisition={editingRequisition}
          tenantId={activeTenant?.id || ""}
        />
      )}
      {showCandModal && (
        <CandidateModal
          candidate={editingCandidate}
          onClose={() => {
            setShowCandModal(false);
            setEditingCandidate(null);
          }}
          onSuccess={() => {
            setShowCandModal(false);
            setEditingCandidate(null);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}
      {showAppModal && (
        <ApplicationModal
          candidates={candidates}
          onClose={() => setShowAppModal(false)}
          onSuccess={() => {
            setShowAppModal(false);
            loadData();
          }}
          requisitions={requisitions}
          stages={sortedStages}
          tenantId={activeTenant?.id || ""}
        />
      )}
      {showStageModal && (
        <StageModal
          onClose={() => {
            setShowStageModal(false);
            setEditingStage(null);
          }}
          onSuccess={() => {
            setShowStageModal(false);
            setEditingStage(null);
            loadData();
          }}
          stage={editingStage}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Drawers */}
      {selectedCandidate && (
        <CandidateDetailDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidateId(null)}
          onEdit={() => {
            setEditingCandidate(selectedCandidate);
            setShowCandModal(true);
          }}
        />
      )}
      {selectedApplication && (
        <ApplicationDetailDrawer
          application={selectedApplication}
          candidate={
            candidates.find((c) => c.id === selectedApplication.candidateId) ||
            null
          }
          onClose={() => setSelectedApplicationId(null)}
          onMoveStage={handleMoveStage}
          stages={sortedStages}
        />
      )}

      <ConfirmDialog
        confirmText="Onayla"
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </PageContainer>
  );
}

function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-between border-border border-t px-4 py-3 text-xs">
      <span className="text-muted-foreground">
        Toplam {totalCount} kayıt • Sayfa {currentPage}/{totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          className="rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Önceki
        </button>
        <button
          className="rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}

// ---------------- Modals ----------------

function RequisitionModal({
  requisition,
  tenantId,
  onClose,
  onSuccess,
}: {
  requisition: RequisitionDto | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(requisition?.title || "");
  const [headcount, setHeadcount] = useState(
    requisition?.headcount?.toString() || "1"
  );
  const [employmentType, setEmploymentType] = useState(
    requisition?.employmentType || "FullTime"
  );
  const [workModel, setWorkModel] = useState(
    requisition?.workModel || "OnSite"
  );
  const [location, setLocation] = useState(requisition?.location || "");
  const [minSalary, setMinSalary] = useState(
    requisition?.minSalary?.toString() || ""
  );
  const [maxSalary, setMaxSalary] = useState(
    requisition?.maxSalary?.toString() || ""
  );
  const [currency, setCurrency] = useState(requisition?.currency || "TRY");
  const [description, setDescription] = useState(
    requisition?.description || ""
  );
  const [requirements, setRequirements] = useState(
    requisition?.requirements || ""
  );
  const [closingDate, setClosingDate] = useState(
    requisition?.closingDate ? requisition.closingDate.split("T")[0]! : ""
  );
  const [priority, setPriority] = useState(requisition?.priority || "Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Başlık zorunludur.");
      return;
    }
    const hc = Number.parseInt(headcount, 10);
    if (!hc || hc < 1) {
      toast.error("Kontenjan en az 1 olmalı.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      closingDate: closingDate || undefined,
      currency,
      description: description.trim() || undefined,
      employmentType: employmentType || undefined,
      headcount: hc,
      location: location.trim() || undefined,
      maxSalary: maxSalary ? Number.parseFloat(maxSalary) : undefined,
      minSalary: minSalary ? Number.parseFloat(minSalary) : undefined,
      priority,
      requirements: requirements.trim() || undefined,
      title: title.trim(),
      workModel: workModel || undefined,
    };
    const res = requisition?.id
      ? await ApiClient.updateRequisition(requisition.id, payload, tenantId)
      : await ApiClient.createRequisition(payload, tenantId);
    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        requisition?.id ? "İlan güncellendi." : "İlan oluşturuldu."
      );
      onSuccess();
    } else {
      const msg = res.message || "İşlem başarısız.";
      // FluentValidation errors may be in message
      toast.error(msg);
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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <Briefcase className="h-5 w-5 text-primary " />
            {requisition?.id ? "İlanı Düzenle" : "Yeni İş İlanı"}
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label required>İlan Başlığı</Label>
            <Input
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Senior Frontend Developer"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label required>Kontenjan</Label>
              <NumberInput
                min={1}
                onChange={(val) =>
                  setHeadcount(val === undefined ? "1" : String(val))
                }
                showStepper
                value={headcount === "" ? undefined : Number(headcount)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Öncelik</Label>
              <Select onValueChange={setPriority} value={priority}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Öncelik Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Düşük</SelectItem>
                  <SelectItem value="Medium">Orta</SelectItem>
                  <SelectItem value="High">Yüksek</SelectItem>
                  <SelectItem value="Urgent">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kapanış Tarihi</Label>
              <DatePicker
                className="w-full"
                onChange={setClosingDate}
                placeholder="Kapanış tarihi seçin"
                value={closingDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Çalışma Şekli</Label>
              <Select onValueChange={setEmploymentType} value={employmentType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Çalışma Şekli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FullTime">Tam Zamanlı</SelectItem>
                  <SelectItem value="PartTime">Yarı Zamanlı</SelectItem>
                  <SelectItem value="Contract">Sözleşmeli</SelectItem>
                  <SelectItem value="Intern">Stajyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Çalışma Modeli</Label>
              <Select onValueChange={setWorkModel} value={workModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Çalışma Modeli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OnSite">Ofiste</SelectItem>
                  <SelectItem value="Remote">Uzaktan</SelectItem>
                  <SelectItem value="Hybrid">Hibrit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lokasyon</Label>
              <Input
                onChange={(e) => setLocation(e.target.value)}
                placeholder="İstanbul"
                type="text"
                value={location}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Min Maaş</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setMinSalary(val === undefined ? "" : String(val))
                }
                placeholder="50000"
                prefix={
                  currency === "TRY" ? "₺" : currency === "USD" ? "$" : "€"
                }
                value={minSalary === "" ? undefined : Number(minSalary)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Maaş</Label>
              <NumberInput
                min={0}
                onChange={(val) =>
                  setMaxSalary(val === undefined ? "" : String(val))
                }
                placeholder="80000"
                prefix={
                  currency === "TRY" ? "₺" : currency === "USD" ? "$" : "€"
                }
                value={maxSalary === "" ? undefined : Number(maxSalary)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <Select onValueChange={setCurrency} value={currency}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Para Birimi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İlan detayları..."
              rows={3}
              value={description}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gereksinimler</Label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Aranan nitelikler..."
              rows={2}
              value={requirements}
            />
          </div>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2 font-semibold text-background shadow-xs hover:bg-foreground/90 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{requisition?.id ? "Güncelle" : "Oluştur"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CandidateModal({
  candidate,
  tenantId,
  onClose,
  onSuccess,
}: {
  candidate: CandidateDto | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState(candidate?.firstName || "");
  const [lastName, setLastName] = useState(candidate?.lastName || "");
  const [email, setEmail] = useState(candidate?.email || "");
  const [phone, setPhone] = useState(candidate?.phone || "");
  const [birthDate, setBirthDate] = useState(
    candidate?.birthDate ? candidate.birthDate.split("T")[0]! : ""
  );
  const [address, setAddress] = useState(candidate?.address || "");
  const [source, setSource] = useState(candidate?.source || "Manual");
  const [tagsRaw, setTagsRaw] = useState(candidate?.tags?.join(", ") || "");
  const [notes, setNotes] = useState(candidate?.notes || "");
  const [consentGiven, setConsentGiven] = useState(candidate?.consentGiven);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extOk = [".pdf", ".doc", ".docx"].some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!(allowed.includes(file.type) || extOk)) {
      toast.error("Sadece PDF, DOC, DOCX dosyaları yüklenebilir.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya 5MB sınırını aşıyor.");
      return;
    }
    setSelectedFile(file);
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      toast.error("KVKK onayı zorunludur. Lütfen onay kutusunu işaretleyin.");
      return;
    }
    if (!(firstName.trim() && lastName.trim() && email.trim())) {
      toast.error("Ad, soyad ve e-posta zorunludur.");
      return;
    }
    setIsSubmitting(true);
    setDuplicateWarning("");
    const payload = {
      address: address.trim() || undefined,
      birthDate: birthDate || undefined,
      consentGiven,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      notes: notes.trim() || undefined,
      phone: phone.trim() || undefined,
      source,
      tags: tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const res = candidate?.id
      ? await ApiClient.updateCandidate(candidate.id, payload, tenantId)
      : await ApiClient.createCandidate(payload, tenantId);
    if (!res.success) {
      setIsSubmitting(false);
      const msg = res.message || "İşlem başarısız.";
      if (
        res.errorCode === "409" ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("zaten") ||
        res.errorCode === "Conflict"
      ) {
        setDuplicateWarning("Bu e-posta ile aday zaten mevcut (tenant bazlı).");
        toast.warning("Duplicate e-posta: aday zaten mevcut.");
      } else {
        toast.error(msg);
      }
      return;
    }
    // handle CV upload if file selected
    const createdId = res.data?.id || candidate?.id;
    if (selectedFile && createdId) {
      const uploadRes = await ApiClient.uploadCv(
        createdId,
        selectedFile,
        tenantId
      );
      if (uploadRes.success) {
        toast.success("CV yüklendi.");
      } else {
        toast.error(uploadRes.message || "CV yüklenemedi.");
      }
    }
    setIsSubmitting(false);
    toast.success(candidate?.id ? "Aday güncellendi." : "Aday oluşturuldu.");
    onSuccess();
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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <Users className="h-5 w-5 text-primary " />
            {candidate?.id ? "Adayı Düzenle" : "Yeni Aday Ekle"}
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label required>Ad</Label>
              <Input
                onChange={(e) => setFirstName(e.target.value)}
                required
                type="text"
                value={firstName}
              />
            </div>
            <div className="space-y-1.5">
              <Label required>Soyad</Label>
              <Input
                onChange={(e) => setLastName(e.target.value)}
                required
                type="text"
                value={lastName}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label required>E-posta</Label>
            <Input
              className="font-mono"
              onChange={(e) => {
                setEmail(e.target.value);
                setDuplicateWarning("");
              }}
              required
              type="email"
              value={email}
            />
            {duplicateWarning && (
              <p className="mt-1 text-2xs text-amber-700 dark:text-amber-400">
                {duplicateWarning}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                onChange={(e) => setPhone(e.target.value)}
                type="text"
                value={phone}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Doğum Tarihi</Label>
              <DatePicker
                className="w-full"
                onChange={setBirthDate}
                placeholder="Doğum tarihi seçin"
                value={birthDate}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adres</Label>
            <Input
              onChange={(e) => setAddress(e.target.value)}
              type="text"
              value={address}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kaynak</Label>
              <Select onValueChange={setSource} value={source}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kaynak Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manuel</SelectItem>
                  <SelectItem value="CsvImport">CSV İçe Aktarım</SelectItem>
                  <SelectItem value="PublicForm">Public Form</SelectItem>
                  <SelectItem value="Referral">Referans</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Etiketler (virgülle ayır)</Label>
              <Input
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="react, senior, remote"
                type="text"
                value={tagsRaw}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-zinc-800 dark:text-zinc-200">
              Notlar
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              value={notes}
            />
          </div>

          <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <label className="mb-1 block font-semibold text-zinc-800 dark:text-zinc-200">
              CV Yükle (PDF/DOC/DOCX, max 5MB)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
                <Upload className="h-3.5 w-3.5" />
                <span>Dosya Seç</span>
                <input
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  type="file"
                />
              </label>
              <span className="text-xs text-muted-foreground">
                {selectedFile
                  ? selectedFile.name
                  : candidate?.cvFileName || "Henüz dosya yok"}
              </span>
            </div>
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <object
                  className="h-48 w-full"
                  data={previewUrl}
                  type="application/pdf"
                >
                  <p className="p-3 text-xs text-muted-foreground">
                    PDF önizleme desteklenmiyor,{" "}
                    <a
                      className="text-primary  underline"
                      href={previewUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      dosyayı aç
                    </a>
                    .
                  </p>
                </object>
              </div>
            )}
            {candidate?.cvFileUrl && !previewUrl && (
              <a
                className="mt-2 inline-flex items-center gap-1 text-primary  text-xs underline"
                href={candidate.cvFileUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <FileText className="h-3 w-3" />
                Mevcut CV: {candidate.cvFileName || "Görüntüle"}
              </a>
            )}
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 p-3">
            <input
              checked={consentGiven}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary  focus:ring-blue-500"
              onChange={(e) => setConsentGiven(e.target.checked)}
              type="checkbox"
            />
            <span className="text-xs text-zinc-700 leading-relaxed dark:text-zinc-300">
              KVKK aydınlatma metnini okudum, kişisel verilerimin işe alım
              süreçlerinde işlenmesine <strong>açık rıza veriyorum</strong>. *
            </span>
          </label>
          {!consentGiven && (
            <p className="text-2xs text-amber-700 dark:text-amber-400">
              KVKK onayı olmadan aday oluşturulamaz.
            </p>
          )}

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2 font-semibold text-background shadow-xs hover:bg-foreground/90 disabled:opacity-50"
              disabled={isSubmitting || !consentGiven}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{candidate?.id ? "Güncelle" : "Aday Oluştur"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationModal({
  candidates,
  requisitions,
  stages,
  tenantId,
  onClose,
  onSuccess,
}: {
  candidates: CandidateDto[];
  requisitions: RequisitionDto[];
  stages: StageDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [candidateId, setCandidateId] = useState("");
  const [requisitionId, setRequisitionId] = useState("");
  const [stageId, setStageId] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(candidateId && requisitionId)) {
      toast.error("Aday ve ilan seçimi zorunludur.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      candidateId,
      notes: notes.trim() || undefined,
      requisitionId,
      score: score ? Number.parseInt(score, 10) : undefined,
      stageId: stageId || undefined,
    };
    const res = await ApiClient.createApplication(payload, tenantId);
    setIsSubmitting(false);
    if (res.success) {
      toast.success("Başvuru oluşturuldu.");
      if (res.data?.headcountWarning) {
        toast.warning(res.data.headcountWarning);
      }
      onSuccess();
    } else {
      toast.error(
        res.message ||
          "Başvuru oluşturulamadı. Duplicate veya kapalı ilan olabilir."
      );
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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            Yeni Başvuru
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label required>Aday</Label>
            <Select onValueChange={setCandidateId} value={candidateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Aday seçin" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName} — {c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>İlan</Label>
            <Select onValueChange={setRequisitionId} value={requisitionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="İlan seçin" />
              </SelectTrigger>
              <SelectContent>
                {requisitions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Aşama</Label>
            <Select
              onValueChange={(val) => setStageId(val === "DEFAULT" ? "" : val)}
              value={stageId || "DEFAULT"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Varsayılan (Applied)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Varsayılan (Applied)</SelectItem>
                {stages
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Puan (0-100)</Label>
            <NumberInput
              max={100}
              min={0}
              onChange={(val) => setScore(val === undefined ? "" : String(val))}
              showStepper
              value={score === "" ? undefined : Number(score)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              value={notes}
            />
          </div>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 font-semibold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Oluştur</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StageModal({
  stage,
  tenantId,
  onClose,
  onSuccess,
}: {
  stage: StageDto | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(stage?.name || "");
  const [slug, setSlug] = useState(stage?.slug || "");
  const [colorHex, setColorHex] = useState(stage?.colorHex || "#7c3aed");
  const [stageType, setStageType] = useState(stage?.stageType || "Active");
  const [isActive, setIsActive] = useState(stage?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Aşama adı zorunludur.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      colorHex,
      isActive,
      name: name.trim(),
      slug: slug.trim() || undefined,
      stageType,
    };
    const res = stage?.id
      ? await ApiClient.updateStage(stage.id, payload, tenantId)
      : await ApiClient.createStage(payload, tenantId);
    setIsSubmitting(false);
    if (res.success) {
      toast.success(stage?.id ? "Aşama güncellendi." : "Aşama oluşturuldu.");
      onSuccess();
    } else {
      toast.error(res.message || "İşlem başarısız.");
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
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <Layers className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            {stage?.id ? "Aşamayı Düzenle" : "Yeni Aşama Ekle"}
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="text-muted-foreground hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-semibold text-zinc-800 dark:text-zinc-200">
              Aşama Adı *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setName(e.target.value)}
              required
              type="text"
              value={name}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-zinc-800 dark:text-zinc-200">
              Slug (opsiyonel)
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
              onChange={(e) => setSlug(e.target.value)}
              placeholder="otomatik oluşturulur"
              type="text"
              value={slug}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-zinc-800 dark:text-zinc-200">
                Renk
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="h-9 w-12 rounded-xl border border-border p-1"
                  onChange={(e) => setColorHex(e.target.value)}
                  type="color"
                  value={colorHex}
                />
                <input
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 font-mono text-zinc-900 focus:border-ring focus:outline-none dark:text-zinc-100"
                  onChange={(e) => setColorHex(e.target.value)}
                  type="text"
                  value={colorHex}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tür</Label>
              <Select onValueChange={setStageType} value={stageType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tür Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Aktif</SelectItem>
                  <SelectItem value="Success">Başarılı (Hired)</SelectItem>
                  <SelectItem value="Rejected">Reddedildi</SelectItem>
                  <SelectItem value="Withdrawn">Çekildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              checked={isActive}
              className="h-4 w-4 rounded border-border text-primary "
              onChange={(e) => setIsActive(e.target.checked)}
              type="checkbox"
            />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Aktif
            </span>
          </label>

          <div className="flex justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2 font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{stage?.id ? "Güncelle" : "Oluştur"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Drawers ----------------

function CandidateDetailDrawer({
  candidate,
  onClose,
  onEdit,
}: {
  candidate: CandidateDto;
  onClose: () => void;
  onEdit: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isPdf = candidate.cvFileUrl?.toLowerCase().endsWith(".pdf");

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
        className="data-[side=right]:w-full max-w-md overflow-y-auto p-6 data-[side=right]:sm:max-w-md"
        side="right"
      >
        <div className="flex items-center justify-between border-border border-b pb-4">
          <span className="font-bold font-mono text-xs text-muted-foreground">
            ADAY DETAYI
          </span>
          <div className="flex items-center gap-1">
            <button
              className="flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              onClick={onEdit}
              type="button"
            >
              <Edit2 className="h-3.5 w-3.5 text-primary " />
              Düzenle
            </button>
            <SheetClose asChild>
              <button
                aria-label="Kapat"
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft font-extrabold text-lg text-accent-foreground shadow-lg">
            {candidate.firstName.charAt(0).toUpperCase()}
          </div>
          <SheetTitle className="mt-3 font-bold text-lg text-zinc-900 dark:text-zinc-100">
            {candidate.fullName}
          </SheetTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {candidate.email}
          </p>
          {candidate.phone && (
            <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <Phone className="h-3 w-3" />
              {candidate.phone}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold text-2xs ${candidate.consentGiven ? "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"}`}
            >
              {candidate.consentGiven ? "KVKK ✓" : "KVKK Onay Yok"}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold text-2xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {candidate.source}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-border bg-zinc-50/70 p-4 text-xs dark:bg-zinc-800/40">
          <h4 className="font-bold text-2xs text-muted-foreground uppercase tracking-wider">
            Bilgiler
          </h4>
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{candidate.email}</span>
          </div>
          {candidate.address && (
            <div className="text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold">Adres:</span> {candidate.address}
            </div>
          )}
          {candidate.birthDate && (
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Doğum: {new Date(candidate.birthDate).toLocaleDateString("tr-TR")}
            </div>
          )}
          <div className="text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold">Başvuru sayısı:</span>{" "}
            {candidate.applicationCount}
          </div>
          {candidate.tags && candidate.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {candidate.tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-3xs text-blue-700 dark:text-blue-300"
                  key={tag}
                >
                  <Tags className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
          {candidate.notes && (
            <div className="rounded-xl bg-card p-3 text-zinc-700 dark:text-zinc-300">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                Notlar
              </div>
              <p className="mt-1 leading-relaxed">{candidate.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border p-4">
          <h4 className="font-bold text-2xs text-muted-foreground uppercase tracking-wider">
            CV
          </h4>
          {candidate.cvFileUrl ? (
            <div className="mt-2 space-y-2">
              <a
                className="inline-flex items-center gap-1 font-semibold text-primary  text-xs underline"
                href={candidate.cvFileUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Eye className="h-3.5 w-3.5" />
                {candidate.cvFileName || "CV Görüntüle"} — Yeni sekmede aç
              </a>
              {isPdf ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <object
                    className="h-64 w-full"
                    data={candidate.cvFileUrl}
                    type="application/pdf"
                  >
                    <p className="p-3 text-xs text-muted-foreground">
                      Önizleme desteklenmiyor.{" "}
                      <a
                        className="text-primary  underline"
                        href={candidate.cvFileUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        İndir
                      </a>
                    </p>
                  </object>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  DOC/DOCX önizleme için dosyayı indirin.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              CV yüklenmemiş.
            </p>
          )}
        </div>

        <div className="mt-6 border-border border-t pt-4">
          <button
            className="w-full rounded-xl bg-foreground py-2.5 font-semibold text-background text-xs hover:bg-foreground/90"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ApplicationDetailDrawer({
  application,
  candidate,
  stages,
  onClose,
  onMoveStage,
}: {
  application: ApplicationDto;
  candidate: CandidateDto | null;
  stages: StageDto[];
  onClose: () => void;
  onMoveStage: (id: string, stageId: string) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
        className="data-[side=right]:w-full max-w-md overflow-y-auto p-6 data-[side=right]:sm:max-w-md"
        side="right"
      >
        <div className="flex items-center justify-between border-border border-b pb-4">
          <span className="font-bold font-mono text-xs text-muted-foreground">
            BAŞVURU DETAYI
          </span>
          <SheetClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <SheetTitle className="font-bold text-zinc-900 dark:text-zinc-100">
              {application.candidateName}
            </SheetTitle>
            <p className="font-mono text-xs text-muted-foreground">
              {application.candidateEmail}
            </p>
            <p className="mt-1 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              {application.requisitionTitle}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-zinc-50/70 p-3 dark:bg-zinc-800/40">
            <div className="font-bold text-2xs text-muted-foreground uppercase tracking-wider">
              Aşama
            </div>
            {application.stageName ? (
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-white shadow-xs"
                  style={{
                    backgroundColor: application.stageColorHex || "#64748b",
                  }}
                />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {application.stageName}
                </span>
                <span className="text-2xs text-muted-foreground">
                  — {application.status}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Atanmamış</span>
            )}
            {application.headcountWarning && (
              <p className="mt-2 text-amber-700 dark:text-amber-400 text-xs">
                {application.headcountWarning}
              </p>
            )}
            <div className="mt-3 space-y-1.5">
              <Label>Aşama Taşı (klavye erişimli)</Label>
              <Select
                onValueChange={(val) => {
                  if (val && val !== "NONE") {
                    onMoveStage(application.id, val);
                  }
                }}
                value={application.stageId || "NONE"}
              >
                <SelectTrigger aria-label="Aşama değiştir" className="w-full">
                  <SelectValue placeholder="Aşama seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Seçin</SelectItem>
                  {stages
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-border p-3 text-center">
              <div className="font-bold text-2xs text-muted-foreground uppercase">
                Puan
              </div>
              <div className="mt-1 font-bold text-blue-700">
                {application.score ?? "—"}
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-border p-3 text-center">
              <div className="font-bold text-2xs text-muted-foreground uppercase">
                Durum
              </div>
              <div className="mt-1 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                {application.status}
              </div>
            </div>
          </div>

          {application.notes && (
            <div className="rounded-xl border border-border p-3">
              <div className="font-bold text-2xs text-muted-foreground uppercase">
                Notlar
              </div>
              <p className="mt-1 text-xs text-zinc-700 leading-relaxed dark:text-zinc-300">
                {application.notes}
              </p>
            </div>
          )}

          {candidate && (
            <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <div className="font-bold text-2xs text-muted-foreground uppercase">
                Aday KVKK & Etiketler
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 font-bold text-2xs ${candidate.consentGiven ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"}`}
                >
                  {candidate.consentGiven ? "KVKK ✓" : "KVKK Yok"}
                </span>
                {candidate.tags?.map((t) => (
                  <span
                    className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-3xs text-blue-700 dark:text-blue-300"
                    key={t}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {candidate.cvFileUrl && (
                <a
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-primary  text-xs underline"
                  href={candidate.cvFileUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <FileText className="h-3 w-3" />
                  CV Görüntüle
                </a>
              )}
              {candidate.cvFileUrl &&
                candidate.cvFileUrl.toLowerCase().endsWith(".pdf") && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                    <object
                      className="h-48 w-full"
                      data={candidate.cvFileUrl}
                      type="application/pdf"
                    >
                      <p className="p-2 text-xs text-muted-foreground">
                        Önizleme yok
                      </p>
                    </object>
                  </div>
                )}
            </div>
          )}

          <div className="rounded-xl border border-border p-3 text-xs">
            <div className="font-bold text-2xs text-muted-foreground uppercase">
              Zaman
            </div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">
              Oluşturulma:{" "}
              {new Date(application.createdAt).toLocaleString("tr-TR")}
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              Güncelleme:{" "}
              {new Date(application.updatedAt).toLocaleString("tr-TR")}
            </div>
          </div>
        </div>

        <div className="mt-6 border-border border-t pt-4">
          <button
            className="w-full rounded-xl bg-foreground py-2.5 font-semibold text-background text-xs hover:bg-foreground/90"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
