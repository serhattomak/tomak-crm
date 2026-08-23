"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Zap,
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  SlidersHorizontal,
  Bell,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileEdit,
  Layers,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Check,
  X,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react";
import {
  ApiClient,
  WorkflowDetailDto,
  WorkflowConditionGroupDto,
  WorkflowConditionRuleDto,
  WorkflowActionStepDto,
  WorkflowTriggerConfigDto,
  AutomationExecutionResultDto,
} from "@/lib/api-client";
import { toast } from "sonner";

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const workflowId = (params?.workflowId as string) || "";
  const isNew = workflowId === "new";

  const [isLoading, setIsLoading] = useState<boolean>(!isNew);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<"builder" | "executions">("builder");

  // Workflow State
  const [name, setName] = useState<string>("Yeni Otomasyon Akışı");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("Customer");
  const [icon, setIcon] = useState<string>("Zap");
  const [color, setColor] = useState<string>("blue");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [triggerType, setTriggerType] = useState<string>("Customer.Created");
  const [triggerConfig, setTriggerConfig] = useState<WorkflowTriggerConfigDto>({});
  const [conditions, setConditions] = useState<WorkflowConditionGroupDto[]>([
    {
      logicalOperator: "AND",
      rules: [
        {
          field: "tier",
          operator: "equals",
          value: "VIP",
          fieldType: "string",
        },
      ],
    },
  ]);
  const [actions, setActions] = useState<WorkflowActionStepDto[]>([
    {
      id: "act-1",
      type: "notification",
      title: "Hoşgeldin E-Postası Gönder",
      order: 1,
      config: {
        channel: "Email",
        title: "Aramıza Hoş Geldiniz!",
        message: "Sayın {customerName}, özel müşteri programımıza hoş geldiniz.",
      },
    },
  ]);

  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);

  // Simulation Modal State
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<AutomationExecutionResultDto | null>(null);
  const [mockContext, setMockContext] = useState<Record<string, any>>({
    customerName: "Ahmet Yılmaz (Örnek)",
    tier: "VIP",
    totalAmount: 12500,
    status: "Completed",
    priority: "Urgent",
  });

  // Load existing workflow
  useEffect(() => {
    if (!isNew && workflowId) {
      setIsLoading(true);
      ApiClient.getWorkflowById(workflowId, tenantSlug)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data;
            setName(data.name);
            setDescription(data.description || "");
            setCategory(data.category || "General");
            setIcon(data.icon || "Zap");
            setColor(data.color || "blue");
            setIsActive(data.isActive);
            setTriggerType(data.triggerType);
            setTriggerConfig(data.triggerConfig || {});
            setConditions(data.conditions || []);
            setActions(data.actions || []);
            setRecentExecutions(data.recentExecutions || []);
          } else {
            toast.error("Akış detayları bulunamadı.");
            router.push(`/${tenantSlug}/automations`);
          }
        })
        .catch(() => {
          toast.error("Akış yüklenirken hata oluştu.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [workflowId, isNew, tenantSlug, router]);

  // Save or Create Workflow
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Lütfen akış adı giriniz.");
      return;
    }
    if (!triggerType) {
      toast.error("Lütfen bir tetikleyici olay seçiniz.");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const res = await ApiClient.createWorkflow(
          {
            name,
            description,
            category,
            icon,
            color,
            isActive,
            triggerType,
            triggerConfig,
            conditions,
            actions,
          },
          tenantSlug
        );

        if (res.success && res.data) {
          toast.success("Otomasyon akışı başarıyla oluşturuldu!");
          router.push(`/${tenantSlug}/automations/${res.data.id}`);
        } else {
          toast.error(res.message || "Oluşturulamadı.");
        }
      } else {
        const res = await ApiClient.updateWorkflow(
          workflowId,
          {
            id: workflowId,
            name,
            description,
            category,
            icon,
            color,
            isActive,
            triggerType,
            triggerConfig,
            conditions,
            actions,
          },
          tenantSlug
        );

        if (res.success) {
          toast.success("Otomasyon akışı güncellendi!");
        } else {
          toast.error(res.message || "Güncellenemedi.");
        }
      }
    } catch {
      toast.error("Bir hata meydana geldi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Run Simulation
  const handleRunSimulation = async () => {
    if (isNew) {
      toast.info("Simülasyon yapabilmek için önce akışı kaydetmelisiniz.");
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await ApiClient.testWorkflow(
        workflowId,
        {
          id: workflowId,
          entityType: triggerType.split(".")[0],
          mockContext: mockContext,
        },
        tenantSlug
      );

      if (res.success && res.data) {
        setSimulationResult(res.data);
      } else {
        toast.error("Simülasyon başarısız oldu.");
      }
    } catch {
      toast.error("Simülasyon hatası.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Condition Handlers
  const addConditionGroup = () => {
    setConditions((prev) => [
      ...prev,
      {
        logicalOperator: "AND",
        rules: [{ field: "status", operator: "equals", value: "Active", fieldType: "string" }],
      },
    ]);
  };

  const removeConditionGroup = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const addRuleToGroup = (groupIndex: number) => {
    setConditions((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          rules: [
            ...group.rules,
            { field: "totalAmount", operator: "greaterThanOrEqual", value: "1000", fieldType: "number" },
          ],
        };
      })
    );
  };

  const removeRuleFromGroup = (groupIndex: number, ruleIndex: number) => {
    setConditions((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          rules: group.rules.filter((_, r) => r !== ruleIndex),
        };
      })
    );
  };

  const updateRule = (
    groupIndex: number,
    ruleIndex: number,
    field: string,
    val: string
  ) => {
    setConditions((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          rules: group.rules.map((rule, r) => {
            if (r !== ruleIndex) return rule;
            return { ...rule, [field]: val };
          }),
        };
      })
    );
  };

  // Action Handlers
  const addAction = (type: string) => {
    const newId = `act-${Date.now()}`;
    let newAction: WorkflowActionStepDto = {
      id: newId,
      type,
      title: "Yeni Aksiyon",
      order: actions.length + 1,
      config: {},
    };

    switch (type) {
      case "notification":
        newAction.title = "Otomatik Bildirim Gönder";
        newAction.config = {
          channel: "InApp",
          title: "Sistem Bildirimi",
          message: "{customerName} için işlem gerçekleşti.",
        };
        break;
      case "updateRecord":
        newAction.title = "CRM Kaydını Güncelle";
        newAction.config = {
          field: "status",
          value: "Active",
        };
        break;
      case "createRecord":
        newAction.title = "Yeni Takip Görevi Aç";
        newAction.config = {
          entityType: "Task",
          title: "Müşteri Takibi - {customerName}",
        };
        break;
      case "webhook":
        newAction.title = "Harici Webhook Çağrısı (HTTP POST)";
        newAction.config = {
          url: "https://api.ornekwebhook.com/crm/events",
        };
        break;
      case "delay":
        newAction.title = "Zamanlayıcı / Gecikme";
        newAction.delayMinutes = 30;
        newAction.config = {};
        break;
    }

    setActions((prev) => [...prev, newAction]);
  };

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const updateActionConfig = (id: string, key: string, val: any) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          config: {
            ...a.config,
            [key]: val,
          },
        };
      })
    );
  };

  const updateActionTitle = (id: string, val: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, title: val } : a))
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Akış tasarımcısı hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${tenantSlug}/automations`)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 tracking-tight"
                placeholder="Akış Adı..."
              />
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {isNew ? "Taslak" : isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama ekleyin (isteğe bağlı)..."
              className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Switch */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <span className="text-xs font-semibold text-slate-600 px-2">
              {isActive ? "Aktif" : "Pasif"}
            </span>
            <div
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {!isNew && (
            <button
              onClick={() => {
                setIsSimulationOpen(true);
                handleRunSimulation();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium text-xs transition-all shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Simüle Et</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isNew ? "Akışı Kaydet" : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </div>

      {/* 2. Step Flow Canvas */}
      <div className="space-y-6 relative">
        {/* ======================================================== */}
        {/* NODE 1: TETİKLEYİCİ (TRIGGER) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                1
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  TETİKLEYİCİ OLAY (WHEN)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Bu akış hangi olay gerçekleştiğinde başlasın?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 font-medium"
              >
                <option value="Customer">Kategori: Müşteri</option>
                <option value="Sales">Kategori: Satış & Sipariş</option>
                <option value="Support">Kategori: Destek</option>
                <option value="Operations">Kategori: Operasyon</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tetikleyici CRM Olayı
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <optgroup label="Müşteri Olayları">
                  <option value="Customer.Created">👤 Yeni Müşteri Oluşturulduğunda</option>
                  <option value="Customer.Updated">🔄 Müşteri Bilgileri Güncellendiğinde</option>
                </optgroup>
                <optgroup label="Sipariş & Satış Olayları">
                  <option value="Order.Created">🛍️ Yeni Sipariş Alındığında</option>
                  <option value="Order.StatusChanged">📦 Sipariş Durumu Değiştiğinde</option>
                  <option value="Deal.StageChanged">📊 Satış Fırsatı Aşaması Değiştiğinde</option>
                </optgroup>
                <optgroup label="Destek Masası Olayları">
                  <option value="Ticket.Created">🎫 Yeni Destek Bileti Açıldığında</option>
                  <option value="Ticket.SlaBreached">⏱️ SLA Çözüm Süresi Aşıldığında</option>
                </optgroup>
                <optgroup label="Entegrasyon">
                  <option value="Webhook.Inbound">🌐 Gelen Webhook İsteği</option>
                </optgroup>
              </select>
            </div>

            {/* Contextual Filters */}
            {triggerType === "Order.StatusChanged" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hedeflenen Sipariş Durumu
                </label>
                <select
                  value={triggerConfig.targetStatus || "Completed"}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, targetStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="Completed">Tamamlandı (Completed)</option>
                  <option value="Shipped">Kargoya Verildi (Shipped)</option>
                  <option value="Processing">Hazırlanıyor (Processing)</option>
                  <option value="Cancelled">İptal Edildi (Cancelled)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Connector Line 1 */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-0.5 h-8 bg-slate-300" />
        </div>

        {/* ======================================================== */}
        {/* NODE 2: FİLTRE VE KOŞULLAR (IF / CONDITIONS) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl border-2 border-amber-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                2
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  KOŞULLAR & KURALLAR (IF / ONLY IF)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Hangi kriterler sağlandığında aksiyonlar çalışsın?
                </h3>
              </div>
            </div>

            <button
              onClick={addConditionGroup}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Grup Ekle</span>
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-center">
              <p className="text-xs text-amber-800 font-medium">
                Koşul eklenmedi. Tetikleyici gerçekleştiğinde aksiyonlar <strong>her zaman</strong> çalışacaktır.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Kural Grubu {gIdx + 1}:</span>
                      <select
                        value={group.logicalOperator}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConditions((prev) =>
                            prev.map((g, i) => (i === gIdx ? { ...g, logicalOperator: val } : g))
                          );
                        }}
                        className="px-2 py-0.5 rounded-md border border-slate-300 text-xs font-bold bg-white text-blue-600"
                      >
                        <option value="AND">TÜM kurallar sağlansın (VE / AND)</option>
                        <option value="OR">HERHANGİ bir kural sağlansın (VEYA / OR)</option>
                      </select>
                    </div>

                    <button
                      onClick={() => removeConditionGroup(gIdx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Grubu Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Rules list */}
                  <div className="space-y-2">
                    {group.rules.map((rule, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex flex-col md:flex-row items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                      >
                        {/* Field */}
                        <div className="w-full md:w-1/3">
                          <input
                            type="text"
                            value={rule.field}
                            onChange={(e) => updateRule(gIdx, rIdx, "field", e.target.value)}
                            placeholder="Alan adı (tier, totalAmount, status...)"
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                          />
                        </div>

                        {/* Operator */}
                        <div className="w-full md:w-1/3">
                          <select
                            value={rule.operator}
                            onChange={(e) => updateRule(gIdx, rIdx, "operator", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                          >
                            <option value="equals">Eşittir (Equals)</option>
                            <option value="notEquals">Eşit Değildir (!=)</option>
                            <option value="greaterThan">Büyüktür (&gt;)</option>
                            <option value="greaterThanOrEqual">Büyük ya da Eşit (&gt;=)</option>
                            <option value="lessThan">Küçüktür (&lt;)</option>
                            <option value="lessThanOrEqual">Küçük ya da Eşit (&lt;=)</option>
                            <option value="contains">İçerir (Contains)</option>
                            <option value="in">Listede Var (In)</option>
                            <option value="isNotEmpty">Dolu / Boş Değil</option>
                          </select>
                        </div>

                        {/* Value */}
                        <div className="w-full md:w-1/3 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => updateRule(gIdx, rIdx, "value", e.target.value)}
                            placeholder="Değer..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                          />
                          <button
                            onClick={() => removeRuleFromGroup(gIdx, rIdx)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Kuralı Sil"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addRuleToGroup(gIdx)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 pt-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Bu gruba kural ekle</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connector Line 2 */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-0.5 h-8 bg-slate-300" />
        </div>

        {/* ======================================================== */}
        {/* NODE 3: AKSİYON ZİNCİRİ (THEN / ACTIONS) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl border-2 border-emerald-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                3
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  OTOMATİK AKSİYONLAR (THEN / DO THIS)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Sırasıyla yürütülecek işlem adımları
                </h3>
              </div>
            </div>

            {/* Add Action Step dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all">
                <Plus className="h-3.5 w-3.5" />
                <span>Aksiyon Adımı Ekle</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 hidden group-hover:block z-30 space-y-1">
                <button
                  onClick={() => addAction("notification")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <Bell className="h-3.5 w-3.5 text-blue-500" />
                  <span>Bildirim / E-Posta Gönder</span>
                </button>
                <button
                  onClick={() => addAction("createRecord")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                >
                  <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                  <span>Yeni Takip Görevi Aç</span>
                </button>
                <button
                  onClick={() => addAction("updateRecord")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                >
                  <FileEdit className="h-3.5 w-3.5 text-emerald-500" />
                  <span>CRM Kaydını Güncelle</span>
                </button>
                <button
                  onClick={() => addAction("webhook")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2"
                >
                  <Globe className="h-3.5 w-3.5 text-amber-500" />
                  <span>Harici Webhook (HTTP POST)</span>
                </button>
                <button
                  onClick={() => addAction("delay")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Gecikme / Beklet (Delay)</span>
                </button>
              </div>
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">Henüz bir aksiyon adımı eklenmedi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((act, index) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 transition-all shadow-xs relative"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold font-mono">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => updateActionTitle(act.id, e.target.value)}
                        className="font-bold text-slate-900 text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                      />
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {act.type}
                      </span>
                    </div>

                    <button
                      onClick={() => removeAction(act.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Adımı Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Config Fields based on Action Type */}
                  {act.type === "notification" && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kanal</label>
                          <select
                            value={act.config.channel || "InApp"}
                            onChange={(e) => updateActionConfig(act.id, "channel", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                          >
                            <option value="InApp">Sistem İçi Bildirim (In-App)</option>
                            <option value="Email">E-Posta Şablonu</option>
                            <option value="SMS">SMS / WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Başlık</label>
                          <input
                            type="text"
                            value={act.config.title || ""}
                            onChange={(e) => updateActionConfig(act.id, "title", e.target.value)}
                            placeholder="Bildirim başlığı..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Mesaj İçeriği (Değişkenler: {"{customerName}"}, {"{totalAmount}"}, {"{orderNumber}"})
                        </label>
                        <textarea
                          rows={2}
                          value={act.config.message || ""}
                          onChange={(e) => updateActionConfig(act.id, "message", e.target.value)}
                          placeholder="Mesaj metni..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {act.type === "createRecord" && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-600">Görev / Not Başlığı</label>
                      <input
                        type="text"
                        value={act.config.title || ""}
                        onChange={(e) => updateActionConfig(act.id, "title", e.target.value)}
                        placeholder="Örn: VIP Müşteri Takip Araması - {customerName}"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  )}

                  {act.type === "updateRecord" && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Güncellenecek Alan</label>
                        <input
                          type="text"
                          value={act.config.field || "status"}
                          onChange={(e) => updateActionConfig(act.id, "field", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Yeni Değer</label>
                        <input
                          type="text"
                          value={act.config.value || ""}
                          onChange={(e) => updateActionConfig(act.id, "value", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {act.type === "webhook" && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-600">Hedef URL (POST Endpoint)</label>
                      <input
                        type="url"
                        value={act.config.url || ""}
                        onChange={(e) => updateActionConfig(act.id, "url", e.target.value)}
                        placeholder="https://api.hariciservis.com/webhook"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  )}

                  {act.type === "delay" && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs flex items-center gap-3">
                      <label className="text-[11px] font-semibold text-slate-600">Bekleme Süresi (Dakika):</label>
                      <input
                        type="number"
                        value={act.delayMinutes || 15}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setActions((prev) =>
                            prev.map((a) => (a.id === act.id ? { ...a, delayMinutes: val } : a))
                          );
                        }}
                        className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Simulation Modal */}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Akış Simülatörü (Canlı Kural Testi)</h3>
                  <p className="text-xs text-slate-500">
                    Örnek veriyle akışın nasıl tepki vereceğini test edin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mock input editor */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Test Parametreleri</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">customerName</label>
                  <input
                    type="text"
                    value={mockContext.customerName || ""}
                    onChange={(e) => setMockContext({ ...mockContext, customerName: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">tier</label>
                  <input
                    type="text"
                    value={mockContext.tier || ""}
                    onChange={(e) => setMockContext({ ...mockContext, tier: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">totalAmount</label>
                  <input
                    type="number"
                    value={mockContext.totalAmount || 0}
                    onChange={(e) => setMockContext({ ...mockContext, totalAmount: Number(e.target.value) })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold">status</label>
                  <input
                    type="text"
                    value={mockContext.status || ""}
                    onChange={(e) => setMockContext({ ...mockContext, status: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-1.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                {isSimulating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                <span>Yeniden Test Et</span>
              </button>
            </div>

            {/* Results */}
            {simulationResult && (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-2xl border text-xs ${
                    simulationResult.status === "Success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : simulationResult.status === "Skipped"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {simulationResult.status === "Success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : simulationResult.status === "Skipped" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Simülasyon Durumu: {simulationResult.status}</span>
                  </div>
                  <p className="text-[11px] opacity-90">{simulationResult.conditionsSummary}</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 max-h-56 overflow-y-auto">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase">
                    Adım Logları ({simulationResult.stepLogs.length})
                  </span>
                  {simulationResult.stepLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-start justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{log.stepTitle}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{log.message}</div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{log.executionDurationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
