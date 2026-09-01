/* Hallmark · component: quick-actions · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Settings2,
  ShoppingCart,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

export type QuickActionType =
  | "lead"
  | "deal"
  | "task"
  | "proposal"
  | "customer"
  | "order"
  | "meeting"
  | "leave";

interface QuickActionDef {
  actionType: QuickActionType;
  color: string;
  defaultEnabled: boolean;
  description: string;
  icon: any;
  id: string;
  title: string;
}

const ALL_QUICK_ACTIONS: QuickActionDef[] = [
  {
    actionType: "lead",
    color: "from-violet-600 to-indigo-600 text-white",
    defaultEnabled: true,
    description: "Müşteri adayı kaydı oluştur",
    icon: UserPlus,
    id: "lead",
    title: "Yeni Lead Ekle",
  },
  {
    actionType: "deal",
    color: "from-blue-600 to-cyan-600 text-white",
    defaultEnabled: true,
    description: "Pipeline'a yeni anlaşma ekle",
    icon: Briefcase,
    id: "deal",
    title: "Fırsat Başlat",
  },
  {
    actionType: "task",
    color: "from-emerald-600 to-teal-600 text-white",
    defaultEnabled: true,
    description: "Kendine veya ekibe iş ata",
    icon: CheckSquare,
    id: "task",
    title: "Görev Tanımla",
  },
  {
    actionType: "proposal",
    color: "from-fuchsia-600 to-pink-600 text-white",
    defaultEnabled: true,
    description: "PDF şablonuyla teklif oluştur",
    icon: FileSpreadsheet,
    id: "proposal",
    title: "Teklif Hazırla",
  },
  {
    actionType: "customer",
    color: "from-amber-500 to-orange-600 text-white",
    defaultEnabled: false,
    description: "Kurumsal veya bireysel müşteri",
    icon: Users,
    id: "customer",
    title: "Müşteri Kaydet",
  },
  {
    actionType: "order",
    color: "from-indigo-600 to-purple-600 text-white",
    defaultEnabled: false,
    description: "Yeni satış siparişi gir",
    icon: ShoppingCart,
    id: "order",
    title: "Sipariş Oluştur",
  },
  {
    actionType: "meeting",
    color: "from-sky-600 to-blue-600 text-white",
    defaultEnabled: false,
    description: "Müşteri randevusu planla",
    icon: Calendar,
    id: "meeting",
    title: "Görüşme Planla",
  },
  {
    actionType: "leave",
    color: "from-rose-600 to-pink-600 text-white",
    defaultEnabled: false,
    description: "Yıllık veya mazeret izni",
    icon: UserCheck,
    id: "leave",
    title: "İzin Talebi Aç",
  },
];

interface QuickActionsWidgetProps {
  onOpenQuickCreate: (type: QuickActionType) => void;
}

export function QuickActionsWidget({
  onOpenQuickCreate,
}: QuickActionsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [enabledIds, setEnabledIds] = useState<string[]>([
    "lead",
    "deal",
    "task",
    "proposal",
  ]);

  // Load configuration from local storage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(
        "crm_quick_actions_collapsed"
      );
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }

      const savedEnabled = localStorage.getItem("crm_quick_actions_enabled");
      if (savedEnabled) {
        setEnabledIds(JSON.parse(savedEnabled));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("crm_quick_actions_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleAction = (id: string) => {
    setEnabledIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem("crm_quick_actions_enabled", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetDefaults = () => {
    const defaults = ["lead", "deal", "task", "proposal"];
    setEnabledIds(defaults);
    try {
      localStorage.setItem(
        "crm_quick_actions_enabled",
        JSON.stringify(defaults)
      );
    } catch {
      // ignore
    }
  };

  const visibleActions = ALL_QUICK_ACTIONS.filter((act) =>
    enabledIds.includes(act.id)
  );

  return (
    <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-4 text-zinc-900 shadow-2xs transition-all dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-50 text-violet-600 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Hızlı İşlemler & Kısayollar
              </h3>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.2 font-mono text-[9px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                {visibleActions.length} Eylem
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Sık kullanılan CRM eylemlerini tek tıkla başlatın
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-700"
            onClick={() => setIsCustomizeOpen(true)}
            title="Hızlı İşlemleri Özelleştir"
            type="button"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-700"
            onClick={toggleCollapse}
            title={isCollapsed ? "Genişlet" : "Daralt"}
            type="button"
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Action Grid */}
      {!isCollapsed && (
        <div className="fade-in slide-in-from-top-1 mt-3.5 grid animate-in grid-cols-1 gap-2.5 duration-200 sm:grid-cols-2 lg:grid-cols-4">
          {visibleActions.length === 0 ? (
            <div className="col-span-full py-4 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Görüntülenecek hızlı işlem seçilmedi.
              </p>
              <button
                className="mt-1.5 font-bold text-violet-600 text-xs hover:underline dark:text-violet-400"
                onClick={() => setIsCustomizeOpen(true)}
                type="button"
              >
                Hızlı İşlem Ekle
              </button>
            </div>
          ) : (
            visibleActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  className="group flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-left transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-100/80 hover:shadow-2xs active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                  key={act.id}
                  onClick={() => onOpenQuickCreate(act.actionType)}
                  type="button"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${act.color} shadow-2xs`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-zinc-900 transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 dark:hover:text-zinc-100">
                      {act.title}
                    </div>
                    <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                      {act.description}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200 dark:hover:text-zinc-500" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* In-Place Customize Modal */}
      {isCustomizeOpen && (
        <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                  <Settings2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Hızlı İşlemleri Özelleştir
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Dashboard üzerinde görünecek butonları seçin
                  </p>
                </div>
              </div>
              <button
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={() => setIsCustomizeOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {ALL_QUICK_ACTIONS.map((act) => {
                const isSelected = enabledIds.includes(act.id);
                const Icon = act.icon;
                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-violet-200 bg-violet-50/50 shadow-2xs dark:border-violet-800/80 dark:bg-violet-950/40"
                        : "border-zinc-200/80 bg-zinc-50/40 opacity-70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/40"
                    }`}
                    key={act.id}
                    onClick={() => handleToggleAction(act.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${act.color} text-white shadow-2xs`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {act.description}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-zinc-100 border-t pt-3 dark:border-zinc-800">
              <button
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                onClick={handleResetDefaults}
                type="button"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Varsayılanlara Dön</span>
              </button>

              <button
                className="rounded-xl bg-violet-600 px-4 py-1.5 font-bold text-white text-xs shadow-xs hover:bg-violet-700 active:scale-95"
                onClick={() => setIsCustomizeOpen(false)}
                type="button"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
