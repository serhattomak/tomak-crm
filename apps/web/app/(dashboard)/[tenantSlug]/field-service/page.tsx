"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Plus,
  Search,
  Navigation,
  PenTool,
  CheckSquare,
  Square,
  Truck,
  Phone,
  Layers,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  ApiClient,
  type FieldJobDto,
  type CreateFieldJobPayload,
  type TenantUserDto,
  type CustomerListDto
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function FieldServicePage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant, profile } = usePermissions();

  const [jobs, setJobs] = useState<FieldJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<FieldJobDto | null>(null);

  // Create Job Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [teamUsers, setTeamUsers] = useState<TenantUserDto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Dialog State
  const [jobToDelete, setJobToDelete] = useState<FieldJobDto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "Installation",
    priority: "Normal",
    customerId: "",
    customerName: "",
    contactPerson: "",
    contactPhone: "",
    serviceAddress: "",
    city: "İstanbul",
    district: "Kadıköy",
    assignedTechnicianId: "",
    assignedTechnicianName: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    tasks: [
      { title: "Sistem ön kontrolü ve fiziki inceleme" },
      { title: "Montaj veya tamir işlemlerinin gerçekleştirilmesi" },
      { title: "Fonksiyonel test ve müşteri kabul onayı" }
    ]
  });

  // Mobile Technician Signature & Check-in
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getFieldJobs(
        {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: searchQuery || undefined
        },
        tenantSlug
      );
      const jobsList = Array.isArray(res.data) ? res.data : (Array.isArray(res as unknown) ? (res as unknown as FieldJobDto[]) : []);
      setJobs(jobsList);
      if (selectedJob) {
        const updated = jobsList.find((j) => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      }
    } catch {
      toast.error("Saha işleri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, statusFilter, searchQuery, selectedJob]);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    async function loadMeta() {
      if (!activeTenant?.id) return;
      try {
        const [custRes, teamRes] = await Promise.all([
          ApiClient.getCustomers(activeTenant.id, { page: 1, pageSize: 50 }),
          ApiClient.getTenantUsers(activeTenant.id)
        ]);
        if (custRes.success && custRes.data) setCustomers(custRes.data.items || []);
        if (teamRes.success && teamRes.data) setTeamUsers(teamRes.data);
      } catch {
        // silent
      }
    }
    loadMeta();
  }, [activeTenant?.id]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.serviceAddress) {
      toast.error("Lütfen başlık ve servis adresini giriniz");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateFieldJobPayload = {
        title: formData.title,
        description: formData.description || undefined,
        serviceType: formData.serviceType,
        priority: formData.priority,
        customerId: formData.customerId || undefined,
        customerName: formData.customerName || undefined,
        contactPerson: formData.contactPerson || undefined,
        contactPhone: formData.contactPhone || undefined,
        serviceAddress: formData.serviceAddress,
        city: formData.city || undefined,
        district: formData.district || undefined,
        assignedTechnicianId: formData.assignedTechnicianId || undefined,
        assignedTechnicianName: formData.assignedTechnicianName || undefined,
        scheduledDate: formData.scheduledDate,
        tasks: formData.tasks.filter((t) => t.title.trim().length > 0)
      };

      const res = await ApiClient.createFieldJob(payload, tenantSlug);
      const jobData = res.data || (res as unknown as FieldJobDto);
      if (jobData?.jobNumber || res.success) {
        toast.success(`Servis Emri #${jobData?.jobNumber || ""} başarıyla oluşturuldu`);
        setIsCreateOpen(false);
        fetchJobs();
      } else {
        toast.error(res.message || "İş emri oluşturulamadı");
      }
    } catch {
      toast.error("İşlem sırasında bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (job: FieldJobDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    setIsDeletingJob(true);
    try {
      const res = await ApiClient.deleteFieldJob(jobToDelete.id, tenantSlug);
      if (res.success || (res as unknown as boolean) === true) {
        toast.success("İş emri başarıyla silindi");
        if (selectedJob?.id === jobToDelete.id) {
          setSelectedJob(null);
        }
        setIsDeleteDialogOpen(false);
        setJobToDelete(null);
        fetchJobs();
      } else {
        toast.error(res.message || "İş emri silinemedi");
      }
    } catch {
      toast.error("İşlem sırasında bir hata oluştu");
    } finally {
      setIsDeletingJob(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedJob) return;
    try {
      const res = await ApiClient.toggleFieldJobTask(selectedJob.id, taskId, tenantSlug);
      if (res.success && res.data) {
        const isCompleted = res.data.isCompleted;
        setSelectedJob((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, isCompleted } : t))
          };
        });
        toast.success(isCompleted ? "Görev tamamlandı" : "Görev geri alındı");
      }
    } catch {
      toast.error("Görev güncellenirken hata oluştu");
    }
  };

  const handleCheckinGPS = async (type: "Arrival" | "Departure") => {
    if (!selectedJob) return;
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum servisini desteklemiyor");
      return;
    }
    toast.info("GPS koordinatı alınıyor...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await ApiClient.checkinFieldJob(
            selectedJob.id,
            {
              technicianId: profile?.id || activeTenant?.id || "00000000-0000-0000-0000-000000000000",
              checkinType: type,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              deviceInfo: navigator.userAgent.slice(0, 100)
            },
            tenantSlug
          );
          if (res.success) {
            toast.success(type === "Arrival" ? "Saha varış check-in kaydedildi" : "Ayrılış check-in kaydedildi");
            fetchJobs();
          }
        } catch {
          toast.error("Check-in kaydedilemedi");
        }
      },
      () => {
        toast.error("Konum erişimi reddedildi veya bulunamadı");
      }
    );
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? (e.touches[0]?.clientX ?? 0) - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? (e.touches[0]?.clientY ?? 0) - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#09090b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCompleteWithSign = async () => {
    if (!selectedJob) return;
    if (!signerName.trim()) {
      toast.error("Lütfen imzayı atan yetkili adını yazınız");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL("image/png");
    setCompleting(true);
    try {
      const res = await ApiClient.completeFieldJob(
        selectedJob.id,
        {
          resolutionNotes: resolutionNotes || "İşlem tamamlandı, sistem çalışır vaziyette teslim edildi.",
          customerSignatureData: sigData,
          customerSignedName: signerName.trim()
        },
        tenantSlug
      );
      if (res.success) {
        toast.success("Servis görevi başarıyla tamamlandı ve imzalandı!");
        setIsSignModalOpen(false);
        fetchJobs();
      } else {
        toast.error(res.message || "İş tamamlanırken hata oluştu");
      }
    } catch {
      toast.error("İşlem sırasında bir hata meydana geldi");
    } finally {
      setCompleting(false);
    }
  };

  const totalCount = jobs.length;
  const inProgressCount = jobs.filter((j) => j.status === "InProgress").length;
  const completedCount = jobs.filter((j) => j.status === "Completed").length;
  const scheduledCount = jobs.filter((j) => j.status === "Scheduled").length;

  return (
    <PageContainer className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Wrench className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Saha Servis & Mobil Teknisyen Yönetimi
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Saha ekiplerine iş emri atayın, rota ve GPS check-in&apos;lerini takip edin, yerinde dijital teslim imzasını alın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Yeni İş Emri Oluştur
          </Button>
        </div>
      </div>

      {/* KPI Bento Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Toplam Servis Kartı</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-zinc-900 dark:text-zinc-50">{totalCount}</span>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-2xs">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Planlanan / Randevulu</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-blue-950 dark:text-blue-200">{scheduledCount}</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Sahada Devam Eden</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-amber-950 dark:text-amber-200">{inProgressCount}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Tamamlandı & İmzalandı</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-emerald-950 dark:text-emerald-200">{completedCount}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Split Workbench (Job List + Detail Drawer / Field Tech Mobile View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="İş no, başlık, müşteri veya adres ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="w-44">
              <SelectField
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { label: "Tüm Durumlar", value: "all" },
                  { label: "Planlandı", value: "Scheduled" },
                  { label: "Devam Ediyor", value: "InProgress" },
                  { label: "Tamamlandı", value: "Completed" },
                  { label: "Taslak", value: "Draft" },
                ]}
                placeholder="Durum Filtresi"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-violet-500" />
              Saha servis görevleri listeleniyor...
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <Wrench className="h-8 w-8 mx-auto mb-3 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Kayıtlı Saha Servis Emri Yok</p>
              <p className="text-xs text-zinc-500 mt-1">Saha teknisyenleri için ilk servis görevini oluşturun.</p>
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                İş Emri Aç
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const completedTasks = job.tasks.filter((t) => t.isCompleted).length;
                const totalTasks = job.tasks.length;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-violet-500 bg-violet-50/30 dark:bg-violet-950/20 shadow-xs"
                        : "border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-400">
                            {job.jobNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === "Completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : job.status === "InProgress"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {job.status === "Completed"
                              ? "Tamamlandı"
                              : job.status === "InProgress"
                              ? "Sahada İşlemde"
                              : "Planlandı"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {job.serviceType}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {job.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {job.customerName || "Bireysel Müşteri"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-zinc-400" />
                            {job.city ? `${job.district || ""}, ${job.city}` : job.serviceAddress}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-end gap-1">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          {job.assignedTechnicianName || "Atama Bekliyor"}
                        </div>
                        {job.scheduledDate && (
                          <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center justify-end gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(job.scheduledDate).toLocaleDateString("tr-TR")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          Kontrol Listesi: {completedTasks} / {totalTasks}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handlePromptDelete(job, e)}
                          className="p-1 rounded-md text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                          title="İş Emrini Sil"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          {selectedJob ? (
            <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-sm space-y-6 sticky top-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                      {selectedJob.jobNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedJob.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : selectedJob.status === "InProgress"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {selectedJob.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                    {selectedJob.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handlePromptDelete(selectedJob, e)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                    title="İş Emrini Sil"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    title="Kapat"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 space-y-2 text-xs">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-violet-500" />
                  {selectedJob.customerName || "Müşteri Bilgisi Yok"}
                </div>
                <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-300">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span>{selectedJob.serviceAddress}</span>
                </div>
                {selectedJob.contactPhone && (
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" />
                    <a href={`tel:${selectedJob.contactPhone}`} className="text-violet-600 hover:underline">
                      {selectedJob.contactPhone}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Saha Teknisyen Aksiyonları
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCheckinGPS("Arrival")}
                    className="h-9 gap-1.5 text-xs text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <Navigation className="h-3.5 w-3.5 text-blue-500" />
                    Varış Check-In
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCheckinGPS("Departure")}
                    className="h-9 gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    Ayrılış Check-In
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Saha Kontrol Adımları
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {selectedJob.tasks.filter((t) => t.isCompleted).length}/{selectedJob.tasks.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {selectedJob.tasks.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Tanımlı görev adımı yok.</p>
                  ) : (
                    selectedJob.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer text-xs transition-all ${
                          task.isCompleted
                            ? "border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 line-through"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="flex-1">{task.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedJob.status === "Completed" ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Yerinde Teslim Edildi ve İmzalandı
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    İmzalayan: <strong>{selectedJob.customerSignedName || "Müşteri"}</strong>
                  </div>
                  {selectedJob.customerSignatureData && (
                    <div className="mt-2 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <img
                        src={selectedJob.customerSignatureData}
                        alt="Müşteri İmzası"
                        className="h-14 object-contain mx-auto"
                      />
                    </div>
                  )}
                  {selectedJob.resolutionNotes && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                      &quot;{selectedJob.resolutionNotes}&quot;
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <Button
                    onClick={() => setIsSignModalOpen(true)}
                    className="w-full h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    <PenTool className="h-4 w-4" />
                    Görevi Bitir ve Müşteri İmzası Al
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 sticky top-6">
              <Truck className="h-8 w-8 mx-auto mb-3 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Servis Emri Seçiniz</p>
              <p className="text-xs text-zinc-500 mt-1">
                Detayları, kontrol listesini ve yerinde imza modülünü görüntülemek için soldan bir kart seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 1. Modal: Yeni İş Emri Oluşturma */}
      {isCreateOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-violet-600" />
                Yeni Saha Servis Emri Aç
              </DialogTitle>
              <DialogClose asChild>
                <button type="button" className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Servis Başlığı / İş Tanımı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn: Fiber Optik Switch Montajı veya Arıza Tespiti"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Servis Tipi</label>
                  <SelectField
                    value={formData.serviceType}
                    onChange={(val) => setFormData({ ...formData, serviceType: val })}
                    options={[
                      { label: "Montaj & Kurulum", value: "Installation" },
                      { label: "Periyodik Bakım", value: "Maintenance" },
                      { label: "Arıza Onarım", value: "Repair" },
                      { label: "Keşif / Ekspertiz", value: "Survey" },
                      { label: "Acil Müdahale", value: "Emergency" },
                    ]}
                    placeholder="Servis Tipi Seçin"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Öncelik</label>
                  <SelectField
                    value={formData.priority}
                    onChange={(val) => setFormData({ ...formData, priority: val })}
                    options={[
                      { label: "Düşük", value: "Low" },
                      { label: "Normal", value: "Normal" },
                      { label: "Yüksek", value: "High" },
                      { label: "Acil", value: "Urgent" },
                    ]}
                    placeholder="Öncelik Seçin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Müşteri</label>
                  <SelectField
                    value={formData.customerId}
                    onChange={(val) => {
                      const c = customers.find((cust) => cust.id === val);
                      setFormData({
                        ...formData,
                        customerId: val,
                        customerName: c?.name || "",
                      });
                    }}
                    options={[
                      { label: "Müşteri Seçin (Opsiyonel)", value: "" },
                      ...customers.map((c) => ({
                        label: c.name,
                        value: c.id,
                      })),
                    ]}
                    placeholder="Müşteri Seçin (Opsiyonel)"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Atanan Teknisyen
                  </label>
                  <SelectField
                    value={formData.assignedTechnicianId}
                    onChange={(val) => {
                      const u = teamUsers.find((usr) => usr.id === val);
                      setFormData({
                        ...formData,
                        assignedTechnicianId: val,
                        assignedTechnicianName: u?.fullName || u?.email || "",
                      });
                    }}
                    options={[
                      { label: "Teknisyen Ata", value: "" },
                      ...teamUsers.map((u) => ({
                        label: u.fullName || u.email,
                        value: u.id,
                      })),
                    ]}
                    placeholder="Teknisyen Ata"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Müdahale Adresi *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Açık adres veya tesis konumu..."
                  value={formData.serviceAddress}
                  onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">İletişim Kişisi</label>
                  <input
                    type="text"
                    placeholder="Ad Soyad"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Telefon</label>
                  <input
                    type="text"
                    placeholder="05XX XXX XX XX"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Servis Emrini Aç"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 2. Modal: Yerinde Dijital Müşteri İmzası (Canvas E-Sign) */}
      {isSignModalOpen && selectedJob && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsSignModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-5 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <PenTool className="h-4 w-4 text-emerald-600" />
                  Müşteri Teslim & Kabul İmzası
                </DialogTitle>
                <p className="text-[11px] text-zinc-500">
                  {selectedJob.jobNumber} • {selectedJob.title}
                </p>
              </div>
              <DialogClose asChild>
                <button type="button" className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Teslim Alan Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn: Ahmet Yılmaz"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sonuç & İşlem Notu
                </label>
                <textarea
                  rows={2}
                  placeholder="İşlem tamamlandı, cihaz devreye alındı..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
              </div>

              {/* Digital Signature Pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Ekrana İmza Atın (Parmak veya Fare)
                  </span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Temizle
                  </button>
                </div>

                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={160}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSignModalOpen(false)}>
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={completing}
                  onClick={handleCompleteWithSign}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Onayla ve Tamamla"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 3. Modal: İş Emri Silme Onay Penceresi */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="İş Emrini Sil"
        description={`"${jobToDelete?.jobNumber || ""} - ${jobToDelete?.title || ""}" numaralı saha servis iş emrini silmek istediğinize emin misiniz? Bu işlem geri alınamaz; ilişkili tüm kontrol adımları, parça listeleri ve teknisyen GPS kayıtları da kalıcı olarak silinecektir.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="destructive"
        loading={isDeletingJob}
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}
