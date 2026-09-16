"use client";

import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SelectField } from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import { Plus, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  ApiClient,
  type EmployeeDto,
  type PipelineDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface CreateDealModalProps {
  activePipeline?: PipelineDto;
  employees: EmployeeDto[];
  onClose: () => void;
  onCreated: () => void;
  pipelines: PipelineDto[];
  tenantSlug: string;
}

export function CreateDealModal({
  tenantSlug: _tenantSlug,
  activePipeline,
  pipelines,
  employees,
  onClose,
  onCreated,
}: CreateDealModalProps) {
  const { activeTenant } = usePermissions();
  const [pipelineId, setPipelineId] = useState(
    activePipeline?.id || pipelines[0]?.id || ""
  );
  const currentPipe =
    pipelines.find((p) => p.id === pipelineId) || activePipeline;
  const [stageId, setStageId] = useState(
    () => currentPipe?.stages?.[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<number>(0);
  const [currency, setCurrency] = useState("TRY");
  const [priority, setPriority] = useState("Medium");
  const [assignedUserId, setAssignedUserId] = useState<string>("auto");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [source, setSource] = useState("Manual");
  const [initialNote, setInitialNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(title.trim() && pipelineId && activeTenant?.id)) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createDeal(
        {
          assignedUserId:
            assignedUserId === "auto" || assignedUserId === "unassigned"
              ? undefined
              : assignedUserId,
          contactEmail: contactEmail.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          currency,
          initialNote: initialNote.trim() || undefined,
          pipelineId,
          priority,
          source,
          stageId: stageId || undefined,
          title: title.trim(),
          value: Number(value) || 0,
        },
        activeTenant.id
      );

      if (res.success) {
        toast.success("Fırsat kartı başarıyla oluşturuldu");
        onCreated();
      } else {
        toast.error(res.message || "Fırsat oluşturulamadı");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSubmitting(false);
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
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <div className="flex shrink-0 items-center justify-between border-border/80 border-b bg-muted/30 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <DialogTitle className="font-semibold text-foreground text-sm sm:text-base">
              Yeni Fırsat Kartı Ekle
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <form
          className="custom-scrollbar space-y-4 overflow-y-auto p-5"
          onSubmit={handleSubmit}
        >
          {/* Pipeline & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pipeline</Label>
              <Combobox
                onChange={(nextPipeId) => {
                  setPipelineId(nextPipeId);
                  const pipe = pipelines.find((p) => p.id === nextPipeId);
                  if (pipe?.stages?.[0]) {
                    setStageId(pipe.stages[0].id);
                  }
                }}
                options={pipelines.map((p) => ({ label: p.name, value: p.id }))}
                value={pipelineId}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Başlangıç Aşaması</Label>
              <Combobox
                onChange={setStageId}
                options={(currentPipe?.stages ?? []).map((s) => ({
                  label: `${s.name} (%${s.probability})`,
                  value: s.id,
                }))}
                value={stageId}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Fırsat / İş Başlığı *</Label>
            <Input
              className="h-8 text-xs"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="örn: Kurumsal Yazılım Lisans Teklifi"
              required
              type="text"
              value={title}
            />
          </div>

          {/* Value & Currency & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Tahmini Tutar</Label>
              <div className="flex gap-2">
                <Input
                  className="h-8 text-xs"
                  min="0"
                  onChange={(e) => setValue(Number(e.target.value))}
                  step="100"
                  type="number"
                  value={value}
                />
                <SelectField
                  onChange={setCurrency}
                  options={[
                    { label: "₺ TRY", value: "TRY" },
                    { label: "$ USD", value: "USD" },
                    { label: "€ EUR", value: "EUR" },
                  ]}
                  value={currency}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Öncelik</Label>
              <SelectField
                onChange={setPriority}
                options={[
                  { label: "Düşük", value: "Low" },
                  { label: "Orta", value: "Medium" },
                  { label: "Yüksek", value: "High" },
                  { label: "Acil", value: "Urgent" },
                ]}
                value={priority}
              />
            </div>
          </div>

          {/* Representative Assignment */}
          <div className="space-y-1">
            <Label className="text-xs">Atama Kuralı / Sorumlu Çalışan</Label>
            <Combobox
              onChange={setAssignedUserId}
              options={[
                {
                  label: "⚡ Otomatik Dağıtım (Round-Robin / Yük Dengesi)",
                  value: "auto",
                },
                { label: "Açık Havuzda Bırak (Atanmamış)", value: "unassigned" },
                ...employees.map((emp) => ({
                  label: `${emp.fullName} (${emp.departmentName || "Genel"})`,
                  value: emp.userId || emp.id,
                })),
              ]}
              value={assignedUserId}
            />
          </div>

          {/* Contact Information (Lead) */}
          <div className="space-y-2 border-border/80 border-t pt-3">
            <h4 className="font-semibold text-primary text-xs">
              Potansiyel Müşteri / Kontak Bilgisi
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                className="h-8 text-xs"
                onChange={(e) => setContactName(e.target.value)}
                placeholder="İsim / Şirket Adı"
                type="text"
                value={contactName}
              />
              <Input
                className="h-8 text-xs"
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="E-Posta"
                type="email"
                value={contactEmail}
              />
              <Input
                className="h-8 text-xs"
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Telefon"
                type="tel"
                value={contactPhone}
              />
            </div>
          </div>

          {/* Source & Initial Note */}
          <div className="space-y-2 border-border/80 border-t pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Kaynak</Label>
                <SelectField
                  onChange={setSource}
                  options={[
                    { label: "Manuel Giriş", value: "Manual" },
                    { label: "Web Sitesi / Form", value: "Website" },
                    { label: "Tavsiye / Referans", value: "Referral" },
                    { label: "Pazarlama Kampanyası", value: "Campaign" },
                    { label: "Gelen Arama", value: "InboundCall" },
                  ]}
                  value={source}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">İlk Not / Açıklama</Label>
                <Input
                  className="h-8 text-xs"
                  onChange={(e) => setInitialNote(e.target.value)}
                  placeholder="Müşteri ihtiyacı veya ilk temas detayları..."
                  type="text"
                  value={initialNote}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-border/80 border-t pt-4">
            <Button onClick={onClose} size="sm" type="button" variant="outline">
              Vazgeç
            </Button>
            <Button disabled={isSubmitting} size="sm" type="submit">
              {isSubmitting ? "Kaydediliyor..." : "Fırsatı Oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
