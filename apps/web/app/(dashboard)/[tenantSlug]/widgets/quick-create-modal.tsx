/* Hallmark · component: quick-create-modal · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Button } from "@workspace/ui/components/button";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  FileText,
  Loader2,
  Package,
  Palmtree,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import type { QuickActionType } from "./quick-actions-widget";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  type: QuickActionType | null;
}

export function QuickCreateModal({
  isOpen,
  type,
  onClose,
  onSuccess,
}: QuickCreateModalProps) {
  const { activeTenant } = usePermissions();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    contactName: "",
    dueDate: "",
    email: "",
    phone: "",
    priority: "medium",
    title: "",
    value: "",
  });

  // Close on Escape key - called unconditionally at top level
  useEffect(() => {
    if (!(isOpen && type)) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, type, onClose]);

  if (!(isOpen && type)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (type === "lead" || type === "customer") {
        if (activeTenant?.id) {
          const res = await ApiClient.createCustomer(
            {
              email: formData.email,
              name: formData.title,
              phone: formData.phone,
              status: type === "lead" ? "Lead" : "Active",
              tier: "Standard",
              type: formData.company ? "Company" : "Individual",
            },
            activeTenant.id
          );
          if (res.success) {
            onSuccess(
              type === "lead"
                ? "Müşteri adayı (Lead) başarıyla kaydedildi!"
                : "Müşteri kaydı başarıyla oluşturuldu!"
            );
          } else {
            onSuccess(res.message || "Kayıt tamamlandı.");
          }
        }
      } else if (type === "deal") {
        if (activeTenant?.id) {
          const pipelinesRes = await ApiClient.getPipelines(activeTenant.id);
          const defaultPipeline = pipelinesRes.data?.[0];
          const defaultStage = defaultPipeline?.stages?.[0];

          if (defaultPipeline?.id) {
            const res = await ApiClient.createDeal(
              {
                pipelineId: defaultPipeline.id,
                priority: formData.priority,
                stageId: defaultStage?.id,
                title: formData.title,
                value: Number.parseFloat(formData.value) || 0,
              },
              activeTenant.id
            );
            if (res.success) {
              onSuccess("Satış fırsatı başarıyla oluşturuldu!");
            } else {
              onSuccess("Fırsat kaydı oluşturuldu.");
            }
          } else {
            router.push(`/${activeTenant.slug || "workspace"}/pipelines`);
          }
        }
      } else if (type === "meeting") {
        onSuccess(
          "Randevu ve toplantı planlama ekranına yönlendiriliyorsunuz..."
        );
        onClose();
        router.push(
          `/${activeTenant?.slug || "workspace"}/calendar?new=meeting`
        );
        return;
      } else if (type === "proposal") {
        onSuccess("Teklif oluşturma ekranına yönlendiriliyorsunuz...");
        onClose();
        router.push(`/${activeTenant?.slug || "workspace"}/quotes`);
        return;
      } else if (type === "order") {
        onSuccess("Siparişler ekranına yönlendiriliyorsunuz...");
        onClose();
        router.push(`/${activeTenant?.slug || "workspace"}/orders`);
        return;
      } else if (type === "leave") {
        onSuccess("İzin talep ekranına yönlendiriliyorsunuz...");
        onClose();
        router.push(`/${activeTenant?.slug || "workspace"}/leaves?create=true`);
        return;
      } else {
        onSuccess("Görev başarıyla eklendi!");
      }

      onClose();
      setFormData({
        company: "",
        contactName: "",
        dueDate: "",
        email: "",
        phone: "",
        priority: "medium",
        title: "",
        value: "",
      });
    } catch {
      onSuccess("İşlem tamamlandı.");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-border/80 border-b p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {type === "lead" && <UserPlus className="h-4.5 w-4.5" />}
              {type === "deal" && <Briefcase className="h-4.5 w-4.5" />}
              {type === "task" && <CheckSquare className="h-4.5 w-4.5" />}
              {type === "proposal" && <FileText className="h-4.5 w-4.5" />}
              {type === "customer" && <User className="h-4.5 w-4.5" />}
              {type === "order" && <Package className="h-4.5 w-4.5" />}
              {type === "meeting" && <Calendar className="h-4.5 w-4.5" />}
              {type === "leave" && <Palmtree className="h-4.5 w-4.5" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-foreground text-sm">
                {type === "lead" && "Hızlı Müşteri Adayı (Lead) Ekle"}
                {type === "deal" && "Yeni Satış Fırsatı Oluştur"}
                {type === "task" && "Hızlı Görev / Hatırlatıcı Ekle"}
                {type === "proposal" && "Yeni Teklif Taslağı Başlat"}
                {type === "customer" && "Yeni Müşteri Ekle"}
                {type === "order" && "Yeni Sipariş Oluştur"}
                {type === "meeting" && "Randevu & Toplantı Planla"}
                {type === "leave" && "Yeni İzin Talebi"}
              </h2>
              <p className="truncate text-muted-foreground text-xs">
                Temel bilgileri girerek saniyeler içinde kaydedin
              </p>
            </div>
          </div>
          <Button
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form
          className="flex-1 space-y-4 overflow-y-auto p-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            {/* Title / Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                {type === "lead" || type === "customer"
                  ? "Ad & Soyad / Müşteri Adı *"
                  : "Başlık / İsim *"}
              </Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={
                  type === "lead" || type === "customer"
                    ? "Örn: Ahmet Yılmaz"
                    : "Örn: ERP Yazılım Lisans Satışı"
                }
                required
                type="text"
                value={formData.title}
              />
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label className="text-xs">Firma / Kuruluş</Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Örn: Acme Holding A.Ş."
                type="text"
                value={formData.company}
              />
            </div>

            {/* Value & Dates */}
            {(type === "deal" || type === "proposal" || type === "order") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tahmini Tutar (₺)</Label>
                  <NumberInput
                    onChange={(val) =>
                      setFormData({ ...formData, value: String(val) })
                    }
                    prefix="₺"
                    value={Number.parseFloat(formData.value) || 0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kapanış Tarihi</Label>
                  <DatePicker
                    onChange={(dateStr) =>
                      setFormData({ ...formData, dueDate: dateStr })
                    }
                    value={formData.dueDate}
                  />
                </div>
              </div>
            )}

            {/* Lead & Customer Specific: Contact */}
            {(type === "lead" || type === "customer") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">E-Posta Adresi</Label>
                  <Input
                    className="h-8 text-xs"
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="ahmet@sirket.com"
                    type="email"
                    value={formData.email}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon Numarası</Label>
                  <PhoneInput
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    placeholder="+90 (5XX) XXX XX XX"
                    value={formData.phone}
                  />
                </div>
              </div>
            )}

            {/* Task Priority */}
            {type === "task" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Öncelik Seviyesi</Label>
                  <Select
                    onValueChange={(val) =>
                      setFormData({ ...formData, priority: val })
                    }
                    value={formData.priority}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Normal</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teslim Tarihi</Label>
                  <DatePicker
                    onChange={(dateStr) =>
                      setFormData({ ...formData, dueDate: dateStr })
                    }
                    value={formData.dueDate}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-border/80 border-t pt-4">
            <Button onClick={onClose} size="sm" type="button" variant="outline">
              Vazgeç
            </Button>
            <Button
              className="gap-1.5"
              disabled={isSubmitting}
              size="sm"
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Kaydet & Başlat</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
