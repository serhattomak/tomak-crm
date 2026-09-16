"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FolderPlus,
  Layers,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  Table as TableIcon,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CustomerListDto,
  type EmployeeDto,
  type ProjectSummaryDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function ProjectsPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals & Toast
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [leadUserId, setLeadUserId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState("TRY");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    try {
      const [projRes, empRes, custRes] = await Promise.all([
        ApiClient.getProjects(
          {
            search: search.trim() || undefined,
            status: statusFilter || undefined,
          },
          activeTenant.id
        ),
        ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
        ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
      ]);

      if (projRes.success && projRes.data) {
        setProjects(projRes.data);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data.items);
      }
    } catch {
      showToast("Veriler yüklenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && key.trim() && activeTenant) || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const leadUser = employees.find((e) => e.id === leadUserId);
      const customer = customers.find((c) => c.id === customerId);

      const res = await ApiClient.createProject(
        {
          budget: Number(budget) || 0,
          currency,
          customerId: customerId || undefined,
          customerName: customer?.name || undefined,
          description: description.trim() || undefined,
          key: key.trim().toUpperCase(),
          leadUserId: leadUserId || undefined,
          leadUserName: leadUser?.fullName || undefined,
          name: name.trim(),
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          status,
          targetEndDate: targetEndDate
            ? new Date(targetEndDate).toISOString()
            : undefined,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("Proje başarıyla oluşturuldu!");
        setIsCreateModalOpen(false);
        // Reset form
        setName("");
        setKey("");
        setDescription("");
        setBudget(0);
        setLeadUserId("");
        setCustomerId("");
        setStartDate("");
        setTargetEndDate("");
        loadData();
      } else {
        showToast(res.message || "Proje oluşturulamadı.");
      }
    } catch {
      showToast("İşlem sırasında hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalActiveItems = projects.reduce(
    (acc, p) => acc + p.activeItemsCount,
    0
  );
  const totalCompletedItems = projects.reduce(
    (acc, p) => acc + p.completedItemsCount,
    0
  );
  const totalSprints = projects.reduce((acc, p) => acc + p.sprintsCount, 0);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Planning":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "OnHold":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Completed":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-border dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case "Active":
        return "Aktif";
      case "Planning":
        return "Planlanıyor";
      case "OnHold":
        return "Beklemede";
      case "Completed":
        return "Tamamlandı";
      default:
        return "Arşiv";
    }
  };

  return (
    <PageContainer className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            Projeler & Agile Backlog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sprint planlamaları, epikler, iş maddeleri ve CRM entegre görev
            yönetimi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={loadData}
            type="button"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Yenile</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-95"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Proje</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-xs text-muted-foreground">
              Toplam Proje
            </div>
            <div className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {projects.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-xs text-muted-foreground">
              Aktif Sprintler
            </div>
            <div className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {totalSprints}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shadow-2xs dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-xs text-muted-foreground">
              Açık İş Maddeleri
            </div>
            <div className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {totalActiveItems}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-2xs dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-xs text-muted-foreground">
              Tamamlanan Görevler
            </div>
            <div className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
              {totalCompletedItems}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-xl border border-border bg-zinc-50/70 py-2 pr-3 pl-9 text-xs text-zinc-900 placeholder:text-muted-foreground focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Proje adı veya anahtarı (örn. CRM) ara..."
              type="text"
              value={search}
            />
          </div>

          <SelectField
            aria-label="Durum filtresi"
            onChange={setStatusFilter}
            options={[
              { label: "Aktif", value: "Active" },
              { label: "Planlanıyor", value: "Planning" },
              { label: "Beklemede", value: "OnHold" },
              { label: "Tamamlandı", value: "Completed" },
            ]}
            placeholder="Tüm Durumlar"
            triggerClassName="px-3 py-2 font-medium"
            value={statusFilter}
          />
        </div>

        <div className="flex items-center gap-1.5 border-border border-t pt-3 sm:border-t-0 sm:pt-0">
          <button
            className={`rounded-xl p-2 transition ${
              viewMode === "grid"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
            onClick={() => setViewMode("grid")}
            title="Kart Görünümü"
            type="button"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`rounded-xl p-2 transition ${
              viewMode === "table"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
            onClick={() => setViewMode("table")}
            title="Tablo Görünümü"
            type="button"
          >
            <TableIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Projects List View */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              className="h-56 animate-pulse rounded-2xl border border-border bg-zinc-100 dark:bg-zinc-800/40"
              key={i}
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border border-dashed bg-card py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-muted-foreground shadow-2xs dark:bg-zinc-800">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-bold text-base text-zinc-900 dark:text-zinc-100">
            Henüz proje bulunmuyor
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Yeni bir proje oluşturarak sprintler, epikler ve iş maddeleri
            tanımlayabilirsiniz.
          </p>
          <button
            className="mt-5 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>İlk Projeyi Oluştur</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => {
            const total = proj.activeItemsCount + proj.completedItemsCount;
            const progress =
              total > 0
                ? Math.round((proj.completedItemsCount / total) * 100)
                : 0;

            return (
              <Link
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
                href={`/${tenantSlug}/projects/${proj.id}`}
                key={proj.id}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs dark:bg-blue-950/80 dark:text-blue-300">
                        {proj.key}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 transition group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
                          {proj.name}
                        </h3>
                        {proj.customerName && (
                          <div className="text-2xs text-muted-foreground">
                            {proj.customerName}
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`rounded-md border px-2 py-0.5 font-bold text-3xs ${getStatusBadge(
                        proj.status
                      )}`}
                    >
                      {getStatusLabel(proj.status)}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                      {proj.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-medium text-muted-foreground">
                        İlerleme
                      </span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        %{progress} ({proj.completedItemsCount}/{total})
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-border border-t pt-3 text-2xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{proj.leadUserName || "Atanmamış"}</span>
                  </div>

                  <div className="flex items-center gap-1 font-semibold text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-400">
                    <span>Backlog'a Git</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-border bg-zinc-50/50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                <TableRow>
                  <TableHead className="px-4 py-3 h-auto">Anahtar</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Proje Adı</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Müşteri</TableHead>
                  <TableHead className="px-4 py-3 h-auto">
                    Lider / Sorumlu
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto">Durum</TableHead>
                  <TableHead className="px-4 py-3 h-auto">
                    İş Maddeleri
                  </TableHead>
                  <TableHead className="px-4 py-3 h-auto">Bütçe</TableHead>
                  <TableHead className="px-4 py-3 text-right h-auto">
                    Aksiyon
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {projects.map((proj) => (
                  <TableRow
                    className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                    key={proj.id}
                  >
                    <TableCell className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                      {proj.key}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      <Link
                        className="hover:underline"
                        href={`/${tenantSlug}/projects/${proj.id}`}
                      >
                        {proj.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {proj.customerName || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {proj.leadUserName || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-bold text-3xs ${getStatusBadge(
                          proj.status
                        )}`}
                      >
                        {getStatusLabel(proj.status)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {proj.activeItemsCount} açık / {proj.completedItemsCount}{" "}
                      bitti
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                      {proj.budget > 0
                        ? `${proj.budget.toLocaleString("tr-TR")} ${proj.currency}`
                        : "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link
                        className="font-bold text-blue-600 hover:underline dark:text-blue-400"
                        href={`/${tenantSlug}/projects/${proj.id}`}
                      >
                        Aç ➜
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Yeni Proje Oluştur
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form
              className="mt-4 space-y-4 text-xs"
              onSubmit={handleCreateProject}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Proje Adı *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn. Mobil Uygulama Revizyonu"
                    required
                    type="text"
                    value={name}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Anahtar (Key) *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-zinc-50/70 p-2.5 font-bold text-xs text-zinc-900 uppercase focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                    maxLength={10}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="MOB"
                    required
                    type="text"
                    value={key}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Açıklama & Hedef
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Projenin amacı ve kapsamı..."
                  rows={2}
                  value={description}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Proje Lideri
                  </label>
                  <Combobox
                    aria-label="Proje Lideri"
                    onChange={setLeadUserId}
                    options={[
                      { label: "Seçiniz", value: "" },
                      ...employees.map((emp) => ({
                        label: `${emp.fullName} (${emp.title || "Temsilci"})`,
                        value: emp.id,
                      })),
                    ]}
                    placeholder="Seçiniz"
                    value={leadUserId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Müşteri (Opsiyonel)
                  </label>
                  <Combobox
                    aria-label="Müşteri"
                    onChange={setCustomerId}
                    options={[
                      { label: "İlişkisiz (Dahili)", value: "" },
                      ...customers.map((c) => ({ label: c.name, value: c.id })),
                    ]}
                    placeholder="İlişkisiz (Dahili)"
                    value={customerId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Bütçe
                  </label>
                  <NumberInput
                    min={0}
                    onChange={setBudget}
                    precision={2}
                    suffix={currency}
                    value={budget}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Durum
                  </label>
                  <SelectField
                    aria-label="Durum"
                    onChange={setStatus}
                    options={[
                      { label: "Aktif", value: "Active" },
                      { label: "Planlanıyor", value: "Planning" },
                      { label: "Beklemede", value: "OnHold" },
                    ]}
                    value={status}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Başlangıç Tarihi
                  </label>
                  <DatePicker onChange={setStartDate} value={startDate} />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Hedef Bitiş Tarihi
                  </label>
                  <DatePicker
                    onChange={setTargetEndDate}
                    value={targetEndDate}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-border border-t pt-4">
                <button
                  className="rounded-xl border border-border px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  disabled={!(name.trim() && key.trim()) || submitting}
                  type="submit"
                >
                  {submitting ? "Kaydediliyor..." : "Projeyi Oluştur"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
