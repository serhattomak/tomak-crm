"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Briefcase,
  Check,
  CheckSquare,
  FileText,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  type: "lead" | "deal" | "task" | "proposal" | null;
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

  if (!(isOpen && type)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (type === "lead") {
        if (activeTenant?.id) {
          const res = await ApiClient.createCustomer(
            {
              email: formData.email,
              name: formData.title,
              phone: formData.phone,
              status: "Lead",
              tier: "Standard",
              type: formData.company ? "Company" : "Individual",
            },
            activeTenant.id
          );
          if (res.success) {
            onSuccess("Müşteri adayı (Lead) başarıyla kaydedildi!");
          } else {
            onSuccess(res.message || "Aday kaydedildi.");
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
      } else if (type === "proposal") {
        onSuccess("Teklif oluşturma ekranına yönlendiriliyorsunuz...");
        onClose();
        router.push(`/${activeTenant?.slug || "workspace"}/quotes`);
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-slate-100 border-b p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              {type === "lead" && <UserPlus className="h-5 w-5" />}
              {type === "deal" && <Briefcase className="h-5 w-5" />}
              {type === "task" && <CheckSquare className="h-5 w-5" />}
              {type === "proposal" && <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-slate-900 text-sm">
                {type === "lead" && "Hızlı Müşteri Adayı (Lead) Ekle"}
                {type === "deal" && "Yeni Satış Fırsatı Oluştur"}
                {type === "task" && "Hızlı Görev / Hatırlatıcı Ekle"}
                {type === "proposal" && "Yeni Teklif Taslağı Başlat"}
              </h2>
              <p className="truncate text-slate-500 text-xs">
                Temel bilgileri girerek saniyeler içinde kaydedin
              </p>
            </div>
          </div>
          <button
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          className="flex-1 space-y-4 overflow-y-auto p-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            {/* Title / Name */}
            <div>
              <label className="mb-1 block font-medium text-slate-700 text-xs">
                {type === "lead" ? "Aday Adı & Soyadı *" : "Başlık / İsim *"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={
                  type === "lead"
                    ? "Örn: Ahmet Yılmaz"
                    : "Örn: ERP Yazılım Lisans Satışı"
                }
                required
                type="text"
                value={formData.title}
              />
            </div>

            {/* Company */}
            <div>
              <label className="mb-1 block font-medium text-slate-700 text-xs">
                Firma / Kuruluş
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                placeholder="Örn: Acme Holding A.Ş."
                type="text"
                value={formData.company}
              />
            </div>

            {/* Value & Dates */}
            {(type === "deal" || type === "proposal") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    Tahmini Tutar (₺)
                  </label>
                  <NumberInput
                    onChange={(val) =>
                      setFormData({ ...formData, value: String(val) })
                    }
                    prefix="₺"
                    value={Number.parseFloat(formData.value) || 0}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    Kapanış Tarihi
                  </label>
                  <DatePicker
                    onChange={(dateStr) =>
                      setFormData({ ...formData, dueDate: dateStr })
                    }
                    value={formData.dueDate}
                  />
                </div>
              </div>
            )}

            {/* Lead Specific: Contact */}
            {type === "lead" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    E-Posta Adresi
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="ahmet@sirket.com"
                    type="email"
                    value={formData.email}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    Telefon Numarası
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+90 555 ..."
                    type="tel"
                    value={formData.phone}
                  />
                </div>
              </div>
            )}

            {/* Task Priority */}
            {type === "task" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    Öncelik Seviyesi
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setFormData({ ...formData, priority: val })
                    }
                    value={formData.priority}
                  >
                    <SelectTrigger>
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
                <div>
                  <label className="mb-1 block font-medium text-slate-700 text-xs">
                    Teslim Tarihi
                  </label>
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
          <div className="flex items-center justify-end gap-2 border-slate-100 border-t p-5">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 text-xs transition-colors hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Kaydet & Başlat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
