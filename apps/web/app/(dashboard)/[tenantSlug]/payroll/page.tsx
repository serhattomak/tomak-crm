"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import {
  ArrowRightLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Lock,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type EmployeePayrollDetailDto,
  type PayrollCalculationResultDto,
  type PayrollIcmalResponse,
  type PayrollParameterDto,
  type PayrollRunDetailResponse,
  type PayrollRunDto,
  type PayslipDto,
  type UpdateEmployeePuantajRequest,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const MONTH_NAMES = [
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

export default function PayrollPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [activeTab, setActiveTab] = useState<
    "runs" | "puantaj" | "payslip" | "icmal" | "simulator" | "parameters"
  >("runs");

  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRunDto[]>([]);
  const [selectedRun, setSelectedRun] =
    useState<PayrollRunDetailResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [parameters, setParameters] = useState<PayrollParameterDto | null>(
    null
  );
  const [selectedEmployeePayroll, setSelectedEmployeePayroll] =
    useState<EmployeePayrollDetailDto | null>(null);
  const [payslipData, setPayslipData] = useState<PayslipDto | null>(null);
  const [icmalData, setIcmalData] = useState<PayrollIcmalResponse | null>(null);

  // Modals state
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateRunModal(true);
    }
  }, [searchParams]);

  const [showEditPuantajModal, setShowEditPuantajModal] = useState(false);
  const [editingPuantaj, setEditingPuantaj] = useState<{
    employeePayrollId: string;
    employeeName: string;
    form: UpdateEmployeePuantajRequest;
  } | null>(null);

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "warning" | "default";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  const [newRunForm, setNewRunForm] = useState({
    month: new Date().getMonth() + 1,
    notes: "",
    title: "",
    year: new Date().getFullYear(),
  });

  // Simulator state
  const [simForm, setSimForm] = useState({
    advanceDeduction: 0,
    apply5510Incentive: true,
    baseSalary: 45_000,
    besRate: 0.03,
    bonusGross: 0,
    contractSalaryType: "Gross",
    hasBes: false,
    holidayDays: 0,
    icraDeduction: 0,
    mealAllowance: 0,
    otherGross: 0,
    overtimeHours: 0,
    paidLeaveDays: 0,
    priorCumulativeIncomeTaxBase: 0,
    privateHealthInsurance: 0,
    sickLeaveDays: 0,
    travelAllowance: 0,
    unpaidLeaveDays: 0,
    weekendDays: 8,
    workedDays: 22,
    year: new Date().getFullYear(),
  });

  const [simResult, setSimResult] =
    useState<PayrollCalculationResultDto | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Search & Filter in Puantaj
  const [puantajSearch, setPuantajSearch] = useState("");
  const [puantajDeptFilter, setPuantajDeptFilter] = useState("");

  const formatCurrency = (val?: number) =>
    new Intl.NumberFormat("tr-TR", {
      currency: "TRY",
      minimumFractionDigits: 2,
      style: "currency",
    }).format(val ?? 0);

  // Fetch Payroll Runs
  const fetchRuns = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    try {
      setLoading(true);
      const res = await ApiClient.getPayrollRuns({}, activeTenant.id);
      if (res.success && res.data) {
        setRuns(res.data.items);
        if (
          res.data.items &&
          res.data.items.length > 0 &&
          !selectedRunId &&
          res.data.items[0]
        ) {
          setSelectedRunId(res.data.items[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching payroll runs:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, selectedRunId]);

  // Fetch Selected Run Detail
  const fetchRunDetail = useCallback(
    async (runId: string) => {
      if (!(activeTenant?.id && runId)) {
        return;
      }
      try {
        const res = await ApiClient.getPayrollRunById(runId, activeTenant.id);
        if (res.success && res.data) {
          setSelectedRun(res.data);
          if (
            res.data.employees &&
            res.data.employees.length > 0 &&
            !selectedEmployeePayroll &&
            res.data.employees[0]
          ) {
            setSelectedEmployeePayroll(res.data.employees[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching run detail:", err);
      }
    },
    [activeTenant?.id, selectedEmployeePayroll]
  );

  // Fetch Parameters
  const fetchParameters = useCallback(
    async (year?: number) => {
      if (!activeTenant?.id) {
        return;
      }
      try {
        const res = await ApiClient.getPayrollParameters(year, activeTenant.id);
        if (res.success && res.data) {
          setParameters(res.data);
        }
      } catch (err) {
        console.error("Error fetching parameters:", err);
      }
    },
    [activeTenant?.id]
  );

  useEffect(() => {
    fetchRuns();
    fetchParameters();
  }, [fetchRuns, fetchParameters]);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetail(selectedRunId);
    }
  }, [selectedRunId, fetchRunDetail]);

  // Run live simulation on simForm change
  const handleSimulate = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    try {
      setSimulating(true);
      const res = await ApiClient.simulatePayroll(simForm, activeTenant.id);
      if (res.success && res.data) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  }, [activeTenant?.id, simForm]);

  useEffect(() => {
    if (activeTab === "simulator") {
      handleSimulate();
    }
  }, [activeTab, handleSimulate]);

  // Fetch Payslip Data when employee selected
  const handleSelectPayslip = async (employeePayrollId: string) => {
    if (!activeTenant?.id) {
      return;
    }
    try {
      const res = await ApiClient.getEmployeePayslip(
        employeePayrollId,
        activeTenant.id
      );
      if (res.success && res.data) {
        setPayslipData(res.data);
        setActiveTab("payslip");
      }
    } catch (err) {
      console.error("Error fetching payslip:", err);
    }
  };

  // Fetch Icmal Data
  const handleFetchIcmal = async (runId: string) => {
    if (!(activeTenant?.id && runId)) {
      return;
    }
    try {
      const res = await ApiClient.exportPayrollIcmal(runId, activeTenant.id);
      if (res.success && res.data) {
        setIcmalData(res.data);
        setActiveTab("icmal");
      }
    } catch (err) {
      console.error("Error fetching icmal:", err);
    }
  };

  // Create Run
  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.id) {
      return;
    }
    try {
      const res = await ApiClient.createPayrollRun(newRunForm, activeTenant.id);
      if (res.success && res.data) {
        setShowCreateRunModal(false);
        toast.success("Bordro dönemi başarıyla oluşturuldu.");
        await fetchRuns();
        setSelectedRunId(res.data.id);
        setActiveTab("puantaj");
      } else {
        toast.error(res.message || "Bordro dönemi oluşturulamadı.");
      }
    } catch (err) {
      console.error("Create run error:", err);
      toast.error("Bordro dönemi oluşturulurken bir hata oluştu.");
    }
  };

  // Calculate Run
  const handleCalculateRun = async (runId: string) => {
    if (!activeTenant?.id) {
      return;
    }
    try {
      const res = await ApiClient.calculatePayrollRun(runId, activeTenant.id);
      if (res.success) {
        toast.success("Bordro dönemi başarıyla hesaplandı.");
        await fetchRuns();
        await fetchRunDetail(runId);
      } else {
        toast.error(res.message || "Hesaplama işlemi başarısız.");
      }
    } catch (err) {
      console.error("Calculate error:", err);
      toast.error("Hesaplama sırasında bir hata oluştu.");
    }
  };

  // Approve Run
  const handleApproveRun = (runId: string) => {
    if (!activeTenant?.id) {
      return;
    }
    setConfirmDialog({
      confirmText: "Onayla",
      description:
        "Bordro dönemi onaylandığında kesinleşme aşamasına geçecektir. Devam etmek istiyor musunuz?",
      onConfirm: async () => {
        try {
          const res = await ApiClient.approvePayrollRun(runId, activeTenant.id);
          if (res.success) {
            toast.success("Bordro dönemi başarıyla onaylandı.");
            await fetchRuns();
            await fetchRunDetail(runId);
          } else {
            toast.error(res.message || "Onaylama başarısız oldu.");
          }
        } catch (err) {
          console.error("Approve error:", err);
          toast.error("Onaylama sırasında bir hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
      open: true,
      title: "Bordro Dönemini Onayla",
      variant: "default",
    });
  };

  // Lock Run
  const handleLockRun = (runId: string) => {
    if (!activeTenant?.id) {
      return;
    }
    setConfirmDialog({
      confirmText: "Kilitle",
      description:
        "Kilitlenen bordro dönemi üzerinde çalışan, puantaj ve maaş değişiklikleri yapılamaz. Emin misiniz?",
      onConfirm: async () => {
        try {
          const res = await ApiClient.lockPayrollRun(runId, activeTenant.id);
          if (res.success) {
            toast.success("Bordro dönemi kilitlendi.");
            await fetchRuns();
            await fetchRunDetail(runId);
          } else {
            toast.error(res.message || "Kilitleme başarısız oldu.");
          }
        } catch (err) {
          console.error("Lock error:", err);
          toast.error("Kilitleme sırasında bir hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
      open: true,
      title: "Bordro Dönemini Kilitle",
      variant: "warning",
    });
  };

  // Delete Run
  const handleDeleteRun = (runId: string) => {
    if (!activeTenant?.id) {
      return;
    }
    setConfirmDialog({
      confirmText: "Dönemi Sil",
      description:
        "Bu bordro dönemini ve tüm çalışan puantaj detaylarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      onConfirm: async () => {
        try {
          const res = await ApiClient.deletePayrollRun(runId, activeTenant.id);
          if (res.success) {
            toast.success("Bordro dönemi başarıyla silindi.");
            await fetchRuns();
            setSelectedRun(null);
          } else {
            toast.error(res.message || "Silme başarısız oldu.");
          }
        } catch (err) {
          console.error("Delete error:", err);
          toast.error("Silme sırasında bir hata oluştu.");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
      open: true,
      title: "Bordro Dönemini Sil",
      variant: "destructive",
    });
  };

  // Edit Puantaj
  const openEditPuantaj = (emp: EmployeePayrollDetailDto) => {
    setEditingPuantaj({
      employeeName: emp.employeeName,
      employeePayrollId: emp.id,
      form: {
        advanceDeduction: emp.advanceDeduction,
        baseSalary: emp.baseSalary,
        besRate: 0.03,
        bonusGross: emp.bonusGross,
        contractSalaryType: emp.contractSalaryType,
        hasBes: emp.besDeduction > 0,
        holidayDays: emp.holidayDays,
        icraDeduction: emp.icraDeduction,
        mealAllowanceGross: emp.mealAllowanceGross,
        otherGross: emp.otherGross,
        overtimeHours: emp.overtimeHours,
        paidLeaveDays: emp.paidLeaveDays,
        privateHealthInsurance: emp.privateHealthInsuranceDeduction,
        sickLeaveDays: emp.sickLeaveDays,
        travelAllowanceGross: emp.travelAllowanceGross,
        unpaidLeaveDays: emp.unpaidLeaveDays,
        weekendDays: emp.weekendDays,
        workedDays: emp.workedDays,
      },
    });
    setShowEditPuantajModal(true);
  };

  const handleSavePuantaj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant?.id && selectedRunId && editingPuantaj)) {
      return;
    }
    try {
      const res = await ApiClient.updateEmployeePuantaj(
        selectedRunId,
        editingPuantaj.employeePayrollId,
        editingPuantaj.form,
        activeTenant.id
      );
      if (res.success) {
        setShowEditPuantajModal(false);
        setEditingPuantaj(null);
        toast.success("Puantaj ve kazançlar kaydedildi.");
        await fetchRunDetail(selectedRunId);
        await fetchRuns();
      } else {
        toast.error(res.message || "Puantaj kaydedilemedi.");
      }
    } catch (err) {
      console.error("Save puantaj error:", err);
      toast.error("Puantaj kaydedilirken bir hata oluştu.");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!icmalData) {
      return;
    }
    const headers = [
      "Personel No",
      "TC Kimlik",
      "Adı Soyadı",
      "Departman",
      "Ünvan",
      "IBAN",
      "Taban Maaş",
      "Ödenen Gün",
      "Çalışılan Gün",
      "Fazla Mesai (Saat)",
      "Toplam Brüt",
      "SGK Matrahı",
      "SGK İşçi (%14)",
      "İşsizlik İşçi (%1)",
      "Önceki Kümülatif Matrah",
      "Gelir Vergisi Matrahı",
      "Güncel Kümülatif",
      "Hesaplanan GV",
      "Asgari Ücret GV İstisnası",
      "Ödenecek GV",
      "Hesaplanan Damga V.",
      "Asgari Ücret DV İstisnası",
      "Ödenecek Damga V.",
      "BES Kesintisi",
      "İcra Kesintisi",
      "Avans Kesintisi",
      "Toplam Kesintiler",
      "Ödenecek Net Maaş",
      "SGK İşveren",
      "5510 Teşvik İndirimi",
      "İşsizlik İşveren",
      "Toplam İşveren Maliyeti",
    ];

    const rows = icmalData.rows.map((r) => [
      `"${r.employeeNumber}"`,
      `"${r.tcIdentityNumber}"`,
      `"${r.employeeName}"`,
      `"${r.departmentName}"`,
      `"${r.jobTitle}"`,
      `"${r.iban}"`,
      r.baseSalary,
      r.totalPaidDays,
      r.workedDays,
      r.overtimeHours,
      r.totalGross,
      r.sgkBase,
      r.sgkEmployeeDeduction,
      r.unemploymentEmployeeDeduction,
      r.priorCumulativeIncomeTaxBase,
      r.currentIncomeTaxBase,
      r.currentCumulativeIncomeTaxBase,
      r.calculatedIncomeTax,
      r.minWageIncomeTaxExemption,
      r.payableIncomeTax,
      r.calculatedStampTax,
      r.minWageStampExemption,
      r.payableStampTax,
      r.besDeduction,
      r.icraDeduction,
      r.advanceDeduction,
      r.totalDeductions,
      r.payableNetSalary,
      r.sgkEmployerDeduction,
      r.sgkEmployerDiscount5510,
      r.unemploymentEmployerDeduction,
      r.totalEmployerCost,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bordro_Icmal_${icmalData.year}_${MONTH_NAMES[icmalData.month - 1]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered employees in Puantaj
  const filteredEmployees =
    selectedRun?.employees.filter((emp) => {
      const matchesSearch =
        !puantajSearch ||
        emp.employeeName.toLowerCase().includes(puantajSearch.toLowerCase()) ||
        (emp.employeeNumber &&
          emp.employeeNumber
            .toLowerCase()
            .includes(puantajSearch.toLowerCase())) ||
        (emp.jobTitle &&
          emp.jobTitle.toLowerCase().includes(puantajSearch.toLowerCase()));

      const matchesDept =
        !puantajDeptFilter || emp.departmentName === puantajDeptFilter;
      return matchesSearch && matchesDept;
    }) ?? [];

  // Summary Metrics from currently active or latest run
  const activeRun = selectedRun?.run || runs[0] || null;

  return (
    <PageContainer className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/20 shadow-sm">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-bold text-xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Bordro & Maaş Yönetimi
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Türkiye mevzuatına (5510, 193, 488 ve 7349) tam uyumlu çift
                yönlü bordro motoru
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() => {
              handleSimulate();
              setActiveTab("simulator");
            }}
          >
            <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
            <span>Maaş Simülatörü</span>
          </button>

          <PermissionGate permission="Payroll.Manage">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700"
              onClick={() => setShowCreateRunModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Dönem Bordrosu</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Cards Row */}
      {activeRun && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between font-medium text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Toplam Brüt Maaş ({MONTH_NAMES[activeRun.month - 1]}{" "}
                {activeRun.year})
              </span>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-bold text-lg text-zinc-900 dark:text-zinc-100">
              {formatCurrency(activeRun.totalGross)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-2xs text-zinc-500 dark:text-zinc-400">
              <span>{activeRun.totalEmployees} Aktif Personel</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between font-medium text-xs text-zinc-500 dark:text-zinc-400">
              <span>Ödenecek Net Maaş</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-bold text-emerald-600 text-lg">
              {formatCurrency(activeRun.totalNet)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-2xs text-emerald-700">
              <span>Çalışanlara Aktarılacak Net</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between font-medium text-xs text-zinc-500 dark:text-zinc-400">
              <span>SGK & Vergi Toplamı</span>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 font-bold text-blue-600 text-lg">
              {formatCurrency(
                activeRun.totalSgkEmployee +
                  activeRun.totalSgkEmployer +
                  activeRun.totalIncomeTax +
                  activeRun.totalStampTax
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-2xs text-zinc-500 dark:text-zinc-400">
              <span>Devlet Yasal Kesintileri</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between font-medium text-xs text-zinc-500 dark:text-zinc-400">
              <span>Toplam İşveren Maliyeti</span>
              <Percent className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 font-bold text-lg text-purple-600">
              {formatCurrency(activeRun.totalEmployerCost)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-2xs text-purple-700">
              <span>5510 %5 Teşviki Dahil</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-border border-b pb-2">
        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "runs"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("runs")}
        >
          <Calendar className="h-4 w-4" />
          <span>Bordro Dönemleri</span>
          <span className="rounded-full bg-blue-700 px-1.5 py-0.5 text-3xs text-blue-100">
            {runs.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "puantaj"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("puantaj")}
        >
          <Clock className="h-4 w-4" />
          <span>Puantaj & Bordro Hesaplama</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "payslip"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("payslip")}
        >
          <FileText className="h-4 w-4" />
          <span>Resmi Bordro Zarfı (Pusula)</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "icmal"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => {
            if (selectedRunId) {
              handleFetchIcmal(selectedRunId);
            } else {
              setActiveTab("icmal");
            }
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Bordro İcmali & Export</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "simulator"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("simulator")}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>Maaş Simülatörü</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold text-xs transition-all ${
            activeTab === "parameters"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("parameters")}
        >
          <Settings2 className="h-4 w-4" />
          <span>Mevzuat Parametreleri</span>
        </button>
      </div>

      {/* TAB 1: BORDRO DÖNEMLERİ (RUNS) */}
      {activeTab === "runs" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
            <Table>
              <TableHeader className="border-border bg-zinc-50/90 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                <TableRow>
                  <TableHead className="px-4 py-3 h-auto">Dönem</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Başlık</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Personel</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Toplam Brüt</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Ödenen Net</TableHead>
                  <TableHead className="px-4 py-3 h-auto">İşveren Maliyeti</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Durum</TableHead>
                  <TableHead className="px-4 py-3 text-right h-auto">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {runs.map((run) => {
                  const isSelected = selectedRunId === run.id;
                  const statusColors: Record<string, string> = {
                    Approved:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
                    Calculated:
                      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
                    Draft:
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-border",
                    Locked:
                      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
                  };

                  const statusLabels: Record<string, string> = {
                    Approved: "Onaylandı",
                    Calculated: "Hesaplandı",
                    Draft: "Taslak",
                    Locked: "Kilitlendi",
                  };

                  return (
                    <TableRow
                      className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                        isSelected
                          ? "bg-zinc-50 font-medium dark:bg-zinc-800/50"
                          : ""
                      }`}
                      key={run.id}
                    >
                      <TableCell className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                        {MONTH_NAMES[run.month - 1]} {run.year}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {run.title}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          <Users className="h-3 w-3" />
                          {run.totalEmployees}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(run.totalGross)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-bold text-emerald-600">
                        {formatCurrency(run.totalNet)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-semibold text-purple-700">
                        {formatCurrency(run.totalEmployerCost)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-bold text-3xs ${
                            statusColors[run.status] ||
                            "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {run.status === "Locked" && (
                            <Lock className="h-3 w-3" />
                          )}
                          {run.status === "Approved" && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {statusLabels[run.status] || run.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                            onClick={() => {
                              setSelectedRunId(run.id);
                              setActiveTab("puantaj");
                            }}
                          >
                            Puantaj & Detay
                          </button>

                          <button
                            className="rounded-lg border border-border bg-card px-2 py-1 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                            onClick={() => handleFetchIcmal(run.id)}
                            title="İcmal Tablosu"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                          </button>

                          {run.status !== "Locked" && (
                            <PermissionGate permission="Payroll.Manage">
                              <button
                                className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 font-semibold text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-100"
                                onClick={() => handleCalculateRun(run.id)}
                                title="Yeniden Hesapla"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </PermissionGate>
                          )}

                          {run.status === "Calculated" && (
                            <PermissionGate permission="Payroll.Approve">
                              <button
                                className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300 text-xs hover:bg-emerald-100"
                                onClick={() => handleApproveRun(run.id)}
                              >
                                Onayla
                              </button>
                            </PermissionGate>
                          )}

                          {run.status === "Approved" && (
                            <PermissionGate permission="Payroll.Approve">
                              <button
                                className="flex items-center gap-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 font-semibold text-purple-700 dark:text-purple-300 text-xs hover:bg-purple-100"
                                onClick={() => handleLockRun(run.id)}
                              >
                                <Lock className="h-3 w-3" />
                                Kilitle
                              </button>
                            </PermissionGate>
                          )}

                          {run.status !== "Locked" && (
                            <PermissionGate permission="Payroll.Manage">
                              <button
                                className="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500"
                                onClick={() => handleDeleteRun(run.id)}
                                title="Dönemi Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="py-12 text-center text-muted-foreground"
                      colSpan={8}
                    >
                      Henüz oluşturulmuş bir bordro dönemi bulunmuyor. "Yeni
                      Dönem Bordrosu" butonuna basarak başlayabilirsiniz.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 2: PUANTAJ VE DETAYLI BORDRO TABLOSU */}
      {activeTab === "puantaj" && (
        <div className="space-y-4">
          {/* Controls Header */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Seçili Dönem:
              </div>
              <Combobox
                aria-label="Bordro dönemi"
                onChange={setSelectedRunId}
                options={runs.map((r) => ({
                  label: `${MONTH_NAMES[r.month - 1]} ${r.year} - ${r.title} (${r.status})`,
                  value: r.id,
                }))}
                triggerClassName="h-8 font-bold"
                value={selectedRunId}
              />

              {selectedRun && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-bold text-2xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {selectedRun.employees.length} Personel
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="rounded-xl border border-border bg-zinc-50 py-1.5 pr-3 pl-8 text-xs text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:bg-zinc-900 dark:text-zinc-200 dark:text-zinc-500"
                  onChange={(e) => setPuantajSearch(e.target.value)}
                  placeholder="Personel veya ünvan ara..."
                  type="text"
                  value={puantajSearch}
                />
              </div>

              {selectedRunId && selectedRun?.run.status !== "Locked" && (
                <>
                  <button
                    className="flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 font-semibold text-blue-700 dark:text-blue-300 text-xs shadow-2xs hover:bg-blue-100"
                    onClick={() => handleCalculateRun(selectedRunId)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Tümünü Yeniden Hesapla</span>
                  </button>

                  {selectedRun?.run.status === "Calculated" && (
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-semibold text-white text-xs shadow-2xs hover:bg-emerald-700"
                      onClick={() => handleApproveRun(selectedRunId)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Bordroyu Onayla</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Interactive Puantaj Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xs">
            <Table className="min-w-[1000px]">
              <TableHeader className="border-border bg-zinc-50/90 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                <TableRow>
                  <TableHead className="px-3 py-2.5 h-auto">Personel</TableHead>
                  <TableHead className="px-2 py-2.5 h-auto">Sözleşme</TableHead>
                  <TableHead className="px-2 py-2.5 text-center h-auto">Çalışılan</TableHead>
                  <TableHead className="px-2 py-2.5 text-center h-auto">İzin/Rapor</TableHead>
                  <TableHead className="px-2 py-2.5 text-center h-auto">Ücretsiz İzin</TableHead>
                  <TableHead className="px-2 py-2.5 text-center h-auto">Ödenen Gün</TableHead>
                  <TableHead className="px-2 py-2.5 text-center h-auto">Fazla Mesai</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">Brüt Kazanç</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">SGK Matrahı</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">Gelir Vergisi</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">7349 İstisna</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">Ödenecek Net</TableHead>
                  <TableHead className="px-3 py-2.5 h-auto">İşveren Maliyeti</TableHead>
                  <TableHead className="px-3 py-2.5 text-right h-auto">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredEmployees.map((emp) => (
                  <TableRow
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    key={emp.id}
                  >
                    <TableCell className="px-3 py-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {emp.employeeName}
                      </div>
                      <div className="text-3xs text-zinc-500 dark:text-zinc-400">
                        {emp.jobTitle || "Personel"} •{" "}
                        {emp.departmentName || "Genel"}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                      {emp.contractSalaryType === "Net" ? (
                        <span className="rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 font-bold text-3xs text-blue-700 dark:text-blue-300">
                          Net: {formatCurrency(emp.baseSalary)}
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-bold text-3xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Brüt: {formatCurrency(emp.baseSalary)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                      {emp.workedDays} g
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center text-zinc-600 dark:text-zinc-400">
                      {emp.paidLeaveDays + emp.sickLeaveDays > 0 ? (
                        <span className="font-semibold text-amber-600">
                          {emp.paidLeaveDays + emp.sickLeaveDays} g
                        </span>
                      ) : (
                        "0 g"
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      {emp.unpaidLeaveDays > 0 ? (
                        <span className="rounded bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 font-bold text-red-600 dark:text-red-400">
                          {emp.unpaidLeaveDays} g
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          0 g
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center font-bold text-zinc-900 dark:text-zinc-100">
                      {emp.totalPaidDays} g
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center">
                      {emp.overtimeHours > 0 ? (
                        <span className="font-bold text-indigo-600">
                          {emp.overtimeHours} sa
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(emp.totalGross)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(emp.sgkBase)}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {formatCurrency(emp.payableIncomeTax)}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-medium text-2xs text-emerald-600">
                      +
                      {formatCurrency(
                        emp.minWageIncomeTaxExemption +
                          emp.minWageStampExemption
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-bold text-emerald-600">
                      {formatCurrency(emp.payableNetSalary)}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-semibold text-purple-700">
                      {formatCurrency(emp.totalEmployerCost)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          onClick={() => openEditPuantaj(emp)}
                          title="Puantaj Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded-lg border border-border bg-card px-2 py-1 font-semibold text-2xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                          onClick={() => handleSelectPayslip(emp.id)}
                        >
                          Pusula
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={14}
                    >
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 3: RESMİ BORDRO ZARFI (PUSULA - PRINT & PDF) */}
      {activeTab === "payslip" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-2xs print:hidden">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Personel Pusulası:
              </span>
              <Combobox
                aria-label="Personel pusulası"
                onChange={(value) => {
                  if (value) {
                    handleSelectPayslip(value);
                  }
                }}
                options={(selectedRun?.employees ?? []).map((e) => ({
                  label: `${e.employeeName} (${e.jobTitle || "Personel"})`,
                  value: e.id,
                }))}
                triggerClassName="h-8 font-bold"
                value={payslipData?.id || ""}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 text-white" />
                <span>Yazdır / PDF İndir</span>
              </button>
            </div>
          </div>

          {/* Official Turkish Standard Payslip Document */}
          {payslipData ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 font-sans text-zinc-900 shadow-sm dark:text-zinc-100 print:border-none print:p-0 print:shadow-none">
              {/* Document Header */}
              <div className="flex items-center justify-between border-zinc-900 border-b-2 pb-4">
                <div>
                  <h2 className="font-black text-base uppercase tracking-tight">
                    {activeTenant?.name || "ŞİRKET ADI"}
                  </h2>
                  <div className="text-2xs text-zinc-600 dark:text-zinc-400">
                    ÜCRET HESAP PUSULASI (BORDRO ZARFI)
                  </div>
                  <div className="text-3xs text-zinc-500 dark:text-zinc-400">
                    4857 Sayılı İş Kanunu Madde 37 Gereğince Düzenlenmiştir
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-black text-sm text-zinc-900 uppercase dark:text-zinc-100">
                    {MONTH_NAMES[payslipData.month - 1]} {payslipData.year}
                  </div>
                  <div className="text-2xs text-zinc-600 dark:text-zinc-400">
                    Dönem: {payslipData.month.toString().padStart(2, "0")}/
                    {payslipData.year}
                  </div>
                  <div className="font-medium text-3xs text-emerald-700">
                    Durum: {payslipData.runStatus}
                  </div>
                </div>
              </div>

              {/* Employee & Company Info Grid */}
              <div className="my-4 grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-3.5 text-xs dark:bg-zinc-800/50">
                <div className="space-y-1">
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Personel Adı Soyadı:
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {payslipData.employeeName}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      T.C. Kimlik No:
                    </span>
                    <span className="font-medium">
                      {payslipData.tcIdentityNumber || "12345678901"}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Sicil / Personel No:
                    </span>
                    <span className="font-medium">
                      {payslipData.employeeNumber || "EMP-001"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      IBAN:
                    </span>
                    <span className="font-mono text-2xs">
                      {payslipData.iban || "TR00 0000 0000 0000 0000 0000 00"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Departman:
                    </span>
                    <span className="font-semibold">
                      {payslipData.departmentName || "Genel"}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Görev / Ünvan:
                    </span>
                    <span className="font-medium">
                      {payslipData.jobTitle || "Personel"}
                    </span>
                  </div>
                  <div className="flex justify-between border-border border-b pb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Sözleşme Taban Ücreti:
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(payslipData.baseSalary)} (
                      {payslipData.contractSalaryType})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Gün Dağılımı:
                    </span>
                    <span className="font-medium">
                      {payslipData.workedDays} Gün Çal. +{" "}
                      {payslipData.weekendDays} HT = {payslipData.totalPaidDays}{" "}
                      Gün
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Column Financial Breakdown */}
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                {/* Column 1: Kazançlar */}
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <div className="border-border border-b pb-1.5 font-bold text-xs text-zinc-900 uppercase dark:text-zinc-100">
                    1. KAZANÇLAR
                  </div>
                  <div className="space-y-1 text-2xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Normal Çalışma Ücreti:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.normalGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Fazla Mesai ({payslipData.overtimeHours} sa):
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.overtimeGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Prim / İkramiye:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.bonusGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Yemek Yardımı:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.mealAllowanceGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Yol / Ulaşım:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.travelAllowanceGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Diğer Ek Kazançlar:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.otherGross)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-border border-t pt-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    <span>TOPLAM BRÜT:</span>
                    <span className="text-indigo-700">
                      {formatCurrency(payslipData.totalGross)}
                    </span>
                  </div>
                </div>

                {/* Column 2: Yasal Kesintiler & Vergiler */}
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <div className="border-border border-b pb-1.5 font-bold text-xs text-zinc-900 uppercase dark:text-zinc-100">
                    2. YASAL KESİNTİLER
                  </div>
                  <div className="space-y-1 text-2xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        SGK İşçi Primi (%14):
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.sgkEmployeeDeduction)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        İşsizlik Primi (%1):
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          payslipData.unemploymentEmployeeDeduction
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>Kümülatif GV Matrahı:</span>
                      <span>
                        {formatCurrency(
                          payslipData.currentCumulativeIncomeTaxBase
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Hesaplanan Gelir Vergisi:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.calculatedIncomeTax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>7349 Asgari Ücret GV İst.:</span>
                      <span>
                        -{formatCurrency(payslipData.minWageIncomeTaxExemption)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        Ödenecek Gelir Vergisi:
                      </span>
                      <span>
                        {formatCurrency(payslipData.payableIncomeTax)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Hesaplanan Damga Vergisi:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(payslipData.calculatedStampTax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>7349 Asgari Ücret DV İst.:</span>
                      <span>
                        -{formatCurrency(payslipData.minWageStampExemption)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        Ödenecek Damga Vergisi:
                      </span>
                      <span>{formatCurrency(payslipData.payableStampTax)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Özel Kesintiler ve Net Ödenen */}
                <div className="flex flex-col justify-between space-y-2 rounded-xl border border-border bg-card p-3">
                  <div>
                    <div className="border-border border-b pb-1.5 font-bold text-xs text-zinc-900 uppercase dark:text-zinc-100">
                      3. ÖZEL KESİNTİLER & NET
                    </div>
                    <div className="mt-2 space-y-1 text-2xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Otomatik BES (%3):
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(payslipData.besDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          İcra Kesintisi:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(payslipData.icraDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Avans Mahsubu:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(payslipData.advanceDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Özel Sağlık Sigortası:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            payslipData.privateHealthInsuranceDeduction
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-border border-t pt-1 font-semibold text-red-600">
                        <span>Toplam Kesintiler:</span>
                        <span>
                          {formatCurrency(payslipData.totalDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-center">
                    <div className="font-bold text-3xs text-emerald-800 uppercase tracking-wider">
                      ÖDENECEK NET ÜCRET
                    </div>
                    <div className="font-black text-emerald-700 text-xl">
                      {formatCurrency(payslipData.payableNetSalary)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employer Cost Footer */}
              <div className="mt-4 rounded-xl border border-border bg-zinc-50/50 p-3 text-2xs dark:bg-zinc-800/30">
                <div className="mb-1.5 font-bold text-zinc-700 uppercase dark:text-zinc-300">
                  İşveren Yasal Yükümlülükleri & Maliyeti
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      SGK İşveren (%20.5):{" "}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(payslipData.sgkEmployerDeduction)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      5510 %5 Teşvik İndirimi:{" "}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      -{formatCurrency(payslipData.sgkEmployerDiscount5510)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      İşsizlik İşveren (%2):{" "}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(
                        payslipData.unemploymentEmployerDeduction
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      Toplam İşveren Maliyeti:{" "}
                    </span>
                    <span className="font-bold text-purple-700">
                      {formatCurrency(payslipData.totalEmployerCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal Signature Box */}
              <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-zinc-400 border-t pt-2">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">
                    İŞVEREN / YETKİLİ KAŞE VE İMZA
                  </div>
                  <div className="mt-8 text-3xs text-zinc-500 dark:text-zinc-400">
                    Kaşe / İmza
                  </div>
                </div>

                <div className="border-zinc-400 border-t pt-2">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200">
                    PERSONEL İMZA
                  </div>
                  <div className="text-3xs text-zinc-500 dark:text-zinc-400">
                    Yukarıda dökümü yapılan net ücretimi eksiksiz teslim aldım.
                  </div>
                  <div className="mt-6 text-3xs text-zinc-500 dark:text-zinc-400">
                    İmza / Tarih
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              Görüntülemek için puantaj ekranından veya yukarıdaki seçim
              kutusundan bir çalışan seçiniz.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BORDRO İCMALİ & EXPORT */}
      {activeTab === "icmal" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:flex-row">
            <div>
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Aylık Bordro İcmal Tablosu
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Banka ödeme listesi ve SGK bildirge mutabakat formatında tam
                icmal dökümü
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white text-xs shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                disabled={!icmalData || icmalData.rows.length === 0}
                onClick={handleExportCsv}
              >
                <Download className="h-4 w-4" />
                <span>Excel / CSV Olarak İndir</span>
              </button>
            </div>
          </div>

          {icmalData && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-2xs">
              <Table className="min-w-[1200px] text-2xs">
                <TableHeader className="border-border bg-zinc-50 font-bold text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <TableRow>
                    <TableHead className="px-3 py-2.5 h-auto">No</TableHead>
                    <TableHead className="px-3 py-2.5 h-auto">TC Kimlik</TableHead>
                    <TableHead className="px-3 py-2.5 h-auto">Personel</TableHead>
                    <TableHead className="px-3 py-2.5 h-auto">Departman</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">Brüt Toplam</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">SGK Matrah</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">SGK İşçi (%14)</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">GV Matrahı</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">Ödenen GV</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">Ödenen DV</TableHead>
                    <TableHead className="px-3 py-2.5 text-right h-auto">Kesintiler</TableHead>
                    <TableHead className="px-3 py-2.5 text-right font-black text-emerald-700 h-auto">
                      Ödenecek Net
                    </TableHead>
                    <TableHead className="px-3 py-2.5 text-right font-black text-purple-700 h-auto">
                      İşveren Maliyeti
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 font-medium dark:divide-zinc-800">
                  {icmalData.rows.map((row, idx) => (
                    <TableRow
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      key={idx}
                    >
                      <TableCell className="px-3 py-2.5 font-mono text-zinc-500 dark:text-zinc-400">
                        {row.employeeNumber}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-zinc-500 dark:text-zinc-400">
                        {row.tcIdentityNumber}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                        {row.employeeName}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {row.departmentName}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-semibold">
                        {formatCurrency(row.totalGross)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(row.sgkBase)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(row.sgkEmployeeDeduction)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(row.currentIncomeTaxBase)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(row.payableIncomeTax)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(row.payableStampTax)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-red-600">
                        {formatCurrency(row.totalDeductions)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-bold text-emerald-700">
                        {formatCurrency(row.payableNetSalary)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-bold text-purple-700">
                        {formatCurrency(row.totalEmployerCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Summary Row */}
                  <TableRow className="border-border border-t-2 bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    <TableCell className="px-3 py-3 text-right uppercase" colSpan={4}>
                      GENEL TOPLAM ({icmalData.totalEmployees} Personel):
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      {formatCurrency(icmalData.totalGross)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">-</TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      {formatCurrency(icmalData.totalSgkEmployee)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">-</TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      {formatCurrency(icmalData.totalIncomeTax)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      {formatCurrency(icmalData.totalStampTax)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">-</TableCell>
                    <TableCell className="px-3 py-3 text-right font-black text-emerald-700">
                      {formatCurrency(icmalData.totalNet)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-black text-purple-700">
                      {formatCurrency(icmalData.totalEmployerCost)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MAAŞ SİMÜLATÖRÜ (CANLI HESAPLAMA) */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Inputs Column */}
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xs lg:col-span-5">
            <div className="border-border border-b pb-3">
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Maaş & Parametre Girişi
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Brüt veya Net maaş girerek anlık vergi dökümünü hesaplayın
              </p>
            </div>

            {/* Type Selector (Gross vs Net) */}
            <div>
              <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Hesaplama Yönü
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  className={`rounded-lg py-1.5 font-bold text-xs transition-all ${ simForm.contractSalaryType === "Gross" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
                  onClick={() =>
                    setSimForm((prev) => ({
                      ...prev,
                      contractSalaryType: "Gross",
                    }))
                  }
                  type="button"
                >
                  Brüt'ten Net'e
                </button>
                <button
                  className={`rounded-lg py-1.5 font-bold text-xs transition-all ${ simForm.contractSalaryType === "Net" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
                  onClick={() =>
                    setSimForm((prev) => ({
                      ...prev,
                      contractSalaryType: "Net",
                    }))
                  }
                  type="button"
                >
                  Net'ten Brüt'e
                </button>
              </div>
            </div>

            {/* Base Salary */}
            <div>
              <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                {simForm.contractSalaryType === "Gross"
                  ? "Aylık Brüt Maaş (₺)"
                  : "Hedef Net Maaş (₺)"}
              </label>
              <NumberInput
                onChange={(val) =>
                  setSimForm({
                    ...simForm,
                    baseSalary: val,
                  })
                }
                prefix="₺"
                step={100}
                value={simForm.baseSalary}
              />
            </div>

            {/* Cumulative Prior Income Tax Base */}
            <div>
              <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Önceki Aylardan Kümülatif GV Matrahı (₺)
              </label>
              <NumberInput
                onChange={(val) =>
                  setSimForm({
                    ...simForm,
                    priorCumulativeIncomeTaxBase: val,
                  })
                }
                prefix="₺"
                step={1000}
                value={simForm.priorCumulativeIncomeTaxBase}
              />
              <p className="mt-1 text-3xs text-muted-foreground">
                Vergi dilim geçişlerini (%15, %20, %27, %35, %40) test etmek
                için
              </p>
            </div>

            {/* Overtime & Bonuses */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Fazla Mesai (Saat)
                </label>
                <NumberInput
                  onChange={(val) =>
                    setSimForm({
                      ...simForm,
                      overtimeHours: val,
                    })
                  }
                  suffix="saat"
                  value={simForm.overtimeHours}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Prim / İkramiye (₺)
                </label>
                <NumberInput
                  onChange={(val) =>
                    setSimForm({
                      ...simForm,
                      bonusGross: val,
                    })
                  }
                  prefix="₺"
                  value={simForm.bonusGross}
                />
              </div>
            </div>

            {/* Allowances */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Yemek Yardımı (₺)
                </label>
                <NumberInput
                  onChange={(val) =>
                    setSimForm({
                      ...simForm,
                      mealAllowance: val,
                    })
                  }
                  prefix="₺"
                  value={simForm.mealAllowance}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Yol Yardımı (₺)
                </label>
                <NumberInput
                  onChange={(val) =>
                    setSimForm({
                      ...simForm,
                      travelAllowance: val,
                    })
                  }
                  prefix="₺"
                  value={simForm.travelAllowance}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 border-border border-t pt-3">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  checked={simForm.apply5510Incentive}
                  className="rounded border-border text-emerald-600 focus:ring-0"
                  onChange={(e) =>
                    setSimForm({
                      ...simForm,
                      apply5510Incentive: e.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <span>5510 Sayılı Kanun %5 Hazine Teşviki Uygula</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  checked={simForm.hasBes}
                  className="rounded border-border text-emerald-600 focus:ring-0"
                  onChange={(e) =>
                    setSimForm({ ...simForm, hasBes: e.target.checked })
                  }
                  type="checkbox"
                />
                <span>Otomatik Katılım BES (%3) Kesintisi</span>
              </label>
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-bold text-white text-xs shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={simulating}
              onClick={handleSimulate}
            >
              <RefreshCw
                className={`h-4 w-4 ${simulating ? "animate-spin" : ""}`}
              />
              <span>Anlık Hesapla</span>
            </button>
          </div>

          {/* Results Column */}
          <div className="space-y-4 lg:col-span-7">
            {simResult ? (
              <div className="space-y-4">
                {/* Highlight Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-2xs dark:from-emerald-950/30 dark:to-teal-950/30">
                    <div className="font-bold text-emerald-800 text-xs uppercase tracking-wider">
                      ÖDENECEK NET MAAŞ
                    </div>
                    <div className="mt-2 font-black text-2xl text-emerald-700">
                      {formatCurrency(simResult.payableNetSalary)}
                    </div>
                    <div className="mt-1 text-2xs text-emerald-700">
                      Hesaplanan Brüt: {formatCurrency(simResult.totalGross)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-purple-200/80 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-2xs dark:from-purple-950/30 dark:to-indigo-950/30">
                    <div className="font-bold text-purple-800 text-xs uppercase tracking-wider">
                      TOPLAM İŞVEREN MALİYETİ
                    </div>
                    <div className="mt-2 font-black text-2xl text-purple-700">
                      {formatCurrency(simResult.totalEmployerCost)}
                    </div>
                    <div className="mt-1 text-2xs text-purple-700">
                      5510 Teşvik Tasarrufu: -
                      {formatCurrency(simResult.sgkEmployerDiscount5510)}
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown Card */}
                <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xs">
                  <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                    Detaylı Vergi & Yasal Kesinti Analizi
                  </h3>

                  <div className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Toplam Brüt Kazanç:
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(simResult.totalGross)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        SGK İşçi Payı (%14):
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(simResult.sgkEmployeeDeduction)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        İşsizlik Sigortası İşçi Payı (%1):
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(
                          simResult.unemploymentEmployeeDeduction
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between rounded-lg bg-zinc-50/50 px-2 py-2 dark:bg-zinc-800/30">
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">
                        Gelir Vergisi Matrahı:
                      </span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(simResult.currentIncomeTaxBase)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Hesaplanan Gelir Vergisi:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(simResult.calculatedIncomeTax)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 font-medium text-emerald-700">
                      <span>7349 Asgari Ücret Gelir Vergisi İstisnası:</span>
                      <span>
                        -{formatCurrency(simResult.minWageIncomeTaxExemption)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 font-bold text-zinc-900 dark:text-zinc-100">
                      <span>Ödenecek Gelir Vergisi:</span>
                      <span className="text-indigo-700">
                        {formatCurrency(simResult.payableIncomeTax)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Hesaplanan Damga Vergisi (Binde 7.59):
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(simResult.calculatedStampTax)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 font-medium text-emerald-700">
                      <span>7349 Asgari Ücret Damga Vergisi İstisnası:</span>
                      <span>
                        -{formatCurrency(simResult.minWageStampExemption)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 font-bold text-zinc-900 dark:text-zinc-100">
                      <span>Ödenecek Damga Vergisi:</span>
                      <span className="text-indigo-700">
                        {formatCurrency(simResult.payableStampTax)}
                      </span>
                    </div>

                    {simResult.besDeduction > 0 && (
                      <div className="flex justify-between py-2 font-medium text-purple-700">
                        <span>Otomatik Katılım BES (%3):</span>
                        <span>{formatCurrency(simResult.besDeduction)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
                Hesaplama yapılıyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: MEVZUAT PARAMETRELERİ (SETTINGS) */}
      {activeTab === "parameters" && (
        <div className="max-w-4xl space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-2xs">
            <div>
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Türkiye Yasal Bordro Parametreleri (
                {parameters?.year || new Date().getFullYear()})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                5510 Sayılı SGK Kanunu, 193 Sayılı Gelir Vergisi Kanunu ve
                Asgari Ücret yasal hadleri
              </p>
            </div>

            {parameters ? (
              <div className="space-y-6">
                {/* Asgari Ücret & SGK */}
                <div>
                  <h3 className="mb-3 font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    Asgari Ücret ve SGK Tavan / Taban Sınırları
                  </h3>
                  <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        Brüt Asgari Ücret:
                      </div>
                      <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(parameters.minWageGross)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        Net Asgari Ücret:
                      </div>
                      <div className="font-bold text-base text-emerald-700">
                        {formatCurrency(parameters.minWageNet)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        SGK Taban Matrahı:
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(parameters.sgkFloor)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        SGK Tavan Matrahı (7.5 Katı):
                      </div>
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(parameters.sgkCeiling)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gelir Vergisi Dilimleri */}
                <div>
                  <h3 className="mb-3 font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    Ücret Gelir Vergisi Dilimleri (193 Sayılı GVK Md.103)
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border text-xs">
                    <Table>
                      <TableHeader className="bg-zinc-100 font-bold text-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-400">
                        <TableRow>
                          <TableHead className="p-2.5 h-auto">Dilim</TableHead>
                          <TableHead className="p-2.5 h-auto">Matrah Üst Sınırı</TableHead>
                          <TableHead className="p-2.5 text-right h-auto">Vergi Oranı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        <TableRow>
                          <TableCell className="p-2.5 font-medium">1. Dilim</TableCell>
                          <TableCell className="p-2.5">
                            {formatCurrency(parameters.taxBracket1Limit)}'ye
                            kadar
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-indigo-600">
                            %{(parameters.taxBracket1Rate * 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="p-2.5 font-medium">2. Dilim</TableCell>
                          <TableCell className="p-2.5">
                            {formatCurrency(parameters.taxBracket2Limit)}'ye
                            kadar
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-indigo-600">
                            %{(parameters.taxBracket2Rate * 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="p-2.5 font-medium">3. Dilim</TableCell>
                          <TableCell className="p-2.5">
                            {formatCurrency(parameters.taxBracket3Limit)}'ye
                            kadar
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-indigo-600">
                            %{(parameters.taxBracket3Rate * 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="p-2.5 font-medium">4. Dilim</TableCell>
                          <TableCell className="p-2.5">
                            {formatCurrency(parameters.taxBracket4Limit)}'ye
                            kadar
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-indigo-600">
                            %{(parameters.taxBracket4Rate * 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="p-2.5 font-medium">5. Dilim</TableCell>
                          <TableCell className="p-2.5">
                            {formatCurrency(parameters.taxBracket4Limit)} üzeri
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-indigo-600">
                            %{(parameters.taxBracket5Rate * 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Yasal Oranlar & İstisnalar */}
                <div>
                  <h3 className="mb-3 font-bold text-xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    SGK & Yasal Kesinti Oranları
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        SGK İşçi Payı:
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        %{(parameters.sgkEmployeeRate * 100).toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        İşsizlik İşçi Payı:
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        %
                        {(parameters.unemploymentEmployeeRate * 100).toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        SGK İşveren Payı:
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        %{(parameters.sgkEmployerRate * 100).toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        5510 %5 Hazine Teşviki:
                      </div>
                      <div className="font-bold text-emerald-700">
                        %
                        {(parameters.sgkEmployerDiscount5510Rate * 100).toFixed(
                          1
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        Damga Vergisi Oranı:
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        Binde 7.59
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-zinc-500 dark:text-zinc-400">
                        Günlük Yemek İstisnası:
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(parameters.mealExemptionDaily)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Parametreler yükleniyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE PAYROLL RUN */}
      {showCreateRunModal && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateRunModal(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 text-xs sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-3">
              <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Yeni Aylık Bordro Dönemi Başlat
              </DialogTitle>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form className="space-y-4 text-xs" onSubmit={handleCreateRun}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Yıl
                  </label>
                  <NumberInput
                    max={2035}
                    min={2020}
                    onChange={(val) =>
                      setNewRunForm({ ...newRunForm, year: val })
                    }
                    value={newRunForm.year}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Ay
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setNewRunForm({ ...newRunForm, month: Number(val) })
                    }
                    value={String(newRunForm.month)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ay Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)}>
                          {name} ({idx + 1}. Ay)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Bordro Başlığı (İsteğe Bağlı)
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                  onChange={(e) =>
                    setNewRunForm({ ...newRunForm, title: e.target.value })
                  }
                  placeholder="Örn: Ocak 2026 Bordrosu"
                  type="text"
                  value={newRunForm.title}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Açıklama / Notlar
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                  onChange={(e) =>
                    setNewRunForm({ ...newRunForm, notes: e.target.value })
                  }
                  placeholder="Dönem ile ilgili özel notlar..."
                  rows={2}
                  value={newRunForm.notes}
                />
              </div>

              <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/60 p-3 font-medium text-2xs text-blue-900 dark:text-blue-300 leading-relaxed">
                Bu işlem başlatıldığında şirketteki tüm aktif çalışanların
                kadro, pozisyon ve taban maaş bilgileri otomatik olarak
                kopyalanır ve 30 günlük standart puantaj hesabı yapılır.
              </div>

              <div className="flex justify-end gap-2 border-border border-t pt-3">
                <button
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  onClick={() => setShowCreateRunModal(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700"
                  type="submit"
                >
                  Dönemi Oluştur ve Hesapla
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: EDIT EMPLOYEE PUANTAJ */}
      {showEditPuantajModal && editingPuantaj && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setShowEditPuantajModal(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 text-xs sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-3">
              <div>
                <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Puantaj & Ek Kazanç Düzenle
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {editingPuantaj.employeeName}
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form className="space-y-4 text-xs" onSubmit={handleSavePuantaj}>
              {/* Base Salary & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Taban Maaş (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          baseSalary: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={100}
                    value={editingPuantaj.form.baseSalary}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                    Sözleşme Tipi
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          contractSalaryType: val,
                        },
                      })
                    }
                    value={editingPuantaj.form.contractSalaryType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gross">Brüt Sözleşme</SelectItem>
                      <SelectItem value="Net">Net Sözleşme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Days breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Çalışılan Gün
                  </label>
                  <NumberInput
                    max={31}
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          workedDays: val,
                        },
                      })
                    }
                    step={0.5}
                    suffix="gün"
                    value={editingPuantaj.form.workedDays}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Ücretsiz İzin
                  </label>
                  <NumberInput
                    max={31}
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          unpaidLeaveDays: val,
                        },
                      })
                    }
                    step={0.5}
                    suffix="gün"
                    value={editingPuantaj.form.unpaidLeaveDays}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Rapor / Hastalık
                  </label>
                  <NumberInput
                    max={31}
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          sickLeaveDays: val,
                        },
                      })
                    }
                    step={0.5}
                    suffix="gün"
                    value={editingPuantaj.form.sickLeaveDays}
                  />
                </div>
              </div>

              {/* Overtime and Extras */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Fazla Mesai (Saat)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          overtimeHours: val,
                        },
                      })
                    }
                    step={0.5}
                    suffix="saat"
                    value={editingPuantaj.form.overtimeHours}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Prim / İkramiye (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          bonusGross: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={100}
                    value={editingPuantaj.form.bonusGross}
                  />
                </div>
              </div>

              {/* Meal & Travel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Yemek Yardımı (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          mealAllowanceGross: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={50}
                    value={editingPuantaj.form.mealAllowanceGross}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Yol Yardımı (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          travelAllowanceGross: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={50}
                    value={editingPuantaj.form.travelAllowanceGross}
                  />
                </div>
              </div>

              {/* Deductions: Icra, Advance */}
              <div className="grid grid-cols-2 gap-3 border-border border-t pt-3">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    İcra Kesintisi (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          icraDeduction: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={50}
                    value={editingPuantaj.form.icraDeduction}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                    Avans Mahsubu (₺)
                  </label>
                  <NumberInput
                    min={0}
                    onChange={(val) =>
                      setEditingPuantaj({
                        ...editingPuantaj,
                        form: {
                          ...editingPuantaj.form,
                          advanceDeduction: val,
                        },
                      })
                    }
                    prefix="₺"
                    step={50}
                    value={editingPuantaj.form.advanceDeduction}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  checked={editingPuantaj.form.hasBes}
                  className="rounded border-border text-blue-600 focus:ring-0"
                  id="hasBesEdit"
                  onChange={(e) =>
                    setEditingPuantaj({
                      ...editingPuantaj,
                      form: {
                        ...editingPuantaj.form,
                        hasBes: e.target.checked,
                      },
                    })
                  }
                  type="checkbox"
                />
                <label
                  className="cursor-pointer font-semibold text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="hasBesEdit"
                >
                  Otomatik BES (%3) kesintisi uygulansın
                </label>
              </div>

              <div className="flex justify-end gap-2 border-border border-t pt-3">
                <button
                  className="rounded-xl border border-border px-4 py-2 font-semibold text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                  onClick={() => setShowEditPuantajModal(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700"
                  type="submit"
                >
                  Kaydet ve Yeniden Hesapla
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* GLOBAL CONFIRM DIALOG */}
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
