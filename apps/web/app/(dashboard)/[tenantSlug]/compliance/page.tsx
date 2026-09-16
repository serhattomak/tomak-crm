"use client";

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
  AlertOctagon,
  AlertTriangle,
  Banknote,
  Check,
  Edit,
  FileCheck,
  Lock,
  Play,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Unlock,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type ComplianceRuleDto,
  type ComplianceScoreResultDto,
  type ComplianceValidationResultDto,
  type ComplianceViolationDto,
} from "@/lib/api-client";

const clampCount = (val: number, min: number, max: number): number => {
  if (Number.isNaN(val)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(val)));
};

export default function CompliancePage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<
    "rules" | "violations" | "simulator"
  >("rules");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [scoreData, setScoreData] = useState<ComplianceScoreResultDto | null>(
    null
  );
  const [rules, setRules] = useState<ComplianceRuleDto[]>([]);
  const [violations, setViolations] = useState<ComplianceViolationDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Rule Drawer State
  const [editingRule, setEditingRule] = useState<ComplianceRuleDto | null>(
    null
  );
  const [editEnforcement, setEditEnforcement] = useState<string>("SoftWarning");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editThresholdJson, setEditThresholdJson] = useState<string>("{}");
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Override Violation Modal State
  const [overridingViolation, setOverridingViolation] =
    useState<ComplianceViolationDto | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Simulator State
  const [simulatorMode, setSimulatorMode] = useState<"shift" | "leave">(
    "shift"
  );
  const [simEmployeeName, setSimEmployeeName] =
    useState<string>("Ahmet Yılmaz");
  const [simShiftStart, setSimShiftStart] =
    useState<string>("2026-08-24T08:00");
  const [simShiftEnd, setSimShiftEnd] = useState<string>("2026-08-24T20:30"); // 12.5h shift
  const [simBreakMinutes, setSimBreakMinutes] = useState<number>(60);
  const [simIsPregnant, setSimIsPregnant] = useState<boolean>(false);
  const [simCurrentWeeklyHours, setSimCurrentWeeklyHours] =
    useState<number>(40);

  const [simLeaveType, setSimLeaveType] = useState<string>("Annual");
  const [simLeaveDays, setSimLeaveDays] = useState<number>(10);
  const [simSeniorityYears, setSimSeniorityYears] = useState<number>(3);
  const [simEmployeeAge, setSimEmployeeAge] = useState<number>(28);

  const [simResult, setSimResult] =
    useState<ComplianceValidationResultDto | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load All Compliance Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scoreRes, rulesRes, violationsRes] = await Promise.all([
        ApiClient.getComplianceScore(tenantSlug),
        ApiClient.getComplianceRules(
          selectedCategory === "all" ? undefined : selectedCategory,
          tenantSlug
        ),
        ApiClient.getComplianceViolations(
          {
            pageSize: 50,
            status: statusFilter === "all" ? undefined : statusFilter,
          },
          tenantSlug
        ),
      ]);

      if (scoreRes.success && scoreRes.data) {
        setScoreData(scoreRes.data);
      }
      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data);
      }
      if (violationsRes.success && violationsRes.data) {
        setViolations(violationsRes.data.items || []);
      }
    } catch {
      toast.error("Mevzuat verileri yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantSlug, selectedCategory, statusFilter]);

  // Open Rule Edit Drawer
  const handleOpenEditRule = (rule: ComplianceRuleDto) => {
    setEditingRule(rule);
    setEditEnforcement(rule.enforcementLevel);
    setEditIsActive(rule.isActive);
    try {
      const parsed = JSON.parse(rule.thresholdConfigJson || "{}");
      setEditThresholdJson(JSON.stringify(parsed, null, 2));
    } catch {
      setEditThresholdJson(rule.thresholdConfigJson || "{}");
    }
  };

  // Save Rule Changes
  const handleSaveRule = async () => {
    if (!editingRule) {
      return;
    }
    setIsSavingRule(true);
    try {
      const res = await ApiClient.updateComplianceRule(
        editingRule.id,
        {
          enforcementLevel: editEnforcement,
          id: editingRule.id,
          isActive: editIsActive,
          thresholdConfigJson: editThresholdJson,
        },
        tenantSlug
      );

      if (res.success && res.data) {
        toast.success(
          "Mevzuat kuralı ve eşik değerleri başarıyla güncellendi."
        );
        setRules((prev) =>
          prev.map((r) => (r.id === editingRule.id ? res.data! : r))
        );
        setEditingRule(null);
        // Refresh score
        ApiClient.getComplianceScore(tenantSlug).then(
          (s) => s.data && setScoreData(s.data)
        );
      } else {
        toast.error(res.message || "Kural güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSavingRule(false);
    }
  };

  // Submit Violation Override
  const handleSubmitOverride = async () => {
    if (!overridingViolation) {
      return;
    }
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      toast.error(
        "Lütfen en az 5 karakterlik geçerli bir onay gerekçesi belirtiniz."
      );
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const res = await ApiClient.overrideComplianceViolation(
        overridingViolation.id,
        overrideReason.trim(),
        tenantSlug
      );

      if (res.success) {
        toast.success(
          "İhlal için yönetici istisnası onaylandı ve denetim kütüğüne kaydedildi."
        );
        setOverridingViolation(null);
        setOverrideReason("");
        loadData();
      } else {
        toast.error(res.message || "İstisna uygulanamadı.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Run Simulator
  const handleRunSimulator = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      if (simulatorMode === "shift") {
        const res = await ApiClient.validateShift(
          {
            breakMinutes: simBreakMinutes,
            currentWeekTotalHours: simCurrentWeeklyHours,
            employeeId: "00000000-0000-0000-0000-000000000001",
            employeeName: simEmployeeName,
            isPregnant: simIsPregnant,
            shiftEnd: simShiftEnd,
            shiftStart: simShiftStart,
          },
          tenantSlug
        );
        if (res.success && res.data) {
          setSimResult(res.data);
        } else {
          toast.error("Simülasyon başarısız.");
        }
      } else {
        const res = await ApiClient.validateLeave(
          {
            age: simEmployeeAge,
            employeeId: "00000000-0000-0000-0000-000000000001",
            employeeName: simEmployeeName,
            leaveType: simLeaveType,
            requestedDays: simLeaveDays,
            seniorityYears: simSeniorityYears,
          },
          tenantSlug
        );
        if (res.success && res.data) {
          setSimResult(res.data);
        } else {
          toast.error("Simülasyon başarısız.");
        }
      }
    } catch {
      toast.error("Simülasyon sırasında hata meydana geldi.");
    } finally {
      setIsSimulating(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return (
          <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700 text-xs">
            <AlertOctagon className="h-3 w-3" /> Kritik Ceza Riski
          </span>
        );
      case "high":
        return (
          <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Yüksek Risk
          </span>
        );
      case "medium":
        return (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Orta Risk
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-border bg-zinc-100 px-2 py-0.5 font-semibold text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Düşük
          </span>
        );
    }
  };

  const getEnforcementBadge = (level: string) => {
    switch (level) {
      case "HardBlock":
        return (
          <span className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 font-bold text-2xs text-white">
            <Lock className="h-3 w-3" /> Engelle (Hard Block)
          </span>
        );
      case "SoftWarning":
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 font-bold text-2xs text-white">
            <AlertTriangle className="h-3 w-3" /> Uyar (Soft Warning)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-md bg-zinc-300 px-2 py-0.5 font-semibold text-2xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            <Unlock className="h-3 w-3" /> Devre Dışı
          </span>
        );
    }
  };

  const filteredRules = rules.filter((r) => {
    if (!searchQuery) {
      return true;
    }
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.lawReference.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header Hero Section */}
      <div className="flex flex-col gap-4 border-border border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 p-2.5 text-white shadow-amber-500/20 shadow-md">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Mevzuat & İş Hukuku Uyum Motoru
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" /> 4857 / 5510 / 6331
                  Uyumlu
                </span>
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Vardiya, izin, bordro ve İSG işlemlerinde Türkiye Cumhuriyeti
                çalışma mevzuatı kuralları ve cezai risk denetimi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 font-semibold text-indigo-700 text-xs shadow-xs transition-all hover:bg-indigo-100"
            onClick={() => setActiveTab("simulator")}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Mevzuat Simülatörü</span>
          </button>
          <button
            className="rounded-xl border border-border p-2 text-zinc-600 shadow-xs hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            onClick={loadData}
            title="Yenile"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Score Card */}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div>
            <span className="mb-1 block font-bold text-2xs text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              UYUM SAĞLIK SKORU
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-3xl text-zinc-900 dark:text-zinc-100">
                %{scoreData?.healthScore ?? 100}
              </span>
            </div>
            <span className="mt-1 flex items-center gap-1 font-semibold text-emerald-600 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Yasal Güvencede
            </span>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-14 w-14 -rotate-90 transform">
              <circle
                className="text-zinc-200 dark:text-zinc-800"
                cx="28"
                cy="28"
                fill="transparent"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
              />
              <circle
                className="text-emerald-500 transition-all duration-150"
                cx="28"
                cy="28"
                fill="transparent"
                r="22"
                stroke="currentColor"
                strokeDasharray={138}
                strokeDashoffset={
                  138 - (138 * (scoreData?.healthScore ?? 100)) / 100
                }
                strokeLinecap="round"
                strokeWidth="5"
              />
            </svg>
            <Scale className="absolute h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Violations Count */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-1 flex items-center justify-between font-semibold text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-2xs text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              AKTİF İHLALLER
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-zinc-900 dark:text-zinc-100">
              {scoreData?.activeViolationsCount ?? 0}
            </span>
            <span className="font-bold text-red-600 text-xs">
              ({scoreData?.hardBlockedAttemptsCount ?? 0} Kritik)
            </span>
          </div>
          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
            Denetime takılan kayıtlar
          </span>
        </div>

        {/* Financial Risk Exposure */}
        <div className="rounded-3xl border border-border bg-gradient-to-br bg-card from-red-50/40 via-white to-amber-50/40 p-5 shadow-xs">
          <div className="mb-1 flex items-center justify-between font-semibold text-red-600 text-xs">
            <span className="font-bold text-2xs text-red-500 uppercase tracking-wider">
              CEZA RİSK MARUZİYETİ
            </span>
            <Banknote className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-2xl text-red-900">
              {(scoreData?.estimatedPenaltyExposureTl ?? 0).toLocaleString(
                "tr-TR"
              )}
            </span>
            <span className="font-bold text-red-600 text-xs">TL</span>
          </div>
          <span className="mt-1 block text-2xs text-zinc-500 dark:text-zinc-400">
            Müfettiş denetimi olası ceza tutarı
          </span>
        </div>

        {/* Overridden Exceptions */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-1 flex items-center justify-between font-semibold text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-2xs text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              ONAYLANAN İSTİSNALAR
            </span>
            <FileCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-blue-600">
              {scoreData?.overriddenViolationsCount ?? 0}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              kayıt
            </span>
          </div>
          <span className="mt-1 block font-medium text-blue-600 text-xs">
            Gerekçeli yönetici onayı
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-2 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
          <button
            className={`rounded-lg px-4 py-2 font-bold text-xs transition-all ${ activeTab === "rules" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
            onClick={() => setActiveTab("rules")}
          >
            Mevzuat Kütüphanesi & Kurallar ({rules.length})
          </button>
          <button
            className={`rounded-lg px-4 py-2 font-bold text-xs transition-all ${ activeTab === "violations" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
            onClick={() => setActiveTab("violations")}
          >
            İhlal & Denetim Günlüğü ({violations.length})
          </button>
          <button
            className={`rounded-lg px-4 py-2 font-bold text-xs transition-all ${ activeTab === "simulator" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
            onClick={() => setActiveTab("simulator")}
          >
            Canlı Mevzuat Simülatörü
          </button>
        </div>

        {activeTab === "rules" && (
          <div className="flex items-center gap-2.5">
            <SelectField
              onChange={(value) => setSelectedCategory(value)}
              options={[
                { label: "Tüm Yasal Alanlar", value: "all" },
                {
                  label: "Çalışma Süreleri & Vardiya (4857 SK.)",
                  value: "WorkingHours",
                },
                {
                  label: "Yıllık & Mazeret İzinleri (4857 SK.)",
                  value: "Leaves",
                },
                {
                  label: "İş Sağlığı & Güvenliği (6331 SK.)",
                  value: "HealthSafety",
                },
                { label: "Bordro & Tazminat (5510 / 1475)", value: "Payroll" },
              ]}
              placeholder="Tüm Yasal Alanlar"
              triggerClassName="w-64"
              value={selectedCategory}
            />

            <div className="relative">
              <input
                className="w-56 rounded-xl border border-border bg-zinc-50 py-1.5 pr-3 pl-8 text-xs focus:border-amber-500 focus:bg-white focus:outline-none dark:bg-zinc-900"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kanun maddesi veya kural ara..."
                type="text"
                value={searchQuery}
              />
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
          </div>
        )}

        {activeTab === "violations" && (
          <div className="flex items-center gap-2.5">
            <SelectField
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: "Tüm Durumlar", value: "all" },
                { label: "Sadece Aktif İhlaller", value: "Active" },
                { label: "Yönetici Onaylı İstisnalar", value: "Overridden" },
              ]}
              placeholder="Tüm Durumlar"
              triggerClassName="w-56"
              value={statusFilter}
            />
          </div>
        )}
      </div>

      {/* 4. Tab 1: Rules & Legal Regulations Library */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-amber-600" />
              <p className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
                Yasal mevzuat kuralları yükleniyor...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredRules.map((rule) => (
                <div
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:border-amber-300"
                  key={rule.id}
                >
                  <div>
                    {/* Header: Law Reference & Risk */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <span className="mb-1 inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-2xs text-amber-800">
                          {rule.lawReference}
                        </span>
                        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                          {rule.name}
                        </h3>
                      </div>
                      {getRiskBadge(rule.penaltyRiskLevel)}
                    </div>

                    <p className="mb-4 text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
                      {rule.description}
                    </p>

                    {/* Penalty Notice Box */}
                    {rule.penaltyDescription && (
                      <div className="mb-4 space-y-1 rounded-2xl border border-border bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                        <span className="flex items-center gap-1 font-bold text-2xs text-zinc-700 dark:text-zinc-300">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Yasal Yaptırım / Ceza Uyarısı:
                        </span>
                        <p className="text-2xs text-zinc-500 leading-normal dark:text-zinc-400">
                          {rule.penaltyDescription}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: Mode & Edit Button */}
                  <div className="flex items-center justify-between border-border border-t pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-2xs text-zinc-400 dark:text-zinc-500">
                        Denetim Modu:
                      </span>
                      {getEnforcementBadge(rule.enforcementLevel)}
                    </div>

                    <button
                      className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 font-semibold text-xs text-zinc-700 transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:text-zinc-300"
                      onClick={() => handleOpenEditRule(rule)}
                    >
                      <Edit className="h-3 w-3" />
                      <span>Eşikleri Düzenle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Violations & Compliance Audit Log */}
      {activeTab === "violations" && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-border border-b bg-zinc-50/50 p-4 dark:bg-zinc-800/30">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Mevzuat İhlal & İstisna Denetim Kütüğü (Audit Trail)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sistem genelinde tespit edilen mevzuat aykırılıkları ve
                onaylanan yönetici istisnaları.
              </p>
            </div>
            <button
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1 font-semibold text-xs text-zinc-600 hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-900"
              onClick={loadData}
            >
              <RefreshCw className="h-3 w-3" />
              <span>Yenile</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <Table className="text-zinc-600 dark:text-zinc-400">
              <TableHeader className="border-border bg-zinc-50 font-bold text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                <TableRow>
                  <TableHead className="px-4 py-3 h-auto">Tarih</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Personel</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Yasal Madde</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Modül</TableHead>
                  <TableHead className="px-4 py-3 h-auto">İhlal Detayı</TableHead>
                  <TableHead className="px-4 py-3 h-auto">Durum</TableHead>
                  <TableHead className="px-4 py-3 text-right h-auto">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                      colSpan={7}
                    >
                      Kayıtlı herhangi bir mevzuat ihlali bulunmuyor. Tüm
                      işlemler yasal sınırlara uygun!
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((v) => (
                    <TableRow
                      className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                      key={v.id}
                    >
                      <TableCell className="whitespace-nowrap px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                        {new Date(v.createdAt).toLocaleDateString("tr-TR")}{" "}
                        {new Date(v.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {v.employeeName}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold font-mono text-2xs text-amber-800">
                          {v.lawReference}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-2xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {v.moduleSource}
                        </span>
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300"
                        title={v.details}
                      >
                        {v.details}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3">
                        {v.status === "Overridden" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-2xs text-blue-700">
                            <FileCheck className="h-3 w-3" /> Onaylandı
                            (İstisna)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-2xs text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Aktif İhlal
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {v.status === "Active" ? (
                          <button
                            className="rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-2xs text-white shadow-2xs hover:bg-amber-700"
                            onClick={() => {
                              setOverridingViolation(v);
                              setOverrideReason("");
                            }}
                          >
                            İstisna Tanımla
                          </button>
                        ) : (
                          <span
                            className="font-mono text-2xs text-zinc-400 dark:text-zinc-500"
                            title={v.overrideReason || ""}
                          >
                            Onaylandı
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Interactive Compliance Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Controls Form */}
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 border-border border-b pb-3">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <Play className="h-4 w-4 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Canlı Mevzuat Testi
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Simülasyon tipini ve verilerini girin
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                className={`rounded-lg py-1.5 font-bold text-xs transition-all ${ simulatorMode === "shift" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
                onClick={() => setSimulatorMode("shift")}
              >
                Vardiya / Çalışma (4857)
              </button>
              <button
                className={`rounded-lg py-1.5 font-bold text-xs transition-all ${ simulatorMode === "leave" ? "bg-card text-zinc-900 shadow-xs dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" }`}
                onClick={() => setSimulatorMode("leave")}
              >
                İzin Hak Ediş (Md. 53)
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Personel Adı
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                  onChange={(e) => setSimEmployeeName(e.target.value)}
                  type="text"
                  value={simEmployeeName}
                />
              </div>

              {simulatorMode === "shift" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Vardiya Giriş
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/50"
                        onChange={(e) => setSimShiftStart(e.target.value)}
                        type="datetime-local"
                        value={simShiftStart}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Vardiya Çıkış
                      </label>
                      <input
                        className="w-full rounded-xl border border-border bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/50"
                        onChange={(e) => setSimShiftEnd(e.target.value)}
                        type="datetime-local"
                        value={simShiftEnd}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Ara Dinlenme (Dk)
                      </label>
                      <NumberInput
                        max={480}
                        min={0}
                        onChange={(val) =>
                          setSimBreakMinutes(clampCount(val, 0, 480))
                        }
                        precision={0}
                        showStepper
                        step={5}
                        value={simBreakMinutes}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Haftalık Mevcut Süre (Saat)
                      </label>
                      <NumberInput
                        max={168}
                        min={0}
                        onChange={(val) =>
                          setSimCurrentWeeklyHours(clampCount(val, 0, 168))
                        }
                        precision={0}
                        showStepper
                        value={simCurrentWeeklyHours}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      checked={simIsPregnant}
                      className="rounded border-border text-amber-600"
                      id="simPregnant"
                      onChange={(e) => setSimIsPregnant(e.target.checked)}
                      type="checkbox"
                    />
                    <label
                      className="cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300"
                      htmlFor="simPregnant"
                    >
                      Gebe veya Emziren Çalışan
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                      İzin Tipi
                    </label>
                    <SelectField
                      onChange={(value) => setSimLeaveType(value)}
                      options={[
                        {
                          label: "Yıllık Ücretli İzin (Md. 53)",
                          value: "Annual",
                        },
                        {
                          label: "Evlilik İzni (3 gün - Ek Md. 2)",
                          value: "Evlilik",
                        },
                        {
                          label: "Babalık İzni (5 gün - Ek Md. 2)",
                          value: "Babalık",
                        },
                      ]}
                      placeholder="İzin tipi seçiniz"
                      value={simLeaveType}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Talep Gün
                      </label>
                      <NumberInput
                        max={365}
                        min={1}
                        onChange={(val) =>
                          setSimLeaveDays(clampCount(val, 1, 365))
                        }
                        precision={0}
                        showStepper
                        value={simLeaveDays}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Kıdem (Yıl)
                      </label>
                      <NumberInput
                        max={60}
                        min={0}
                        onChange={(val) =>
                          setSimSeniorityYears(clampCount(val, 0, 60))
                        }
                        precision={0}
                        showStepper
                        value={simSeniorityYears}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                        Yaş
                      </label>
                      <NumberInput
                        max={120}
                        min={0}
                        onChange={(val) =>
                          setSimEmployeeAge(clampCount(val, 0, 120))
                        }
                        precision={0}
                        showStepper
                        value={simEmployeeAge}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 py-2.5 font-bold text-white text-xs shadow-amber-600/20 shadow-md transition-all hover:from-amber-700 hover:to-red-700"
                disabled={isSimulating}
                onClick={handleRunSimulator}
              >
                {isSimulating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>Mevzuata Karşı Doğrula</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs md:col-span-2">
            <div>
              <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Doğrulama Sonuç Raporu
                </h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Gerçek zamanlı kural denetimi
                </span>
              </div>

              {simResult ? (
                simResult.isCompliant ? (
                  <div className="zoom-in-95 animate-in space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-emerald-500/30 shadow-md">
                      <Check className="h-6 w-6 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-emerald-900">
                        Tam Yasal Uyum Sağlandı
                      </h4>
                      <p className="mx-auto mt-1 max-w-md text-emerald-700 text-xs">
                        Bu işlem Türkiye Cumhuriyeti çalışma mevzuatı (4857
                        Sayılı İş Kanunu, 5510 SGK ve 6331 İSG) kurallarına ve
                        yasal sınırlara tam uyumludur.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="zoom-in-95 animate-in space-y-3">
                    <div
                      className={`rounded-2xl border p-4 ${
                        simResult.hasHardBlock
                          ? "border-red-200 bg-red-50 text-red-900"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 font-bold text-sm">
                        {simResult.hasHardBlock ? (
                          <AlertOctagon className="h-5 w-5 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        )}
                        <span>
                          {simResult.hasHardBlock
                            ? "Kritik Yasal Engel (Hard Block) Tespit Edildi!"
                            : "Mevzuat Uyarıları (Soft Warning)"}
                        </span>
                      </div>
                      <p className="text-xs opacity-90">
                        İşlemin kaydedilmesi durumunda aşağıdaki yasal maddeler
                        ihlal edilmiş olacaktır:
                      </p>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {simResult.violations.map((v, idx) => (
                        <div
                          className="space-y-1.5 rounded-2xl border border-border bg-zinc-50 p-3.5 dark:bg-zinc-800/50"
                          key={idx}
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 font-bold text-2xs text-amber-800">
                              {v.lawReference}
                            </span>
                            {getEnforcementBadge(v.enforcementLevel)}
                          </div>
                          <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {v.ruleName}
                          </h5>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {v.details}
                          </p>
                          {v.penaltyRisk && (
                            <div className="rounded-lg border border-red-100 bg-card p-2 font-semibold text-2xs text-red-600">
                              🚨 Ceza Riski: {v.penaltyRisk}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2 py-16 text-center text-zinc-400 dark:text-zinc-500">
                  <Scale className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="font-semibold text-xs">
                    Doğrulama sonucunu görüntülemek için sol paneldeki
                    parametreleri belirleyip butona tıklayın.
                  </p>
                </div>
              )}
            </div>

            <div className="border-border border-t pt-4 text-2xs text-zinc-400 dark:text-zinc-500">
              * Doğrulama motoru 4857 Sayılı Kanun ve alt yönetmelikler
              çerçevesinde hesaplama yapmaktadır.
            </div>
          </div>
        </div>
      )}

      {/* 7. Rule Edit Drawer Modal */}
      {editingRule && (
        <Sheet
          onOpenChange={(open) => {
            if (!open) {
              setEditingRule(null);
            }
          }}
          open
        >
          <SheetContent
            aria-describedby={undefined}
            className="data-[side=right]:w-full max-w-lg justify-between overflow-y-auto p-6 data-[side=right]:sm:max-w-lg"
            side="right"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-border border-b pb-3">
                <div>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-2xs text-amber-800">
                    {editingRule.lawReference}
                  </span>
                  <SheetTitle className="mt-1 font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {editingRule.name}
                  </SheetTitle>
                </div>
                <SheetClose asChild>
                  <button
                    className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
                {editingRule.description}
              </p>

              {/* Enforcement Level Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  Denetim Modu
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-all ${ editEnforcement === "HardBlock" ? "border-red-500 bg-red-50/50" : "border-border hover:border-zinc-300" }`}
                    onClick={() => setEditEnforcement("HardBlock")}
                  >
                    <input
                      checked={editEnforcement === "HardBlock"}
                      className="mt-0.5 text-red-600"
                      name="enforcement"
                      onChange={() => setEditEnforcement("HardBlock")}
                      type="radio"
                    />
                    <div>
                      <span className="block font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Engelle (Hard Block - Kesin Yasak)
                      </span>
                      <span className="text-2xs text-zinc-500 dark:text-zinc-400">
                        Kural ihlal edildiğinde işlemin kaydedilmesini
                        kesinlikle engeller.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-all ${ editEnforcement === "SoftWarning" ? "border-amber-500 bg-amber-50/50" : "border-border hover:border-zinc-300" }`}
                    onClick={() => setEditEnforcement("SoftWarning")}
                  >
                    <input
                      checked={editEnforcement === "SoftWarning"}
                      className="mt-0.5 text-amber-600"
                      name="enforcement"
                      onChange={() => setEditEnforcement("SoftWarning")}
                      type="radio"
                    />
                    <div>
                      <span className="block font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Uyar (Soft Warning - Yönetici İstisnasıyla Geçilebilir)
                      </span>
                      <span className="text-2xs text-zinc-500 dark:text-zinc-400">
                        Uyarı verir, ihlal loguna kaydeder ancak yönetici
                        onayına izin verir.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-all ${ editEnforcement === "Disabled" ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800" : "border-border hover:border-zinc-300" }`}
                    onClick={() => setEditEnforcement("Disabled")}
                  >
                    <input
                      checked={editEnforcement === "Disabled"}
                      className="mt-0.5 text-zinc-600 dark:text-zinc-400"
                      name="enforcement"
                      onChange={() => setEditEnforcement("Disabled")}
                      type="radio"
                    />
                    <div>
                      <span className="block font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Devre Dışı (Disabled)
                      </span>
                      <span className="text-2xs text-zinc-500 dark:text-zinc-400">
                        Bu kural için denetim yapılmaz.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Threshold Config Editor */}
              <div className="space-y-1.5 pt-2">
                <label className="block flex items-center justify-between font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  <span>Parametrik Eşik Değerleri (JSON)</span>
                  <span className="font-normal text-3xs text-zinc-400 dark:text-zinc-500">
                    İşçi lehine esnetilebilir
                  </span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-zinc-950 p-3 font-mono text-emerald-400 text-xs focus:border-amber-500 focus:outline-none"
                  onChange={(e) => setEditThresholdJson(e.target.value)}
                  rows={6}
                  value={editThresholdJson}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-border border-t pt-4">
              <button
                className="rounded-xl px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => setEditingRule(null)}
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white text-xs shadow-xs hover:bg-amber-700 disabled:opacity-50"
                disabled={isSavingRule}
                onClick={handleSaveRule}
              >
                {isSavingRule ? "Kaydediliyor..." : "Ayarları Kaydet"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* 8. Override Violation Modal */}
      {overridingViolation && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setOverridingViolation(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Yönetici İstisnası & Onay
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {overridingViolation.lawReference}
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 text-xs">
              <span className="block font-bold">
                İhlal Edilen Kural: {overridingViolation.details}
              </span>
              <p className="text-2xs opacity-90">
                Personel: <strong>{overridingViolation.employeeName}</strong> (
                {overridingViolation.moduleSource} modülü)
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                Onay Gerekçesi (Zorunlu)
              </label>
              <textarea
                className="w-full rounded-xl border border-border bg-zinc-50 p-3 focus:border-amber-500 focus:bg-white focus:outline-none dark:bg-zinc-900"
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Örn: Acil operasyonel gereklilik nedeniyle çalışan rızası alınarak fazla mesaiye onay verilmiştir."
                rows={3}
                value={overrideReason}
              />
              <span className="block text-3xs text-zinc-400 dark:text-zinc-500">
                * Bu gerekçe ve kullanıcı kimliğiniz denetim günlüğüne (audit
                log) silinmez şekilde işlenecektir.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                className="rounded-xl bg-zinc-100 px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                onClick={() => setOverridingViolation(null)}
              >
                İptal
              </button>
              <button
                className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white text-xs shadow-xs hover:bg-amber-700 disabled:opacity-50"
                disabled={isSubmittingOverride}
                onClick={handleSubmitOverride}
              >
                {isSubmittingOverride
                  ? "Kaydediliyor..."
                  : "Gerekçeyi Onayla ve İstisna Tanımla"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
