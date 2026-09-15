"use client";

import { Combobox } from "@workspace/ui/components/combobox";
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
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileEdit,
  Globe,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type AutomationExecutionResultDto,
  type WorkflowActionStepDto,
  type WorkflowConditionGroupDto,
  type WorkflowTriggerConfigDto,
} from "@/lib/api-client";

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const workflowId = (params?.workflowId as string) || "";
  const isNew = workflowId === "new";

  const [isLoading, setIsLoading] = useState<boolean>(!isNew);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Workflow State
  const [name, setName] = useState<string>("Yeni Otomasyon Akışı");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("Customer");
  const [icon, setIcon] = useState<string>("Zap");
  const [color, setColor] = useState<string>("blue");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [triggerType, setTriggerType] = useState<string>("Customer.Created");
  const [triggerConfig, setTriggerConfig] = useState<WorkflowTriggerConfigDto>(
    {}
  );
  const [conditions, setConditions] = useState<WorkflowConditionGroupDto[]>([
    {
      logicalOperator: "AND",
      rules: [
        {
          field: "tier",
          fieldType: "string",
          operator: "equals",
          value: "VIP",
        },
      ],
    },
  ]);
  const [actions, setActions] = useState<WorkflowActionStepDto[]>([
    {
      config: {
        channel: "Email",
        message:
          "Sayın {customerName}, özel müşteri programımıza hoş geldiniz.",
        title: "Aramıza Hoş Geldiniz!",
      },
      id: "act-1",
      order: 1,
      title: "Hoşgeldin E-Postası Gönder",
      type: "notification",
    },
  ]);

  // Simulation Modal State
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<AutomationExecutionResultDto | null>(null);
  const [mockContext, setMockContext] = useState<Record<string, unknown>>({
    customerName: "Ahmet Yılmaz (Örnek)",
    priority: "Urgent",
    status: "Completed",
    tier: "VIP",
    totalAmount: 12_500,
  });

  // Load existing workflow
  useEffect(() => {
    if (isNew || !workflowId) {
      return;
    }

    let isMounted = true;
    ApiClient.getWorkflowById(workflowId, tenantSlug)
      .then((res) => {
        if (!isMounted) {
          return;
        }
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
        } else {
          toast.error("Akış detayları bulunamadı.");
          router.push(`/${tenantSlug}/automations`);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Akış yüklenirken hata oluştu.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isNew, workflowId, tenantSlug, router]);

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
            actions,
            category,
            color,
            conditions,
            description,
            icon,
            isActive,
            name,
            triggerConfig,
            triggerType,
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
            actions,
            category,
            color,
            conditions,
            description,
            icon,
            id: workflowId,
            isActive,
            name,
            triggerConfig,
            triggerType,
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
          entityType: triggerType.split(".")[0],
          id: workflowId,
          mockContext,
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
        rules: [
          {
            field: "status",
            fieldType: "string",
            operator: "equals",
            value: "Active",
          },
        ],
      },
    ]);
  };

  const removeConditionGroup = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const addRuleToGroup = (groupIndex: number) => {
    setConditions((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) {
          return group;
        }
        return {
          ...group,
          rules: [
            ...group.rules,
            {
              field: "totalAmount",
              fieldType: "number",
              operator: "greaterThanOrEqual",
              value: "1000",
            },
          ],
        };
      })
    );
  };

  const removeRuleFromGroup = (groupIndex: number, ruleIndex: number) => {
    setConditions((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) {
          return group;
        }
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
        if (i !== groupIndex) {
          return group;
        }
        return {
          ...group,
          rules: group.rules.map((rule, r) => {
            if (r !== ruleIndex) {
              return rule;
            }
            return { ...rule, [field]: val };
          }),
        };
      })
    );
  };

  // Action Handlers
  const addAction = (type: string) => {
    const newId = `act-${Date.now()}`;
    let title = "Yeni Aksiyon";
    let config: Record<string, unknown> = {};
    let delayMinutes: number | undefined;

    switch (type) {
      case "notification":
        title = "Otomatik Bildirim Gönder";
        config = {
          channel: "InApp",
          message: "{customerName} için işlem gerçekleşti.",
          title: "Sistem Bildirimi",
        };
        break;
      case "updateRecord":
        title = "CRM Kaydını Güncelle";
        config = {
          field: "status",
          value: "Active",
        };
        break;
      case "createRecord":
        title = "Yeni Takip Görevi Aç";
        config = {
          entityType: "Task",
          title: "Müşteri Takibi - {customerName}",
        };
        break;
      case "webhook":
        title = "Harici Webhook Çağrısı (HTTP POST)";
        config = {
          url: "https://api.ornekwebhook.com/crm/events",
        };
        break;
      case "delay":
        title = "Zamanlayıcı / Gecikme";
        delayMinutes = 30;
        config = {};
        break;
    }

    const newAction: WorkflowActionStepDto = {
      config,
      delayMinutes,
      id: newId,
      order: actions.length + 1,
      title,
      type,
    };

    setActions((prev) => [...prev, newAction]);
  };

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const updateActionConfig = (id: string, key: string, val: unknown) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id !== id) {
          return a;
        }
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
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="space-y-3 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
            Akış tasarımcısı hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 border-zinc-200 border-b pb-5 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            onClick={() => router.push(`/${tenantSlug}/automations`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                className="border-transparent border-b bg-transparent px-1 py-0.5 font-bold text-xl text-zinc-900 tracking-tight hover:border-zinc-300 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:text-zinc-100"
                onChange={(e) => setName(e.target.value)}
                placeholder="Akış Adı..."
                type="text"
                value={name}
              />
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-400">
                {isNew ? "Taslak" : isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <input
              className="mt-0.5 w-full border-transparent border-b bg-transparent px-1 py-0.5 text-xs text-zinc-500 hover:border-zinc-200 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-400"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama ekleyin (isteğe bağlı)..."
              type="text"
              value={description}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Switch */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <span className="px-2 font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              {isActive ? "Aktif" : "Pasif"}
            </span>
            <div
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isActive ? "bg-emerald-500" : "bg-zinc-300"
              }`}
              onClick={() => setIsActive(!isActive)}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-zinc-900 ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {!isNew && (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 font-medium text-xs text-zinc-700 shadow-xs transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-800 dark:text-zinc-300"
              onClick={() => {
                setIsSimulationOpen(true);
                handleRunSimulation();
              }}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Simüle Et</span>
            </button>
          )}

          <button
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-blue-600/20 shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
            disabled={isSaving}
            onClick={handleSave}
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
      <div className="relative space-y-6">
        {/* ======================================================== */}
        {/* NODE 1: TETİKLEYİCİ (TRIGGER) */}
        {/* ======================================================== */}
        <div className="relative rounded-3xl border-2 border-blue-200 bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white shadow-blue-500/20 shadow-md">
                1
              </div>
              <div>
                <span className="font-bold text-[11px] text-blue-600 uppercase tracking-wider">
                  TETİKLEYİCİ OLAY (WHEN)
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Bu akış hangi olay gerçekleştiğinde başlasın?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SelectField
                onChange={(value) => setCategory(value)}
                options={[
                  { label: "Kategori: Müşteri", value: "Customer" },
                  { label: "Kategori: Satış & Sipariş", value: "Sales" },
                  { label: "Kategori: Destek", value: "Support" },
                  { label: "Kategori: Operasyon", value: "Operations" },
                ]}
                placeholder="Kategori seçiniz..."
                value={category}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div>
              <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Tetikleyici CRM Olayı
              </label>
              <Combobox
                emptyMessage="Tetikleyici bulunamadı."
                onChange={(value) => setTriggerType(value)}
                options={[
                  {
                    description: "Müşteri Olayları",
                    label: "👤 Yeni Müşteri Oluşturulduğunda",
                    value: "Customer.Created",
                  },
                  {
                    description: "Müşteri Olayları",
                    label: "🔄 Müşteri Bilgileri Güncellendiğinde",
                    value: "Customer.Updated",
                  },
                  {
                    description: "Sipariş & Satış Olayları",
                    label: "🛍️ Yeni Sipariş Alındığında",
                    value: "Order.Created",
                  },
                  {
                    description: "Sipariş & Satış Olayları",
                    label: "📦 Sipariş Durumu Değiştiğinde",
                    value: "Order.StatusChanged",
                  },
                  {
                    description: "Sipariş & Satış Olayları",
                    label: "📊 Satış Fırsatı Aşaması Değiştiğinde",
                    value: "Deal.StageChanged",
                  },
                  {
                    description: "Destek Masası Olayları",
                    label: "🎫 Yeni Destek Bileti Açıldığında",
                    value: "Ticket.Created",
                  },
                  {
                    description: "Destek Masası Olayları",
                    label: "⏱️ SLA Çözüm Süresi Aşıldığında",
                    value: "Ticket.SlaBreached",
                  },
                  {
                    description: "Entegrasyon",
                    label: "🌐 Gelen Webhook İsteği",
                    value: "Webhook.Inbound",
                  },
                ]}
                placeholder="Tetikleyici olay seçiniz..."
                searchPlaceholder="Olay ara..."
                value={triggerType}
              />
            </div>

            {/* Contextual Filters */}
            {triggerType === "Order.StatusChanged" && (
              <div>
                <label className="mb-1 block font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                  Hedeflenen Sipariş Durumu
                </label>
                <SelectField
                  onChange={(value) =>
                    setTriggerConfig({
                      ...triggerConfig,
                      targetStatus: value,
                    })
                  }
                  options={[
                    { label: "Tamamlandı (Completed)", value: "Completed" },
                    { label: "Kargoya Verildi (Shipped)", value: "Shipped" },
                    { label: "Hazırlanıyor (Processing)", value: "Processing" },
                    { label: "İptal Edildi (Cancelled)", value: "Cancelled" },
                  ]}
                  placeholder="Durum seçiniz..."
                  value={triggerConfig.targetStatus || "Completed"}
                />
              </div>
            )}
          </div>
        </div>

        {/* Connector Line 1 */}
        <div className="relative z-10 -my-2 flex justify-center">
          <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* ======================================================== */}
        {/* NODE 2: FİLTRE VE KOŞULLAR (IF / CONDITIONS) */}
        {/* ======================================================== */}
        <div className="rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 font-bold text-white shadow-amber-500/20 shadow-md">
                2
              </div>
              <div>
                <span className="font-bold text-[11px] text-amber-600 uppercase tracking-wider">
                  KOŞULLAR & KURALLAR (IF / ONLY IF)
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Hangi kriterler sağlandığında aksiyonlar çalışsın?
                </h3>
              </div>
            </div>

            <button
              className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 text-xs transition-all hover:bg-amber-100"
              onClick={addConditionGroup}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Grup Ekle</span>
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-center">
              <p className="font-medium text-amber-800 text-xs">
                Koşul eklenmedi. Tetikleyici gerçekleştiğinde aksiyonlar{" "}
                <strong>her zaman</strong> çalışacaktır.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((group, gIdx) => (
                <div
                  className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/90 dark:bg-zinc-800/40"
                  key={gIdx}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                        Kural Grubu {gIdx + 1}:
                      </span>
                      <SelectField
                        onChange={(value) => {
                          setConditions((prev) =>
                            prev.map((g, i) =>
                              i === gIdx ? { ...g, logicalOperator: value } : g
                            )
                          );
                        }}
                        options={[
                          {
                            label: "TÜM kurallar sağlansın (VE / AND)",
                            value: "AND",
                          },
                          {
                            label: "HERHANGİ bir kural sağlansın (VEYA / OR)",
                            value: "OR",
                          },
                        ]}
                        placeholder="Mantık seçiniz..."
                        value={group.logicalOperator}
                      />
                    </div>

                    <button
                      className="p-1 text-zinc-400 hover:text-red-600 dark:text-zinc-500"
                      onClick={() => removeConditionGroup(gIdx)}
                      title="Grubu Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Rules list */}
                  <div className="space-y-2">
                    {group.rules.map((rule, rIdx) => (
                      <div
                        className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-2xs md:flex-row dark:border-zinc-800 dark:bg-zinc-900"
                        key={rIdx}
                      >
                        {/* Field */}
                        <div className="w-full md:w-1/3">
                          <input
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900"
                            onChange={(e) =>
                              updateRule(gIdx, rIdx, "field", e.target.value)
                            }
                            placeholder="Alan adı (tier, totalAmount, status...)"
                            type="text"
                            value={rule.field}
                          />
                        </div>

                        {/* Operator */}
                        <div className="w-full md:w-1/3">
                          <Combobox
                            emptyMessage="Operatör bulunamadı."
                            onChange={(value) =>
                              updateRule(gIdx, rIdx, "operator", value)
                            }
                            options={[
                              { label: "Eşittir (Equals)", value: "equals" },
                              {
                                label: "Eşit Değildir (!=)",
                                value: "notEquals",
                              },
                              { label: "Büyüktür (>)", value: "greaterThan" },
                              {
                                label: "Büyük ya da Eşit (>=)",
                                value: "greaterThanOrEqual",
                              },
                              { label: "Küçüktür (<)", value: "lessThan" },
                              {
                                label: "Küçük ya da Eşit (<=)",
                                value: "lessThanOrEqual",
                              },
                              { label: "İçerir (Contains)", value: "contains" },
                              { label: "Listede Var (In)", value: "in" },
                              {
                                label: "Dolu / Boş Değil",
                                value: "isNotEmpty",
                              },
                            ]}
                            placeholder="Operatör seçiniz..."
                            searchPlaceholder="Operatör ara..."
                            value={rule.operator}
                          />
                        </div>

                        {/* Value */}
                        <div className="flex w-full items-center gap-1.5 md:w-1/3">
                          <input
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/50 dark:bg-zinc-900"
                            onChange={(e) =>
                              updateRule(gIdx, rIdx, "value", e.target.value)
                            }
                            placeholder="Değer..."
                            type="text"
                            value={rule.value}
                          />
                          <button
                            className="p-1 text-zinc-400 hover:text-red-600 dark:text-zinc-500"
                            onClick={() => removeRuleFromGroup(gIdx, rIdx)}
                            title="Kuralı Sil"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="flex items-center gap-1 pt-1 font-semibold text-blue-600 text-xs hover:text-blue-800"
                    onClick={() => addRuleToGroup(gIdx)}
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
        <div className="relative z-10 -my-2 flex justify-center">
          <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* ======================================================== */}
        {/* NODE 3: AKSİYON ZİNCİRİ (THEN / ACTIONS) */}
        {/* ======================================================== */}
        <div className="rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 font-bold text-white shadow-emerald-500/20 shadow-md">
                3
              </div>
              <div>
                <span className="font-bold text-[11px] text-emerald-600 uppercase tracking-wider">
                  OTOMATİK AKSİYONLAR (THEN / DO THIS)
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Sırasıyla yürütülecek işlem adımları
                </h3>
              </div>
            </div>

            {/* Add Action Step dropdown */}
            <div className="group relative">
              <button className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-sm transition-all hover:bg-emerald-700">
                <Plus className="h-3.5 w-3.5" />
                <span>Aksiyon Adımı Ekle</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              <div className="absolute right-0 z-30 mt-1 hidden w-56 space-y-1 rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-xl group-hover:block dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-300"
                  onClick={() => addAction("notification")}
                >
                  <Bell className="h-3.5 w-3.5 text-blue-500" />
                  <span>Bildirim / E-Posta Gönder</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-xs text-zinc-700 hover:bg-purple-50 hover:text-purple-700 dark:text-zinc-300"
                  onClick={() => addAction("createRecord")}
                >
                  <UserCheck className="h-3.5 w-3.5 text-purple-500" />
                  <span>Yeni Takip Görevi Aç</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-xs text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300"
                  onClick={() => addAction("updateRecord")}
                >
                  <FileEdit className="h-3.5 w-3.5 text-emerald-500" />
                  <span>CRM Kaydını Güncelle</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-xs text-zinc-700 hover:bg-amber-50 hover:text-amber-700 dark:text-zinc-300"
                  onClick={() => addAction("webhook")}
                >
                  <Globe className="h-3.5 w-3.5 text-amber-500" />
                  <span>Harici Webhook (HTTP POST)</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => addAction("delay")}
                >
                  <Clock className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Gecikme / Beklet (Delay)</span>
                </button>
              </div>
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
              <Layers className="mx-auto mb-2 h-8 w-8 text-zinc-400 dark:text-zinc-500" />
              <p className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                Henüz bir aksiyon adımı eklenmedi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((act, index) => (
                <div
                  className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-300 dark:border-zinc-800/90 dark:bg-zinc-900"
                  key={act.id}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 font-bold font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {index + 1}
                      </span>
                      <input
                        className="border-transparent border-b bg-transparent font-bold text-xs text-zinc-900 hover:border-zinc-300 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:text-zinc-100"
                        onChange={(e) =>
                          updateActionTitle(act.id, e.target.value)
                        }
                        type="text"
                        value={act.title}
                      />
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {act.type}
                      </span>
                    </div>

                    <button
                      className="p-1 text-zinc-400 hover:text-red-600 dark:text-zinc-500"
                      onClick={() => removeAction(act.id)}
                      title="Adımı Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Config Fields based on Action Type */}
                  {act.type === "notification" && (
                    <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                            Kanal
                          </label>
                          <SelectField
                            onChange={(value) =>
                              updateActionConfig(act.id, "channel", value)
                            }
                            options={[
                              {
                                label: "Sistem İçi Bildirim (In-App)",
                                value: "InApp",
                              },
                              { label: "E-Posta Şablonu", value: "Email" },
                              { label: "SMS / WhatsApp", value: "SMS" },
                            ]}
                            placeholder="Kanal seçiniz..."
                            value={(act.config.channel as string) || "InApp"}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                            Başlık
                          </label>
                          <input
                            className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900"
                            onChange={(e) =>
                              updateActionConfig(
                                act.id,
                                "title",
                                e.target.value
                              )
                            }
                            placeholder="Bildirim başlığı..."
                            type="text"
                            value={(act.config.title as string) || ""}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                          Mesaj İçeriği (Değişkenler: {"{customerName}"},{" "}
                          {"{totalAmount}"}, {"{orderNumber}"})
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                          onChange={(e) =>
                            updateActionConfig(
                              act.id,
                              "message",
                              e.target.value
                            )
                          }
                          placeholder="Mesaj metni..."
                          rows={2}
                          value={(act.config.message as string) || ""}
                        />
                      </div>
                    </div>
                  )}

                  {act.type === "createRecord" && (
                    <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                      <label className="block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                        Görev / Not Başlığı
                      </label>
                      <input
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900"
                        onChange={(e) =>
                          updateActionConfig(act.id, "title", e.target.value)
                        }
                        placeholder="Örn: VIP Müşteri Takip Araması - {customerName}"
                        type="text"
                        value={(act.config.title as string) || ""}
                      />
                    </div>
                  )}

                  {act.type === "updateRecord" && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div>
                        <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                          Güncellenecek Alan
                        </label>
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono dark:border-zinc-800 dark:bg-zinc-900"
                          onChange={(e) =>
                            updateActionConfig(act.id, "field", e.target.value)
                          }
                          type="text"
                          value={(act.config.field as string) || "status"}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                          Yeni Değer
                        </label>
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono dark:border-zinc-800 dark:bg-zinc-900"
                          onChange={(e) =>
                            updateActionConfig(act.id, "value", e.target.value)
                          }
                          type="text"
                          value={(act.config.value as string) || ""}
                        />
                      </div>
                    </div>
                  )}

                  {act.type === "webhook" && (
                    <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                      <label className="block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                        Hedef URL (POST Endpoint)
                      </label>
                      <input
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono dark:border-zinc-800 dark:bg-zinc-900"
                        onChange={(e) =>
                          updateActionConfig(act.id, "url", e.target.value)
                        }
                        placeholder="https://api.hariciservis.com/webhook"
                        type="url"
                        value={(act.config.url as string) || ""}
                      />
                    </div>
                  )}

                  {act.type === "delay" && (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/50">
                      <label className="font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                        Bekleme Süresi (Dakika):
                      </label>
                      <NumberInput
                        inputSize="sm"
                        min={0}
                        onChange={(val) => {
                          setActions((prev) =>
                            prev.map((a) =>
                              a.id === act.id ? { ...a, delayMinutes: val } : a
                            )
                          );
                        }}
                        precision={0}
                        showStepper
                        step={5}
                        value={act.delayMinutes ?? 15}
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
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsSimulationOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Akış Simülatörü (Canlı Kural Testi)
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Örnek veriyle akışın nasıl tepki vereceğini test edin.
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

            {/* Mock input editor */}
            <div className="space-y-2 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800/90 dark:bg-zinc-800/50">
              <span className="font-bold text-[11px] text-zinc-500 uppercase dark:text-zinc-400">
                Test Parametreleri
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400">
                    customerName
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
                    onChange={(e) =>
                      setMockContext({
                        ...mockContext,
                        customerName: e.target.value,
                      })
                    }
                    type="text"
                    value={(mockContext.customerName as string) || ""}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400">
                    tier
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
                    onChange={(e) =>
                      setMockContext({ ...mockContext, tier: e.target.value })
                    }
                    type="text"
                    value={(mockContext.tier as string) || ""}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400">
                    totalAmount
                  </label>
                  <NumberInput
                    inputSize="sm"
                    min={0}
                    onChange={(val) =>
                      setMockContext({
                        ...mockContext,
                        totalAmount: val,
                      })
                    }
                    precision={0}
                    showStepper
                    step={100}
                    value={(mockContext.totalAmount as number) ?? 0}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400">
                    status
                  </label>
                  <input
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
                    onChange={(e) =>
                      setMockContext({ ...mockContext, status: e.target.value })
                    }
                    type="text"
                    value={(mockContext.status as string) || ""}
                  />
                </div>
              </div>
              <button
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-1.5 font-semibold text-white text-xs transition-all hover:bg-blue-700"
                disabled={isSimulating}
                onClick={handleRunSimulation}
              >
                {isSimulating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Yeniden Test Et</span>
              </button>
            </div>

            {/* Results */}
            {simulationResult && (
              <div className="space-y-3">
                <div
                  className={`rounded-2xl border p-3.5 text-xs ${
                    simulationResult.status === "Success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : simulationResult.status === "Skipped"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-bold">
                    {simulationResult.status === "Success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : simulationResult.status === "Skipped" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Simülasyon Durumu: {simulationResult.status}</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    {simulationResult.conditionsSummary}
                  </p>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <span className="font-semibold text-[11px] text-zinc-400 uppercase dark:text-zinc-500">
                    Adım Logları ({simulationResult.stepLogs.length})
                  </span>
                  {simulationResult.stepLogs.map((log, idx) => (
                    <div
                      className="flex items-start justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 text-xs dark:border-zinc-800/90 dark:bg-zinc-900"
                      key={idx}
                    >
                      <div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {log.stepTitle}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {log.message}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        {log.executionDurationMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                className="rounded-xl bg-zinc-100 px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                onClick={() => setIsSimulationOpen(false)}
              >
                Kapat
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
