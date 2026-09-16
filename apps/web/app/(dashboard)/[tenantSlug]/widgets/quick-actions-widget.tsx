"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
    color: "from-blue-600 to-indigo-600 text-white",
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
    color: "from-blue-600 to-pink-600 text-white",
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
    <Card className="relative p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-xs">
                Hızlı İşlemler & Kısayollar
              </h3>
              <Badge
                className="px-1.5 py-0 font-mono text-3xs"
                variant="neutral"
              >
                {visibleActions.length} Eylem
              </Badge>
            </div>
            <p className="text-3xs text-muted-foreground">
              Sık kullanılan CRM eylemlerini tek tıkla başlatın
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <Button
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setIsCustomizeOpen(true)}
            size="icon"
            title="Hızlı İşlemleri Özelleştir"
            type="button"
            variant="ghost"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            className="h-7 w-7 text-muted-foreground"
            onClick={toggleCollapse}
            size="icon"
            title={isCollapsed ? "Genişlet" : "Daralt"}
            type="button"
            variant="ghost"
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Action Grid */}
      {!isCollapsed && (
        <div className="fade-in slide-in-from-top-1 mt-3.5 grid animate-in grid-cols-1 gap-2.5 duration-200 sm:grid-cols-2 lg:grid-cols-4">
          {visibleActions.length === 0 ? (
            <div className="col-span-full py-4 text-center">
              <p className="text-muted-foreground text-xs">
                Görüntülenecek hızlı işlem seçilmedi.
              </p>
              <Button
                className="mt-1.5 h-6 p-0 text-primary text-xs"
                onClick={() => setIsCustomizeOpen(true)}
                type="button"
                variant="link"
              >
                Hızlı İşlem Ekle
              </Button>
            </div>
          ) : (
            visibleActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  className="group flex items-center gap-3 rounded-lg border border-border/80 bg-card p-3 text-left transition-all duration-150 hover:border-border hover:bg-muted/40 active:scale-[0.98]"
                  key={act.id}
                  onClick={() => onOpenQuickCreate(act.actionType)}
                  type="button"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${act.color} text-white shadow-2xs`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-xs transition-colors group-hover:text-primary">
                      {act.title}
                    </div>
                    <div className="truncate text-3xs text-muted-foreground">
                      {act.description}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* In-Place Customize Modal */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setIsCustomizeOpen(false);
          }
        }}
        open={isCustomizeOpen}
      >
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-5 sm:max-w-md"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-border border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-foreground text-sm">
                  Hızlı İşlemleri Özelleştir
                </DialogTitle>
                <p className="text-2xs text-muted-foreground">
                  Dashboard üzerinde görünecek butonları seçin
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                className="h-7 w-7 text-muted-foreground"
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          <div className="my-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {ALL_QUICK_ACTIONS.map((act) => {
              const isSelected = enabledIds.includes(act.id);
              const Icon = act.icon;
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/80 bg-muted/30 opacity-70 hover:border-border"
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
                      <div className="font-semibold text-foreground text-xs">
                        {act.title}
                      </div>
                      <div className="text-3xs text-muted-foreground">
                        {act.description}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${ isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background" }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-border border-t pt-3">
            <Button
              className="h-7 gap-1 text-2xs text-muted-foreground"
              onClick={handleResetDefaults}
              type="button"
              variant="ghost"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Varsayılanlara Dön</span>
            </Button>

            <Button
              className="h-8 px-4 text-xs"
              onClick={() => setIsCustomizeOpen(false)}
              size="sm"
              type="button"
            >
              Tamamla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
