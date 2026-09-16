"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Palmtree,
  Plus,
  Search,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ComplianceInlineCard } from "@/components/compliance-inline-card";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CreateLeaveRequestPayload,
  type DepartmentDto,
  type EmployeeDto,
  type LeaveBalanceDto,
  type LeaveCalendarEventDto,
  type LeaveRequestDto,
  type LeaveStatsDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const ALLOWED_HALF_DAY_TYPES = ["Casual", "Sick"] as const;

export default function LeavesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [activeTab, setActiveTab] = useState<
    "calendar" | "pending" | "all" | "my"
  >("calendar");
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<LeaveStatsDto | null>(null);
  const [myBalance, setMyBalance] = useState<LeaveBalanceDto | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequestDto[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<LeaveCalendarEventDto[]>(
    []
  );
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);

  // Calendar Date State (Year & Month)
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  // Filters
  const [calendarDeptFilter, setCalendarDeptFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequestDto | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    setLoading(true);
    try {
      const [statsRes, balRes, leavesRes, calRes, empRes, deptRes] =
        await Promise.all([
          ApiClient.getLeaveStats(activeTenant.id),
          ApiClient.getMyLeaveBalance(
            { year: calendarDate.year },
            activeTenant.id
          ),
          ApiClient.getLeaveRequests(
            {
              leaveType: leaveTypeFilter || undefined,
              pageSize: 100,
              search: search.trim() || undefined,
              status: statusFilter || undefined,
            },
            activeTenant.id
          ),
          ApiClient.getLeaveCalendar(
            {
              departmentId: calendarDeptFilter || undefined,
              month: calendarDate.month,
              year: calendarDate.year,
            },
            activeTenant.id
          ),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
          ApiClient.getDepartments(activeTenant.id),
        ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (balRes.success && balRes.data) {
        setMyBalance(balRes.data);
      }
      if (leavesRes.success && leavesRes.data) {
        setLeaves(leavesRes.data.items);
      }
      if (calRes.success && calRes.data) {
        setCalendarEvents(calRes.data);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
      }
    } catch {
      toast.error("İzin verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    calendarDate,
    calendarDeptFilter,
    search,
    statusFilter,
    leaveTypeFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleApprove = async (id: string) => {
    if (!activeTenant) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await ApiClient.approveLeaveRequest(id, activeTenant.id);
      if (res.success) {
        toast.success("İzin talebi onaylandı.");
        loadData();
      } else {
        toast.error(res.message || "İşlem başarısız.");
      }
    } catch {
      toast.error("Onaylama sırasında bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!(activeTenant && rejectingLeave && rejectionReason.trim())) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await ApiClient.rejectLeaveRequest(
        rejectingLeave.id,
        { rejectionReason: rejectionReason.trim() },
        activeTenant.id
      );
      if (res.success) {
        toast.success("İzin talebi reddedildi.");
        setRejectingLeave(null);
        setRejectionReason("");
        loadData();
      } else {
        toast.error(res.message || "İşlem başarısız.");
      }
    } catch {
      toast.error("Reddetme sırasında bir hata oluştu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = (id: string) => {
    if (!activeTenant) {
      return;
    }
    setConfirmDialog({
      confirmText: "Talebi İptal Et",
      description:
        "Bu izin talebini iptal etmek istediğinize emin misiniz? İptal edilen izin bakiyenize iade edilir.",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await ApiClient.cancelLeaveRequest(id, activeTenant.id);
          if (res.success) {
            toast.success("İzin talebiniz iptal edildi.");
            loadData();
          } else {
            toast.error(res.message || "İptal edilemedi.");
          }
        } catch {
          toast.error("İptal işlemi sırasında hata oluştu.");
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
      open: true,
      title: "İzin Talebini İptal Et",
      variant: "destructive",
    });
  };

  // Helper labels & styles
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "Annual":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Casual":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Sick":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Unpaid":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
      case "Marriage":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Maternity":
      case "Paternity":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Bereavement":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "Annual":
        return "Yıllık İzin";
      case "Casual":
        return "Mazeret İzni";
      case "Sick":
        return "Hastalık / Rapor";
      case "Unpaid":
        return "Ücretsiz İzin";
      case "Marriage":
        return "Evlilik İzni";
      case "Maternity":
        return "Doğum İzni";
      case "Paternity":
        return "Babalık İzni";
      case "Bereavement":
        return "Vefat İzni";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Cancelled":
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
      default:
        return "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Pending":
        return "Onay Bekliyor";
      case "Approved":
        return "Onaylandı";
      case "Rejected":
        return "Reddedildi";
      case "Cancelled":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const handlePrevMonth = () => {
    setCalendarDate((prev) => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    setCalendarDate({ month: d.getMonth() + 1, year: d.getFullYear() });
  };

  // Build Calendar Days Matrix
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysCount = lastDay.getDate();

    // Monday as first day of week (0: Mon, ..., 6: Sun)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) {
      startDayOfWeek = 6;
    }

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dateStr: "", day: null });
    }
    for (let d = 1; d <= daysCount; d++) {
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      days.push({
        dateStr: `${year}-${monthStr}-${dayStr}`,
        day: d,
      });
    }
    return days;
  };

  const calendarDays = getDaysInMonth(calendarDate.year, calendarDate.month);
  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
              İzin & Zaman Yönetimi
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-[11px] text-blue-700">
              {stats?.totalApprovedRequests ?? 0} Onaylı İzin
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Çalışan izin talepleri, onay süreçleri, yıllık izin bakiye takibi ve
            interaktif şirket izin takvimi.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <PermissionGate permission="Leaves.Create">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni İzin Talebi</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Requests */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Onay Bekleyen Talepler
              </span>
              <div className="mt-1 font-extrabold text-2xl text-amber-600 tracking-tight sm:text-3xl">
                {stats?.pendingRequestsCount ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Yönetici onayı bekleyen izinler</span>
          </div>
        </div>

        {/* Today on Leave */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Bugün İzinli Olanlar
              </span>
              <div className="mt-1 font-extrabold text-2xl text-blue-600 tracking-tight sm:text-3xl">
                {stats?.todayOnLeaveCount ?? 0} Kişi
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Sun className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Bugün aktif izin kullanan personel</span>
          </div>
        </div>

        {/* This Month Used Days */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Bu Ay Kullanılan İzin
              </span>
              <div className="mt-1 font-extrabold text-2xl text-purple-600 tracking-tight sm:text-3xl">
                {stats?.thisMonthUsedDays ?? 0} Gün
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Bu ay içinde onaylanan toplam iş günü</span>
          </div>
        </div>

        {/* Annual Leave Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Yıllık İzin Bakiyem
              </span>
              <div className="mt-1 font-extrabold text-2xl text-emerald-600 tracking-tight sm:text-3xl">
                {myBalance?.remainingDays ?? 14} Gün
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Palmtree className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>Kullanılan: {myBalance?.usedDays ?? 0} Gün</span>
            <span>Hakediş: {myBalance?.totalDays ?? 14} Gün</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800/90">
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
            activeTab === "calendar"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("calendar")}
          type="button"
        >
          <CalendarIcon className="h-4 w-4" />
          <span>İnteraktif İzin Takvimi</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
            activeTab === "pending"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("pending")}
          type="button"
        >
          <Clock className="h-4 w-4" />
          <span>Onay Masası ({pendingLeaves.length})</span>
          {pendingLeaves.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 font-bold text-[9px] text-white">
              {pendingLeaves.length}
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
            activeTab === "all"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("all")}
          type="button"
        >
          <Users className="h-4 w-4" />
          <span>Tüm İzin Kayıtları</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
            activeTab === "my"
              ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("my")}
          type="button"
        >
          <User className="h-4 w-4" />
          <span>Kendi İzinlerim</span>
        </button>
      </div>

      {/* 4. TAB 1: INTERACTIVE MONTHLY CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          {/* Calendar Header / Controls */}
          <div className="flex flex-col justify-between gap-3 border-zinc-100 border-b pb-4 sm:flex-row sm:items-center dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                onClick={handlePrevMonth}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="min-w-[150px] text-center font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                {monthNames[calendarDate.month - 1]} {calendarDate.year}
              </h2>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                onClick={handleNextMonth}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                className="ml-2 rounded-xl border border-zinc-200 px-3 py-1.5 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                onClick={handleCurrentMonth}
                type="button"
              >
                Bu Ay
              </button>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Departman:
              </span>
              <Combobox
                aria-label="Departman filtresi"
                onChange={setCalendarDeptFilter}
                options={[
                  { label: "Tüm Departmanlar", value: "" },
                  ...departments.map((d) => ({ label: d.name, value: d.id })),
                ]}
                placeholder="Tüm Departmanlar"
                triggerClassName="h-8 px-3 font-medium"
                value={calendarDeptFilter}
              />
            </div>
          </div>

          {/* Calendar Days Matrix */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Names Header */}
              <div className="mb-2 grid grid-cols-7 gap-2 text-center font-bold text-[11px] text-zinc-500 dark:text-zinc-400">
                <div className="rounded-lg bg-zinc-50 py-1 dark:bg-zinc-800/50">
                  Pazartesi
                </div>
                <div className="rounded-lg bg-zinc-50 py-1 dark:bg-zinc-800/50">
                  Salı
                </div>
                <div className="rounded-lg bg-zinc-50 py-1 dark:bg-zinc-800/50">
                  Çarşamba
                </div>
                <div className="rounded-lg bg-zinc-50 py-1 dark:bg-zinc-800/50">
                  Perşembe
                </div>
                <div className="rounded-lg bg-zinc-50 py-1 dark:bg-zinc-800/50">
                  Cuma
                </div>
                <div className="rounded-lg bg-amber-50/60 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Cumartesi
                </div>
                <div className="rounded-lg bg-amber-50/60 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Pazar
                </div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day) {
                    return (
                      <div
                        className="h-28 rounded-2xl border border-zinc-200/80 border-dashed bg-zinc-50/50 p-2 dark:border-zinc-800 dark:bg-zinc-900/30"
                        key={idx}
                      />
                    );
                  }

                  // Find leaves active on this day
                  const activeLeaves = calendarEvents.filter(
                    (ev) =>
                      ev.startDate <= cell.dateStr && ev.endDate >= cell.dateStr
                  );

                  const isToday =
                    new Date().toISOString().slice(0, 10) === cell.dateStr;

                  return (
                    <div
                      className={`flex h-28 flex-col justify-between rounded-2xl border p-2 transition-all hover:border-zinc-300 dark:border-zinc-700 ${
                        isToday
                          ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                          : "border-zinc-200/80 bg-white dark:border-zinc-800/90 dark:bg-zinc-900"
                      }`}
                      key={idx}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {cell.day}
                        </span>
                        {activeLeaves.length > 0 && (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.2 font-bold text-[9px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {activeLeaves.length} İzinli
                          </span>
                        )}
                      </div>

                      {/* Leaves pills inside day */}
                      <div className="mt-1 max-h-16 space-y-1 overflow-y-auto text-[10px]">
                        {activeLeaves.map((ev) => (
                          <div
                            className={`truncate rounded-lg border px-1.5 py-0.5 font-semibold ${
                              ev.status === "Approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                            key={ev.id}
                            title={`${ev.employeeName} - ${getLeaveTypeLabel(ev.leaveType)} (${ev.totalDays} Gün)`}
                          >
                            <span>{ev.employeeName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: PENDING APPROVALS (MANAGER WORKBENCH) */}
      {activeTab === "pending" && (
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Yönetici Onay Masası
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Onay veya ret işlemi bekleyen personel izin talepleri
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-bold text-amber-700 text-xs">
              {pendingLeaves.length} Bekleyen Talep
            </span>
          </div>

          {pendingLeaves.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 border-dashed p-12 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">
                Tüm talepler sonuçlandırıldı!
              </p>
              <p className="mt-0.5 text-zinc-400 dark:text-zinc-500">
                Şu anda onay bekleyen yeni izin talebi bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-800/30"
                  key={leave.id}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {leave.employeeName}
                      </span>
                      {leave.departmentName && (
                        <span className="rounded-md bg-zinc-200 px-2 py-0.5 font-medium text-[10px] text-zinc-700 dark:text-zinc-300">
                          {leave.departmentName}
                        </span>
                      )}
                      <span
                        className={`rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getLeaveTypeBadge(leave.leaveType)}`}
                      >
                        {getLeaveTypeLabel(leave.leaveType)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                        <strong>
                          {new Date(leave.startDate).toLocaleDateString(
                            "tr-TR"
                          )}
                        </strong>{" "}
                        -{" "}
                        <strong>
                          {new Date(leave.endDate).toLocaleDateString("tr-TR")}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Süre: <strong>{leave.totalDays} Gün</strong>{" "}
                        {leave.isHalfDay
                          ? `(Yarım Gün - ${leave.halfDayPeriod || "Öğleden Sonra"})`
                          : ""}
                      </span>
                    </div>

                    {leave.reason && (
                      <p className="mt-1 max-w-xl rounded-xl border border-zinc-200/80 bg-white p-2 text-xs text-zinc-700 italic dark:border-zinc-800/90 dark:bg-zinc-900 dark:text-zinc-300">
                        "{leave.reason}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <PermissionGate permission="Leaves.Approve">
                      <button
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 font-semibold text-rose-700 text-xs hover:bg-rose-100 disabled:opacity-50"
                        disabled={actionLoading}
                        onClick={() => {
                          setRejectingLeave(leave);
                          setRejectionReason("");
                        }}
                        type="button"
                      >
                        Reddet
                      </button>
                      <button
                        className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                        disabled={actionLoading}
                        onClick={() => handleApprove(leave.id)}
                        type="button"
                      >
                        Onayla
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: ALL LEAVE REQUESTS TABLE */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs md:flex-row md:items-center dark:border-zinc-800/90 dark:bg-zinc-900">
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <input
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100 dark:text-zinc-500"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Çalışan adı, departman veya sebep ara..."
                type="text"
                value={search}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectField
                aria-label="Durum filtresi"
                onChange={setStatusFilter}
                options={[
                  { label: "Onay Bekliyor", value: "Pending" },
                  { label: "Onaylandı", value: "Approved" },
                  { label: "Reddedildi", value: "Rejected" },
                  { label: "İptal Edildi", value: "Cancelled" },
                ]}
                placeholder="Tüm Durumlar"
                triggerClassName="h-8 px-3 font-medium"
                value={statusFilter}
              />

              <SelectField
                aria-label="İzin türü filtresi"
                onChange={setLeaveTypeFilter}
                options={[
                  { label: "Yıllık İzin", value: "Annual" },
                  { label: "Mazeret İzni", value: "Casual" },
                  { label: "Hastalık / Rapor", value: "Sick" },
                  { label: "Ücretsiz İzin", value: "Unpaid" },
                  { label: "Evlilik İzni", value: "Marriage" },
                ]}
                placeholder="Tüm İzin Türleri"
                triggerClassName="h-8 px-3 font-medium"
                value={leaveTypeFilter}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-zinc-100 border-b bg-zinc-50/50 font-medium text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400">
                  <tr>
                    <th className="py-3.5 pr-4 pl-6">Çalışan</th>
                    <th className="px-4 py-3.5">İzin Türü</th>
                    <th className="px-4 py-3.5">Tarih Aralığı</th>
                    <th className="px-4 py-3.5 text-center">Toplam Gün</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Onaylayan</th>
                    <th className="py-3.5 pr-6 pl-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {leaves.length === 0 ? (
                    <tr>
                      <td
                        className="py-8 text-center text-zinc-400 dark:text-zinc-500"
                        colSpan={7}
                      >
                        İzin kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                        key={l.id}
                      >
                        <td className="py-3.5 pr-4 pl-6">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {l.employeeName}
                          </div>
                          {l.departmentName && (
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {l.departmentName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getLeaveTypeBadge(l.leaveType)}`}
                          >
                            {getLeaveTypeLabel(l.leaveType)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {new Date(l.startDate).toLocaleDateString("tr-TR")}{" "}
                            - {new Date(l.endDate).toLocaleDateString("tr-TR")}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {l.totalDays} Gün
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(l.status)}`}
                          >
                            {getStatusLabel(l.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                          {l.approvedByUserName || "—"}
                        </td>
                        <td className="py-3.5 pr-6 pl-4 text-right">
                          {l.status === "Pending" && (
                            <PermissionGate permission="Leaves.Approve">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-[11px] text-emerald-700 hover:bg-emerald-100"
                                  onClick={() => handleApprove(l.id)}
                                  type="button"
                                >
                                  Onayla
                                </button>
                                <button
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-[11px] text-rose-700 hover:bg-rose-100"
                                  onClick={() => {
                                    setRejectingLeave(l);
                                    setRejectionReason("");
                                  }}
                                  type="button"
                                >
                                  Reddet
                                </button>
                              </div>
                            </PermissionGate>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 4: MY LEAVE REQUESTS */}
      {activeTab === "my" && (
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Kendi İzin Taleplerim
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Oluşturduğunuz izin talepleri ve onay durumları
              </p>
            </div>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni Talep Oluştur</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-200 border-b bg-zinc-50 font-medium text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">İzin Türü</th>
                  <th className="px-4 py-3">Tarih Aralığı</th>
                  <th className="px-4 py-3 text-center">Toplam Gün</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Sebep / Gerekçe</th>
                  <th className="py-3 pr-4 pl-3 text-right">İptal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td
                      className="py-6 text-center text-zinc-400 dark:text-zinc-500"
                      colSpan={6}
                    >
                      Henüz bir izin talebiniz bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      key={l.id}
                    >
                      <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] ${getLeaveTypeBadge(l.leaveType)}`}
                        >
                          {getLeaveTypeLabel(l.leaveType)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                        {new Date(l.startDate).toLocaleDateString("tr-TR")} -{" "}
                        {new Date(l.endDate).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-zinc-900 dark:text-zinc-100">
                        {l.totalDays} Gün
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(l.status)}`}
                        >
                          {getStatusLabel(l.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 italic dark:text-zinc-400">
                        {l.reason || "—"}
                        {l.rejectionReason && (
                          <div className="mt-0.5 font-bold text-[10px] text-rose-600 not-italic">
                            Ret Nedeni: {l.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 pl-3 text-right">
                        {l.status === "Pending" && (
                          <button
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-[11px] text-rose-700 hover:bg-rose-100"
                            onClick={() => handleCancel(l.id)}
                            type="button"
                          >
                            İptal Et
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. CREATE LEAVE REQUEST MODAL */}
      {isCreateModalOpen && (
        <CreateLeaveModal
          departments={departments}
          employees={employees}
          isOpen={isCreateModalOpen}
          myBalance={myBalance}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            toast.success("İzin talebi başarıyla oluşturuldu.");
            setIsCreateModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* 9. REJECT MODAL */}
      {rejectingLeave && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setRejectingLeave(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
            showCloseButton={false}
          >
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              İzin Talebini Reddet
            </DialogTitle>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {rejectingLeave.employeeName}
              </strong>{" "}
              personelinin {rejectingLeave.totalDays} günlük izin talebini
              reddetmek üzeresiniz. Lütfen bir ret gerekçesi belirtin.
            </p>

            <div className="mt-4">
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Ret Gerekçesi *
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Örn: İlgili tarihte proje lansmanı olması sebebiyle..."
                rows={3}
                value={rejectionReason}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                onClick={() => setRejectingLeave(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleReject}
                type="submit"
              >
                {actionLoading ? "İşleniyor..." : "Talebi Reddet"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        cancelText={confirmDialog.cancelText}
        confirmText={confirmDialog.confirmText}
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

function CreateLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  employees,
  departments,
  myBalance,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  employees: EmployeeDto[];
  departments: DepartmentDto[];
  myBalance: LeaveBalanceDto | null;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [employeeName, setEmployeeName] = useState(
    employees[0]?.fullName ||
      `${employees[0]?.firstName ?? ""} ${employees[0]?.lastName ?? ""}`.trim()
  );
  const [departmentId, setDepartmentId] = useState(
    employees[0]?.departmentId || ""
  );
  const [departmentName, setDepartmentName] = useState(
    employees[0]?.departmentName || ""
  );
  const [leaveType, setLeaveType] = useState("Annual");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState("Afternoon");
  const [reason, setReason] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHalfDayAllowed = (
    ALLOWED_HALF_DAY_TYPES as readonly string[]
  ).includes(leaveType);

  const handleLeaveTypeChange = (value: string) => {
    setLeaveType(value);
    if (!(ALLOWED_HALF_DAY_TYPES as readonly string[]).includes(value)) {
      setIsHalfDay(false);
      setHalfDayPeriod("Afternoon");
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const found = employees.find((e) => e.id === id);
    if (found) {
      setEmployeeName(
        found.fullName || `${found.firstName} ${found.lastName}`.trim()
      );
      setDepartmentId(found.departmentId || "");
      setDepartmentName(found.departmentName || "");
    }
  };

  // Calculate business days — half-day only valid for Casual/Sick
  const calculateDays = () => {
    if (isHalfDayAllowed && isHalfDay) {
      return 0.5;
    }
    if (!(startDate && endDate)) {
      return 1;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return 0;
    }

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const calculatedDays = calculateDays();

  const [leaveOverride, setLeaveOverride] = useState({
    allowed: false,
    reason: "",
  });

  const leaveCompliance = useMemo(() => {
    const violations: any[] = [];
    const hasHardBlock = false;

    if (leaveType === "Marriage" && calculatedDays > 3) {
      violations.push({
        details: `4857 Sayılı İş Kanunu Ek Madde 2 uyarınca yasal evlilik izni süresi 3 gündür (Talep: ${calculatedDays} gün). Aşan süreler yıllık izinden düşülebilir.`,
        enforcementLevel: "SoftWarning",
        lawReference: "4857 SK. Ek Md. 2",
        penaltyRisk: "Yasal sınır kontrolü",
        ruleName: "Yasal Evlilik İzni Süresi (3 Gün)",
      });
    }

    if (leaveType === "Paternity" && calculatedDays > 5) {
      violations.push({
        details: `4857 Sayılı İş Kanunu Ek Madde 2 uyarınca babalık izni süresi 5 gündür (Talep: ${calculatedDays} gün).`,
        enforcementLevel: "SoftWarning",
        lawReference: "4857 SK. Ek Md. 2",
        penaltyRisk: "Yasal sınır kontrolü",
        ruleName: "Yasal Babalık İzni Süresi (5 Gün)",
      });
    }

    if (leaveType === "Bereavement" && calculatedDays > 3) {
      violations.push({
        details: `4857 Sayılı İş Kanunu Ek Madde 2 uyarınca vefat/ölüm izni süresi 3 gündür (Talep: ${calculatedDays} gün).`,
        enforcementLevel: "SoftWarning",
        lawReference: "4857 SK. Ek Md. 2",
        penaltyRisk: "Yasal sınır kontrolü",
        ruleName: "Yasal Vefat İzni Süresi (3 Gün)",
      });
    }

    return {
      validationResult: {
        hasHardBlock,
        isCompliant: violations.length === 0,
        violations,
      },
    };
  }, [leaveType, calculatedDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError("Lütfen bir çalışan seçin.");
      return;
    }
    if (!(startDate && endDate)) {
      setError("Lütfen başlangıç ve bitiş tarihlerini girin.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const effectiveIsHalfDay = isHalfDayAllowed && isHalfDay;
      const payload: CreateLeaveRequestPayload = {
        departmentId: departmentId || undefined,
        departmentName: departmentName || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        employeeId,
        employeeName,
        endDate: effectiveIsHalfDay ? startDate : endDate,
        halfDayPeriod: effectiveIsHalfDay ? halfDayPeriod : undefined,
        isHalfDay: effectiveIsHalfDay,
        leaveType,
        reason: reason.trim() || undefined,
        startDate,
      };

      const res = await ApiClient.createLeaveRequest(payload, tenantId);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || "İzin talebi oluşturulamadı.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
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
        className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 text-xs sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-zinc-100 border-b p-5 dark:border-zinc-800">
          <div>
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni İzin Talebi Oluştur
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              İzin türünü, gün aralığını ve gerekçenizi girin
            </p>
          </div>
          <DialogClose asChild>
            <button
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 font-medium text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Employee Picker */}
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Personel / Çalışan *
            </label>
            <Select onValueChange={handleEmployeeChange} value={employeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Personel Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName || `${e.firstName} ${e.lastName}`}{" "}
                    {e.departmentName ? `(${e.departmentName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Type & Balance Alert */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                İzin Türü *
              </label>
              <Select onValueChange={handleLeaveTypeChange} value={leaveType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">
                    Yıllık İzin (Bakiyeden Düşer)
                  </SelectItem>
                  <SelectItem value="Casual">Mazeret İzni</SelectItem>
                  <SelectItem value="Sick">Hastalık / Sağlık Raporu</SelectItem>
                  <SelectItem value="Unpaid">Ücretsiz İzin</SelectItem>
                  <SelectItem value="Marriage">Evlilik İzni (3 Gün)</SelectItem>
                  <SelectItem value="Maternity">Doğum İzni</SelectItem>
                  <SelectItem value="Paternity">
                    Babalık İzni (5 Gün)
                  </SelectItem>
                  <SelectItem value="Bereavement">
                    Vefat İzni (3 Gün)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Half Day Option — only for Casual/Sick */}
            {isHalfDayAllowed && (
              <div className="flex flex-col justify-end">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  <input
                    aria-label="Yarım Gün İzin"
                    checked={isHalfDay}
                    className="rounded text-blue-600 focus:ring-0"
                    onChange={(e) => setIsHalfDay(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="font-semibold text-xs">Yarım Gün İzin</span>
                </label>
              </div>
            )}
          </div>

          {/* Date Picker Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Başlangıç Tarihi *
              </label>
              <DatePicker
                onChange={(dateStr) => {
                  setStartDate(dateStr);
                  if ((isHalfDayAllowed && isHalfDay) || dateStr > endDate) {
                    setEndDate(dateStr);
                  }
                }}
                value={startDate}
              />
            </div>

            {isHalfDayAllowed && isHalfDay ? (
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Yarım Gün Periyodu
                </label>
                <Select onValueChange={setHalfDayPeriod} value={halfDayPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">
                      Sabah (Öğleden Önce)
                    </SelectItem>
                    <SelectItem value="Afternoon">Öğleden Sonra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Bitiş Tarihi *
                </label>
                <DatePicker
                  minDate={startDate}
                  onChange={setEndDate}
                  value={endDate}
                />
              </div>
            )}
          </div>

          {/* Smart Duration & Balance Calculation Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800/90 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  Hesaplanan İş Günü:
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                  Hafta sonları otomatik atlandı
                </span>
              </div>
            </div>
            <span className="font-extrabold text-base text-blue-600">
              {calculatedDays} Gün
            </span>
          </div>

          {/* Reason & Emergency Contact */}
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              İzin Sebebi / Açıklama
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) => setReason(e.target.value)}
              placeholder="İzin gerekçenizi kısaca belirtin..."
              rows={2}
              value={reason}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Acil Durum İletişim Notu (Opsiyonel)
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Örn: 0532 ... veya e-posta ile ulaşılabilir"
              type="text"
              value={emergencyContact}
            />
          </div>

          {/* Real-time Labor Law Compliance Alert */}
          <ComplianceInlineCard
            allowOverride={true}
            isOverridden={leaveOverride.allowed}
            onOverrideChange={(allowed, reason) =>
              setLeaveOverride({ allowed, reason })
            }
            overrideReason={leaveOverride.reason}
            validationResult={leaveCompliance.validationResult}
          />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={
                submitting ||
                leaveCompliance.validationResult.hasHardBlock ||
                !(
                  leaveCompliance.validationResult.isCompliant ||
                  leaveOverride.allowed
                )
              }
              type="submit"
            >
              {submitting
                ? "Talebiniz Gönderiliyor..."
                : leaveCompliance.validationResult.hasHardBlock
                  ? "Yasal Engel"
                  : "Talebi Gönder"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
