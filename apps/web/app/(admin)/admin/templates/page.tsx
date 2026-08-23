"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Plus,
  Edit,
  Save,
  Layers,
  CheckCircle2,
  X,
  Loader2,
  Code,
  FileText,
} from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";
import { apiClient } from "@/lib/api-client";

interface IndustryTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  labelsJson: string;
  defaultModules: string[];
  createdAt: string;
}

const ALL_MODULES = [
  { key: "customers", name: "Müşteriler" },
  { key: "products", name: "Ürün / Hizmet / Stok" },
  { key: "orders", name: "Siparişler & Satış" },
  { key: "pipelines", name: "Pipeline & Fırsatlar" },
  { key: "quotes", name: "Teklifler" },
  { key: "shipping", name: "Kargo & Sevkiyat" },
  { key: "organization", name: "Organizasyon" },
  { key: "payroll", name: "Bordro" },
  { key: "leaves", name: "İzinler" },
  { key: "attendance", name: "Vardiya & PDKS" },
  { key: "chat", name: "Mesajlar" },
];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editTemplate, setEditTemplate] = useState<{
    id?: string;
    key: string;
    name: string;
    description: string;
    defaultModules: string[];
    labelsJson: string;
  }>({
    key: "",
    name: "",
    description: "",
    defaultModules: ALL_MODULES.map((m) => m.key),
    labelsJson: JSON.stringify(
      {
        modules: {
          products: { displayName: "Hizmet / Ürün" },
          customers: { displayName: "Müşteriler" },
        },
        fields: {
          "products.name": "Başlık",
          "products.sku": "Kod",
        },
      },
      null,
      2
    ),
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<IndustryTemplate[]>("/api/industry-templates");
      if (res?.data) {
        setTemplates(res.data);
      }
    } catch (err) {
      toast.error("Şablonlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenCreate = () => {
    setEditTemplate({
      key: "",
      name: "",
      description: "",
      defaultModules: ALL_MODULES.map((m) => m.key),
      labelsJson: JSON.stringify(
        {
          modules: {
            products: { displayName: "Portföy / Ürün" },
          },
          fields: {
            "products.name": "Başlık / İsim",
            "products.sku": "Referans No",
          },
        },
        null,
        2
      ),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: IndustryTemplate) => {
    let formattedJson = tpl.labelsJson;
    try {
      formattedJson = JSON.stringify(JSON.parse(tpl.labelsJson), null, 2);
    } catch {}

    setEditTemplate({
      id: tpl.id,
      key: tpl.key,
      name: tpl.name,
      description: tpl.description || "",
      defaultModules: tpl.defaultModules || [],
      labelsJson: formattedJson,
    });
    setIsModalOpen(true);
  };

  const handleToggleModule = (modKey: string) => {
    setEditTemplate((prev) => {
      const exists = prev.defaultModules.includes(modKey);
      return {
        ...prev,
        defaultModules: exists
          ? prev.defaultModules.filter((k) => k !== modKey)
          : [...prev.defaultModules, modKey],
      };
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate JSON
    try {
      JSON.parse(editTemplate.labelsJson);
    } catch (err) {
      toast.error("Etiket JSON şablonu geçersiz formatta.");
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.post<any>("/api/admin/templates", {
        id: editTemplate.id || undefined,
        key: editTemplate.key,
        name: editTemplate.name,
        description: editTemplate.description || undefined,
        labelsJson: editTemplate.labelsJson,
        defaultModules: editTemplate.defaultModules,
      });

      if (res?.success) {
        toast.success("Sektör şablonu kaydedildi.");
        setIsModalOpen(false);
        loadTemplates();
      }
    } catch (err: any) {
      toast.error(err?.message || "Şablon kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">Sektör Şablonları</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Farklı sektörlerdeki müşteriler için hazır modül paketleri ve terminoloji sözlükleri oluşturun.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          type="button"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Sektör Şablonu Tanımla</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
            Şablonlar yükleniyor...
          </div>
        ) : (
          templates.map((tpl) => {
            let parsedLabels: any = {};
            try {
              parsedLabels = JSON.parse(tpl.labelsJson);
            } catch {}

            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-blue-200 hover:shadow-xs"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{tpl.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono">key: {tpl.key}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition"
                      title="Şablonu Düzenle"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">{tpl.description || "Açıklama yok"}</p>

                  {/* Modules in Template */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Varsayılan Modüller ({tpl.defaultModules?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tpl.defaultModules?.map((m) => (
                        <span
                          key={m}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Key Label Previews */}
                  {parsedLabels?.modules && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Terminoloji Dönüşümleri
                      </span>
                      {Object.entries(parsedLabels.modules).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex justify-between text-slate-600">
                          <span className="capitalize">{k}</span>
                          <span className="font-semibold text-amber-700">➔ {v.displayName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                  Oluşturulma: {new Date(tpl.createdAt).toLocaleDateString("tr-TR")}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT / CREATE TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">
                    {editTemplate.id ? "Sektör Şablonunu Düzenle" : "Yeni Sektör Şablonu Oluştur"}
                  </h2>
                  <p className="text-xs text-slate-500">Modülleri ve alan terminolojisini tanımlayın</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Şablon Adı *</label>
                  <input
                    type="text"
                    required
                    value={editTemplate.name}
                    onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
                    placeholder="Örn: Otomotiv & Galeri"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Şablon Anahtarı (Key) *</label>
                  <input
                    type="text"
                    required
                    value={editTemplate.key}
                    onChange={(e) =>
                      setEditTemplate({
                        ...editTemplate,
                        key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    placeholder="Örn: automotive"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={editTemplate.description}
                  onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  placeholder="Şablonun hangi sektör ve iş modelleri için geçerli olduğu..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Default Modules */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Varsayılan Aktif Modüller ({editTemplate.defaultModules.length} seçildi)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {ALL_MODULES.map((mod) => {
                    const checked = editTemplate.defaultModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border text-[11px] transition ${
                          checked
                            ? "bg-blue-50 border-blue-200 text-blue-800 font-medium"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{mod.name}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="h-3 w-3 rounded text-blue-600 focus:ring-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* JSON Labels Schema */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Terminoloji Sözlüğü (JSON Schema)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">modules & fields sözlüğü</span>
                </div>
                <textarea
                  rows={8}
                  value={editTemplate.labelsJson}
                  onChange={(e) => setEditTemplate({ ...editTemplate, labelsJson: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-amber-300 focus:border-blue-500 focus:outline-none leading-relaxed shadow-inner"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Şablonu Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
