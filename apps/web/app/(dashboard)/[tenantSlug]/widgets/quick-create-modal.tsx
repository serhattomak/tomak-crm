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
import { Briefcase, Check, CheckSquare, FileText, UserPlus, X } from "lucide-react";
import { useState } from "react";

interface QuickCreateModalProps {
  isOpen: boolean;
  type: "lead" | "deal" | "task" | "proposal" | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function QuickCreateModal({
  isOpen,
  type,
  onClose,
  onSuccess,
}: QuickCreateModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    value: "",
    priority: "medium",
    dueDate: "",
  });

  if (!isOpen || !type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeNames: Record<string, string> = {
      lead: "Müşteri Adayı",
      deal: "Satış Fırsatı",
      task: "Görev",
      proposal: "Teklif Taslağı",
    };
    onSuccess(`${typeNames[type] || "Kayıt"} başarıyla oluşturuldu!`);
    onClose();
    setFormData({
      title: "",
      company: "",
      contactName: "",
      email: "",
      phone: "",
      value: "",
      priority: "medium",
      dueDate: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-slate-100 border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              {type === "lead" && <UserPlus className="h-5 w-5" />}
              {type === "deal" && <Briefcase className="h-5 w-5" />}
              {type === "task" && <CheckSquare className="h-5 w-5" />}
              {type === "proposal" && <FileText className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {type === "lead" && "Hızlı Müşteri Adayı (Lead) Ekle"}
                {type === "deal" && "Yeni Satış Fırsatı Oluştur"}
                {type === "task" && "Hızlı Görev / Hatırlatıcı Ekle"}
                {type === "proposal" && "Yeni Teklif Taslağı Başlat"}
              </h2>
              <p className="text-slate-500 text-xs">Temel bilgileri girerek saniyeler içinde kaydedin</p>
            </div>
          </div>
          <button
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form className="flex-1 overflow-y-auto p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Title / Name */}
            <div>
              <label className="mb-1 block font-medium text-xs text-slate-700">
                {type === "lead" ? "Aday Adı & Soyadı *" : "Başlık / İsim *"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={type === "lead" ? "Örn: Ahmet Yılmaz" : "Örn: ERP Yazılım Lisans Satışı"}
                required
                type="text"
                value={formData.title}
              />
            </div>

            {/* Company */}
            <div>
              <label className="mb-1 block font-medium text-xs text-slate-700">
                Firma / Kuruluş
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Örn: Acme Holding A.Ş."
                type="text"
                value={formData.company}
              />
            </div>

            {/* Value & Dates */}
            {(type === "deal" || type === "proposal") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Tahmini Tutar (₺)
                  </label>
                  <NumberInput
                    value={parseFloat(formData.value) || 0}
                    onChange={(val) => setFormData({ ...formData, value: String(val) })}
                    prefix="₺"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Kapanış Tarihi
                  </label>
                  <DatePicker
                    value={formData.dueDate}
                    onChange={(dateStr) => setFormData({ ...formData, dueDate: dateStr })}
                  />
                </div>
              </div>
            )}

            {/* Lead Specific: Contact */}
            {type === "lead" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    E-Posta Adresi
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ahmet@sirket.com"
                    type="email"
                    value={formData.email}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Telefon Numarası
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Öncelik Seviyesi
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => setFormData({ ...formData, priority: val })}
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
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Teslim Tarihi
                  </label>
                  <DatePicker
                    value={formData.dueDate}
                    onChange={(dateStr) => setFormData({ ...formData, dueDate: dateStr })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-slate-100 border-t p-5">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 text-xs hover:bg-slate-50 transition-colors"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 transition-colors"
              type="submit"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Kaydet & Başlat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
