"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Banknote,
  Activity,
  SlidersHorizontal,
  Search,
  RefreshCw,
  Edit,
  Check,
  X,
  Play,
  ArrowRight,
  Info,
  ShieldAlert,
  FileCheck,
  UserCheck,
  Building2,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  ApiClient,
  ComplianceScoreResultDto,
  ComplianceRuleDto,
  ComplianceViolationDto,
  ComplianceValidationResultDto,
} from "@/lib/api-client";
import { toast } from "sonner";

export default function CompliancePage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<"rules" | "violations" | "simulator">("rules");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [scoreData, setScoreData] = useState<ComplianceScoreResultDto | null>(null);
  const [rules, setRules] = useState<ComplianceRuleDto[]>([]);
  const [violations, setViolations] = useState<ComplianceViolationDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Rule Drawer State
  const [editingRule, setEditingRule] = useState<ComplianceRuleDto | null>(null);
  const [editEnforcement, setEditEnforcement] = useState<string>("SoftWarning");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editThresholdJson, setEditThresholdJson] = useState<string>("{}");
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Override Violation Modal State
  const [overridingViolation, setOverridingViolation] = useState<ComplianceViolationDto | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Simulator State
  const [simulatorMode, setSimulatorMode] = useState<"shift" | "leave">("shift");
  const [simEmployeeName, setSimEmployeeName] = useState<string>("Ahmet Yılmaz");
  const [simShiftStart, setSimShiftStart] = useState<string>("2026-08-24T08:00");
  const [simShiftEnd, setSimShiftEnd] = useState<string>("2026-08-24T20:30"); // 12.5h shift
  const [simBreakMinutes, setSimBreakMinutes] = useState<number>(60);
  const [simIsPregnant, setSimIsPregnant] = useState<boolean>(false);
  const [simCurrentWeeklyHours, setSimCurrentWeeklyHours] = useState<number>(40);

  const [simLeaveType, setSimLeaveType] = useState<string>("Annual");
  const [simLeaveDays, setSimLeaveDays] = useState<number>(10);
  const [simSeniorityYears, setSimSeniorityYears] = useState<number>(3);
  const [simEmployeeAge, setSimEmployeeAge] = useState<number>(28);

  const [simResult, setSimResult] = useState<ComplianceValidationResultDto | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load All Compliance Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scoreRes, rulesRes, violationsRes] = await Promise.all([
        ApiClient.getComplianceScore(tenantSlug),
        ApiClient.getComplianceRules(
          selectedCategory !== "all" ? selectedCategory : undefined,
          tenantSlug
        ),
        ApiClient.getComplianceViolations(
          {
            status: statusFilter !== "all" ? statusFilter : undefined,
            pageSize: 50,
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
    if (!editingRule) return;
    setIsSavingRule(true);
    try {
      const res = await ApiClient.updateComplianceRule(
        editingRule.id,
        {
          id: editingRule.id,
          enforcementLevel: editEnforcement,
          isActive: editIsActive,
          thresholdConfigJson: editThresholdJson,
        },
        tenantSlug
      );

      if (res.success && res.data) {
        toast.success("Mevzuat kuralı ve eşik değerleri başarıyla güncellendi.");
        setRules((prev) =>
          prev.map((r) => (r.id === editingRule.id ? res.data! : r))
        );
        setEditingRule(null);
        // Refresh score
        ApiClient.getComplianceScore(tenantSlug).then((s) => s.data && setScoreData(s.data));
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
    if (!overridingViolation) return;
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      toast.error("Lütfen en az 5 karakterlik geçerli bir onay gerekçesi belirtiniz.");
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
        toast.success("İhlal için yönetici istisnası onaylandı ve denetim kütüğüne kaydedildi.");
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
            employeeId: "00000000-0000-0000-0000-000000000001",
            employeeName: simEmployeeName,
            shiftStart: simShiftStart,
            shiftEnd: simShiftEnd,
            breakMinutes: simBreakMinutes,
            currentWeekTotalHours: simCurrentWeeklyHours,
            isPregnant: simIsPregnant,
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
            employeeId: "00000000-0000-0000-0000-000000000001",
            employeeName: simEmployeeName,
            leaveType: simLeaveType,
            requestedDays: simLeaveDays,
            seniorityYears: simSeniorityYears,
            age: simEmployeeAge,
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
        return <span className="bg-red-50 text-red-700 border-red-200 border px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><AlertOctagon className="h-3 w-3" /> Kritik Ceza Riski</span>;
      case "high":
        return <span className="bg-amber-50 text-amber-700 border-amber-200 border px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Yüksek Risk</span>;
      case "medium":
        return <span className="bg-blue-50 text-blue-700 border-blue-200 border px-2 py-0.5 rounded-full text-xs font-semibold">Orta Risk</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border-slate-200 border px-2 py-0.5 rounded-full text-xs font-semibold">Düşük</span>;
    }
  };

  const getEnforcementBadge = (level: string) => {
    switch (level) {
      case "HardBlock":
        return <span className="bg-red-600 text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1"><Lock className="h-3 w-3" /> Engelle (Hard Block)</span>;
      case "SoftWarning":
        return <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Uyar (Soft Warning)</span>;
      default:
        return <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1"><Unlock className="h-3 w-3" /> Devre Dışı</span>;
    }
  };

  const filteredRules = rules.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.lawReference.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* 1. Header Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-red-600 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Mevzuat & İş Hukuku Uyum Motoru
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> 4857 / 5510 / 6331 Uyumlu
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Vardiya, izin, bordro ve İSG işlemlerinde Türkiye Cumhuriyeti çalışma mevzuatı kuralları ve cezai risk denetimi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab("simulator")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition-all shadow-xs"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Mevzuat Simülatörü</span>
          </button>
          <button
            onClick={loadData}
            title="Yenile"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              UYUM SAĞLIK SKORU
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900">
                %{scoreData?.healthScore ?? 100}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Yasal Güvencede
            </span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-100"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * (scoreData?.healthScore ?? 100)) / 100}
                className="text-emerald-500 transition-all duration-1000"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <Scale className="h-5 w-5 text-emerald-600 absolute" />
          </div>
        </div>

        {/* Violations Count */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              AKTİF İHLALLER
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {scoreData?.activeViolationsCount ?? 0}
            </span>
            <span className="text-xs text-red-600 font-bold">
              ({scoreData?.hardBlockedAttemptsCount ?? 0} Kritik)
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Denetime takılan kayıtlar
          </span>
        </div>

        {/* Financial Risk Exposure */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs bg-gradient-to-br from-red-50/40 via-white to-amber-50/40">
          <div className="flex items-center justify-between text-red-600 text-xs font-semibold mb-1">
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
              CEZA RİSK MARUZİYETİ
            </span>
            <Banknote className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-red-900">
              {(scoreData?.estimatedPenaltyExposureTl ?? 0).toLocaleString("tr-TR")}
            </span>
            <span className="text-xs text-red-600 font-bold">TL</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Müfettiş denetimi olası ceza tutarı
          </span>
        </div>

        {/* Overridden Exceptions */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ONAYLANAN İSTİSNALAR
            </span>
            <FileCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">
              {scoreData?.overriddenViolationsCount ?? 0}
            </span>
            <span className="text-xs text-slate-400">kayıt</span>
          </div>
          <span className="text-xs text-blue-600 font-medium mt-1 block">
            Gerekçeli yönetici onayı
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "rules"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mevzuat Kütüphanesi & Kurallar ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab("violations")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "violations"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            İhlal & Denetim Günlüğü ({violations.length})
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "simulator"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Canlı Mevzuat Simülatörü
          </button>
        </div>

        {activeTab === "rules" && (
          <div className="flex items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
            >
              <option value="all">Tüm Yasal Alanlar</option>
              <option value="WorkingHours">Çalışma Süreleri & Vardiya (4857 SK.)</option>
              <option value="Leaves">Yıllık & Mazeret İzinleri (4857 SK.)</option>
              <option value="HealthSafety">İş Sağlığı & Güvenliği (6331 SK.)</option>
              <option value="Payroll">Bordro & Tazminat (5510 / 1475)</option>
            </select>

            <div className="relative">
              <input
                type="text"
                placeholder="Kanun maddesi veya kural ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        )}

        {activeTab === "violations" && (
          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="Active">Sadece Aktif İhlaller</option>
              <option value="Overridden">Yönetici Onaylı İstisnalar</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Tab 1: Rules & Legal Regulations Library */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <RefreshCw className="h-6 w-6 text-amber-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Yasal mevzuat kuralları yükleniyor...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Law Reference & Risk */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mb-1">
                          {rule.lawReference}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{rule.name}</h3>
                      </div>
                      {getRiskBadge(rule.penaltyRiskLevel)}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {rule.description}
                    </p>

                    {/* Penalty Notice Box */}
                    {rule.penaltyDescription && (
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4 text-xs text-slate-600 space-y-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Yasal Yaptırım / Ceza Uyarısı:
                        </span>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          {rule.penaltyDescription}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: Mode & Edit Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-medium">Denetim Modu:</span>
                      {getEnforcementBadge(rule.enforcementLevel)}
                    </div>

                    <button
                      onClick={() => handleOpenEditRule(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-semibold text-xs transition-all"
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
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Mevzuat İhlal & İstisna Denetim Kütüğü (Audit Trail)</h3>
              <p className="text-xs text-slate-500">
                Sistem genelinde tespit edilen mevzuat aykırılıkları ve onaylanan yönetici istisnaları.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Yenile</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-4">Yasal Madde</th>
                  <th className="py-3 px-4">Modül</th>
                  <th className="py-3 px-4">İhlal Detayı</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Kayıtlı herhangi bir mevzuat ihlali bulunmuyor. Tüm işlemler yasal sınırlara uygun!
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500">
                        {new Date(v.createdAt).toLocaleDateString("tr-TR")}{" "}
                        {new Date(v.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {v.employeeName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                          {v.lawReference}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {v.moduleSource}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium" title={v.details}>
                        {v.details}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {v.status === "Overridden" ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[11px] border border-blue-200">
                            <FileCheck className="h-3 w-3" /> Onaylandı (İstisna)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold text-[11px] border border-red-200">
                            <AlertTriangle className="h-3 w-3" /> Aktif İhlal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {v.status === "Active" ? (
                          <button
                            onClick={() => {
                              setOverridingViolation(v);
                              setOverrideReason("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs"
                          >
                            İstisna Tanımla
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono" title={v.overrideReason || ""}>
                            Onaylandı
                          </span>
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

      {/* 6. Tab 3: Interactive Compliance Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Play className="h-4 w-4 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Canlı Mevzuat Testi</h3>
                <p className="text-xs text-slate-500">Simülasyon tipini ve verilerini girin</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSimulatorMode("shift")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  simulatorMode === "shift"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Vardiya / Çalışma (4857)
              </button>
              <button
                onClick={() => setSimulatorMode("leave")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  simulatorMode === "leave"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                İzin Hak Ediş (Md. 53)
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Personel Adı</label>
                <input
                  type="text"
                  value={simEmployeeName}
                  onChange={(e) => setSimEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              {simulatorMode === "shift" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Vardiya Giriş</label>
                      <input
                        type="datetime-local"
                        value={simShiftStart}
                        onChange={(e) => setSimShiftStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Vardiya Çıkış</label>
                      <input
                        type="datetime-local"
                        value={simShiftEnd}
                        onChange={(e) => setSimShiftEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Ara Dinlenme (Dk)</label>
                      <input
                        type="number"
                        value={simBreakMinutes}
                        onChange={(e) => setSimBreakMinutes(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Haftalık Mevcut Süre (Saat)</label>
                      <input
                        type="number"
                        value={simCurrentWeeklyHours}
                        onChange={(e) => setSimCurrentWeeklyHours(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="simPregnant"
                      checked={simIsPregnant}
                      onChange={(e) => setSimIsPregnant(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600"
                    />
                    <label htmlFor="simPregnant" className="text-slate-700 font-semibold cursor-pointer">
                      Gebe veya Emziren Çalışan
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">İzin Tipi</label>
                    <select
                      value={simLeaveType}
                      onChange={(e) => setSimLeaveType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <option value="Annual">Yıllık Ücretli İzin (Md. 53)</option>
                      <option value="Evlilik">Evlilik İzni (3 gün - Ek Md. 2)</option>
                      <option value="Babalık">Babalık İzni (5 gün - Ek Md. 2)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Talep Gün</label>
                      <input
                        type="number"
                        value={simLeaveDays}
                        onChange={(e) => setSimLeaveDays(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kıdem (Yıl)</label>
                      <input
                        type="number"
                        value={simSeniorityYears}
                        onChange={(e) => setSimSeniorityYears(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Yaş</label>
                      <input
                        type="number"
                        value={simEmployeeAge}
                        onChange={(e) => setSimEmployeeAge(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={handleRunSimulator}
                disabled={isSimulating}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {isSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>Mevzuata Karşı Doğrula</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Doğrulama Sonuç Raporu</h3>
                <span className="text-xs text-slate-400">Gerçek zamanlı kural denetimi</span>
              </div>

              {!simResult ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Scale className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">
                    Doğrulama sonucunu görüntülemek için sol paneldeki parametreleri belirleyip butona tıklayın.
                  </p>
                </div>
              ) : simResult.isCompliant ? (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                    <Check className="h-6 w-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-900">Tam Yasal Uyum Sağlandı</h4>
                    <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                      Bu işlem Türkiye Cumhuriyeti çalışma mevzuatı (4857 Sayılı İş Kanunu, 5510 SGK ve 6331 İSG) kurallarına ve yasal sınırlara tam uyumludur.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-in zoom-in-95">
                  <div
                    className={`p-4 rounded-2xl border ${
                      simResult.hasHardBlock
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
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
                      İşlemin kaydedilmesi durumunda aşağıdaki yasal maddeler ihlal edilmiş olacaktır:
                    </p>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {simResult.violations.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                            {v.lawReference}
                          </span>
                          {getEnforcementBadge(v.enforcementLevel)}
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">{v.ruleName}</h5>
                        <p className="text-xs text-slate-600">{v.details}</p>
                        {v.penaltyRisk && (
                          <div className="text-[11px] text-red-600 font-semibold bg-white p-2 rounded-lg border border-red-100">
                            🚨 Ceza Riski: {v.penaltyRisk}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
              * Doğrulama motoru 4857 Sayılı Kanun ve alt yönetmelikler çerçevesinde hesaplama yapmaktadır.
            </div>
          </div>
        </div>
      )}

      {/* 7. Rule Edit Drawer Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between slide-in-from-right animate-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                    {editingRule.lawReference}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{editingRule.name}</h3>
                </div>
                <button
                  onClick={() => setEditingRule(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {editingRule.description}
              </p>

              {/* Enforcement Level Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Denetim Modu</label>
                <div className="space-y-2">
                  <label
                    onClick={() => setEditEnforcement("HardBlock")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      editEnforcement === "HardBlock"
                        ? "border-red-500 bg-red-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="enforcement"
                      checked={editEnforcement === "HardBlock"}
                      onChange={() => setEditEnforcement("HardBlock")}
                      className="mt-0.5 text-red-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        Engelle (Hard Block - Kesin Yasak)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Kural ihlal edildiğinde işlemin kaydedilmesini kesinlikle engeller.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setEditEnforcement("SoftWarning")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      editEnforcement === "SoftWarning"
                        ? "border-amber-500 bg-amber-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="enforcement"
                      checked={editEnforcement === "SoftWarning"}
                      onChange={() => setEditEnforcement("SoftWarning")}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        Uyar (Soft Warning - Yönetici İstisnasıyla Geçilebilir)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Uyarı verir, ihlal loguna kaydeder ancak yönetici onayına izin verir.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setEditEnforcement("Disabled")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      editEnforcement === "Disabled"
                        ? "border-slate-400 bg-slate-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="enforcement"
                      checked={editEnforcement === "Disabled"}
                      onChange={() => setEditEnforcement("Disabled")}
                      className="mt-0.5 text-slate-600"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        Devre Dışı (Disabled)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Bu kural için denetim yapılmaz.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Threshold Config Editor */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Parametrik Eşik Değerleri (JSON)</span>
                  <span className="text-[10px] text-slate-400 font-normal">İşçi lehine esnetilebilir</span>
                </label>
                <textarea
                  rows={6}
                  value={editThresholdJson}
                  onChange={(e) => setEditThresholdJson(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveRule}
                disabled={isSavingRule}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSavingRule ? "Kaydediliyor..." : "Ayarları Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Override Violation Modal */}
      {overridingViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Yönetici İstisnası & Onay</h3>
                  <p className="text-xs text-slate-500">{overridingViolation.lawReference}</p>
                </div>
              </div>
              <button
                onClick={() => setOverridingViolation(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">İhlal Edilen Kural: {overridingViolation.details}</span>
              <p className="text-[11px] opacity-90">
                Personel: <strong>{overridingViolation.employeeName}</strong> ({overridingViolation.moduleSource} modülü)
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Onay Gerekçesi (Zorunlu)
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Örn: Acil operasyonel gereklilik nedeniyle çalışan rızası alınarak fazla mesaiye onay verilmiştir."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 block">
                * Bu gerekçe ve kullanıcı kimliğiniz denetim günlüğüne (audit log) silinmez şekilde işlenecektir.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setOverridingViolation(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleSubmitOverride}
                disabled={isSubmittingOverride}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmittingOverride ? "Kaydediliyor..." : "Gerekçeyi Onayla ve İstisna Tanımla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
