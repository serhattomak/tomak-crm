"use client";

import { Button } from "@workspace/ui/components/button";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { toast } from "@workspace/ui/components/sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import {
  ApiClient,
  type DealDetailDto,
  type EmployeeDto,
  type PipelineDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { formatCurrency } from "./pipeline-helpers";

interface DealDetailDrawerProps {
  activePipeline?: PipelineDto;
  dealId: string;
  employees: EmployeeDto[];
  onClose: () => void;
  onUpdated: () => void;
  tenantSlug: string;
}

export function DealDetailDrawer({
  dealId,
  tenantSlug,
  onClose,
  onUpdated,
  employees,
  activePipeline,
}: DealDetailDrawerProps) {
  const { activeTenant } = usePermissions();
  const [deal, setDeal] = useState<DealDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "notes">("timeline");
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getDealById(dealId, activeTenant.id);
      if (res.success && res.data) {
        setDeal(res.data);
      } else {
        toast.error("Fırsat detayları alınamadı");
      }
    } catch {
      toast.error("Detay yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, dealId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Stage change directly from drawer stepper
  const handleStageChange = async (targetStageId: string) => {
    if (!(activeTenant?.id && deal) || deal.stageId === targetStageId) {
      return;
    }

    try {
      const res = await ApiClient.moveDealStage(
        deal.id,
        { dealId: deal.id, targetStageId },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Aşama başarıyla değiştirildi");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Aşama değiştirilemedi");
      }
    } catch {
      toast.error("İşlem gerçekleştirilemedi");
    }
  };

  // Re-assign representative
  const handleAssignUser = async (userId: string) => {
    if (!(activeTenant?.id && deal)) {
      return;
    }
    const targetUserId = userId === "unassigned" ? undefined : userId;

    try {
      const res = await ApiClient.assignDeal(
        deal.id,
        { assignedUserId: targetUserId, dealId: deal.id },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Temsilci ataması güncellendi");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Atama güncellenemedi");
      }
    } catch {
      toast.error("İşlem sırasında hata oluştu");
    }
  };

  // Add internal note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newNote.trim() && activeTenant?.id && deal)) {
      return;
    }

    setIsSubmittingNote(true);
    try {
      const res = await ApiClient.addDealNote(
        deal.id,
        { content: newNote.trim(), dealId: deal.id },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Not eklendi");
        setNewNote("");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Not eklenemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Confirm Delete Deal
  const handleConfirmDelete = async () => {
    if (!(activeTenant?.id && deal)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await ApiClient.deleteDeal(deal.id, activeTenant.id);
      if (res.success) {
        toast.success("Fırsat başarıyla silindi");
        setIsDeleteDialogOpen(false);
        onClose();
        onUpdated();
      } else {
        toast.error(res.message || "Fırsat silinemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      {/* Design System Confirm Dialog */}
      <ConfirmDialog
        cancelText="Vazgeç"
        confirmText="Evet, Sil"
        description={`"${deal?.title || "Bu fırsat"}" başlıklı kart kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Fırsat Kartını Sil"
        variant="destructive"
      />

      <SheetContent
        aria-describedby={undefined}
        className="data-[side=right]:w-full border-border/80 overflow-hidden data-[side=right]:sm:max-w-none data-[side=right]:md:max-w-2xl"
        showCloseButton={false}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-border/80 border-b bg-muted/30 p-3.5 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <SheetClose asChild>
              <Button
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                size="icon"
                title="Kapat & Geri Dön"
                type="button"
                variant="ghost"
              >
                <ArrowLeft className="h-4 w-4 sm:hidden" />
                <X className="hidden h-4 w-4 sm:block" />
              </Button>
            </SheetClose>
            <div className="min-w-0">
              <span className="block truncate font-medium text-2xs text-muted-foreground">
                {deal?.pipelineName || "Pipeline Fırsatı"}
              </span>
              <SheetTitle className="max-w-[200px] truncate font-semibold text-foreground text-sm leading-tight sm:max-w-md sm:text-base">
                {deal?.title || "Fırsat Detayı"}
              </SheetTitle>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              size="icon"
              title="Fırsatı Sil"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !deal ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-xs">Detaylar yükleniyor...</span>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 pb-28 sm:p-5 sm:pb-8">
            {/* 1. Stage Progression Stepper */}
            <div>
              <span className="mb-2 block font-semibold text-2xs text-muted-foreground uppercase tracking-wider">
                Aşama İlerlemesi (Tıklayarak Değiştirin)
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/40 p-2.5 sm:grid-cols-4">
                {activePipeline?.stages?.map((stage) => {
                  const isCurrent = deal.stageId === stage.id;
                  return (
                    <button
                      className={`flex flex-col justify-between rounded-md p-2 text-left font-medium text-xs transition-colors ${ isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "border border-border/70 bg-card text-foreground hover:bg-accent" }`}
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      type="button"
                    >
                      <span className="truncate">{stage.name}</span>
                      <span
                        className={`mt-1 text-3xs ${
                          isCurrent
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        %{stage.probability} Olasılık
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Live Chat Integration Banner (if deal from chat) */}
            {deal.source === "LiveChat" && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3.5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-500/20 text-purple-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-700 text-xs">
                      Canlı Destek Oturumu Bağlantılı
                    </h4>
                    <p className="text-2xs text-purple-600">
                      Bu kart canlı destek sohbetinden otomatik türetildi.
                    </p>
                  </div>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link
                    className="gap-1.5 text-purple-700 text-xs"
                    href={`/${tenantSlug}/messages`}
                  >
                    <span>Sohbete Git</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border/80 bg-card p-4 shadow-xs sm:grid-cols-3">
              {/* Value */}
              <div>
                <span className="font-medium text-3xs text-muted-foreground uppercase">
                  Tutar
                </span>
                <p className="mt-0.5 font-bold text-base text-foreground">
                  {formatCurrency(deal.value, deal.currency)}
                </p>
              </div>

              {/* Priority */}
              <div>
                <span className="font-medium text-3xs text-muted-foreground uppercase">
                  Öncelik
                </span>
                <p className="mt-1">
                  <span className="font-semibold text-foreground text-xs">
                    {deal.priority === "Urgent"
                      ? "Acil"
                      : deal.priority === "High"
                        ? "Yüksek"
                        : "Orta"}
                  </span>
                </p>
              </div>

              {/* SLA Status */}
              <div>
                <span className="font-medium text-3xs text-muted-foreground uppercase">
                  SLA Durumu
                </span>
                <p className="mt-1">
                  {deal.isSlaBreached ? (
                    <span className="inline-flex items-center gap-1 font-medium text-3xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" /> Süre Aşıldı
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-3xs text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Uygun
                    </span>
                  )}
                </p>
              </div>

              {/* Assigned Representative */}
              <div className="col-span-2 border-border/60 border-t pt-3 sm:col-span-3">
                <div className="space-y-1.5">
                  <span className="font-medium text-foreground text-xs">
                    Sorumlu Çalışan / Satış Temsilcisi
                  </span>
                  <SalesRepPicker
                    employees={employees}
                    onChange={(empId) =>
                      handleAssignUser(empId || "unassigned")
                    }
                    placeholder="Temsilci arayın veya seçin..."
                    value={deal.assignedUserId || ""}
                  />
                </div>
              </div>
            </div>

            {/* 4. Customer / Contact Details */}
            {(deal.customerName ||
              deal.contactName ||
              deal.contactEmail ||
              deal.contactPhone) && (
              <div className="space-y-3 rounded-lg border border-border/80 bg-card p-4 shadow-xs">
                <h4 className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Müşteri & İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  {deal.customerName && (
                    <div>
                      <span className="text-muted-foreground">
                        Müşteri / Şirket:
                      </span>
                      <p className="font-medium text-foreground">
                        {deal.customerName}
                      </p>
                    </div>
                  )}
                  {deal.contactName && (
                    <div>
                      <span className="text-muted-foreground">
                        İlgili Kişi:
                      </span>
                      <p className="font-medium text-foreground">
                        {deal.contactName}
                      </p>
                    </div>
                  )}
                  {deal.contactEmail && (
                    <div>
                      <span className="text-muted-foreground">E-Posta:</span>
                      <p className="font-medium text-primary">
                        {deal.contactEmail}
                      </p>
                    </div>
                  )}
                  {deal.contactPhone && (
                    <div>
                      <span className="text-muted-foreground">Telefon:</span>
                      <p className="font-medium text-foreground">
                        {deal.contactPhone}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Tabs: Timeline (Aktiviteler) & Notes (Notlar) */}
            <div>
              <div className="mb-4 flex border-border/70 border-b">
                <button
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-xs transition-colors ${
                    activeTab === "timeline"
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("timeline")}
                  type="button"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Aktiviteler ({deal.activities?.length || 0})
                </button>
                <button
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-medium text-xs transition-colors ${
                    activeTab === "notes"
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("notes")}
                  type="button"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Notlar ({deal.notes?.length || 0})
                </button>
              </div>

              {activeTab === "timeline" ? (
                /* Activities Timeline */
                <div className="space-y-2.5">
                  {deal.activities?.map((act) => (
                    <div
                      className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs"
                      key={act.id}
                    >
                      <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {act.title}
                          </span>
                          <span className="text-3xs text-muted-foreground">
                            {new Date(act.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 text-muted-foreground">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!deal.activities || deal.activities.length === 0) && (
                    <p className="py-6 text-center text-muted-foreground text-xs">
                      Henüz aktivite kaydı yok.
                    </p>
                  )}
                </div>
              ) : (
                /* Notes Tab */
                <div className="space-y-3">
                  {/* Note Creator Form */}
                  <form className="space-y-2" onSubmit={handleAddNote}>
                    <textarea
                      className="w-full rounded-md border border-input bg-background p-2.5 font-medium text-foreground text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Bu fırsat için dahili bir not ekleyin..."
                      rows={3}
                      value={newNote}
                    />
                    <div className="flex justify-end">
                      <Button
                        disabled={isSubmittingNote || !newNote.trim()}
                        size="sm"
                        type="submit"
                      >
                        {isSubmittingNote ? "Ekleniyor..." : "Not Ekle"}
                      </Button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2">
                    {deal.notes?.map((n) => (
                      <div
                        className="rounded-lg border border-border/80 bg-card p-3 text-xs shadow-2xs"
                        key={n.id}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-semibold text-primary">
                            {n.userName || "Kullanıcı"}
                          </span>
                          <span className="text-3xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-foreground">
                          {n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
