"use client";

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

  const getModalTitle = () => {
    switch (type) {
      case "lead":
        return {
          title: "Yeni Müşteri Adayı (Lead) Ekle",
          desc: "Potansiyel müşteri bilgilerini sisteme kaydedin",
          icon: UserPlus,
          color: "bg-violet-50 text-violet-600",
        };
      case "deal":
        return {
          title: "Yeni Satış Fırsatı Başlat",
          desc: "Satış hunisine (Pipeline) yeni bir anlaşma ekleyin",
          icon: Briefcase,
          color: "bg-blue-50 text-blue-600",
        };
      case "task":
        return {
          title: "Yeni Görev Oluştur",
          desc: "Kendiniz veya ekip üyeleriniz için görev planlayın",
          icon: CheckSquare,
          color: "bg-emerald-50 text-emerald-600",
        };
      case "proposal":
        return {
          title: "Hızlı Teklif Taslağı Oluştur",
          desc: "Müşteriye iletilecek teklif belgesini başlatın",
          icon: FileText,
          color: "bg-fuchsia-50 text-fuchsia-600",
        };
    }
  };

  const info = getModalTitle();
  const Icon = info.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(
      `${info.title} başarıyla oluşturuldu!`
    );
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
      <div className="flex w-full max-w-lg flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-slate-100 border-b p-5">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-2xl ${info.color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">{info.title}</h2>
              <p className="text-slate-500 text-xs">{info.desc}</p>
            </div>
          </div>

          <button
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-3.5 p-5">
            {/* Common Title/Name */}
            <div>
              <label className="mb-1 block font-medium text-xs text-slate-700">
                {type === "lead"
                  ? "Aday Adı Soyadı"
                  : type === "deal"
                    ? "Fırsat / Proje Başlığı"
                    : type === "task"
                      ? "Görev Başlığı"
                      : "Teklif Başlığı"}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Örn: Kurumsal Lisans Paketi..."
                required
                type="text"
                value={formData.title}
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="mb-1 block font-medium text-xs text-slate-700">
                Şirket / Kurum Adı
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
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
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Örn: 75.000"
                    type="number"
                    value={formData.value}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Kapanış Tarihi
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    type="date"
                    value={formData.dueDate}
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
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
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    value={formData.priority}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil 🔥</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-xs text-slate-700">
                    Teslim Tarihi
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    type="date"
                    value={formData.dueDate}
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
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-slate-800 transition-colors"
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
