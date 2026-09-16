"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { toast } from "@workspace/ui/components/sonner";
import { Edit, Loader2, Plus, Sparkles, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface IndustryTemplate {
  createdAt: string;
  defaultModules: string[];
  description?: string;
  id: string;
  key: string;
  labelsJson: string;
  name: string;
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
    defaultModules: ALL_MODULES.map((m) => m.key),
    description: "",
    key: "",
    labelsJson: JSON.stringify(
      {
        fields: {
          "products.name": "Başlık",
          "products.sku": "Kod",
        },
        modules: {
          customers: { displayName: "Müşteriler" },
          products: { displayName: "Hizmet / Ürün" },
        },
      },
      null,
      2
    ),
    name: "",
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<IndustryTemplate[]>(
        "/api/industry-templates"
      );
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
      defaultModules: ALL_MODULES.map((m) => m.key),
      description: "",
      key: "",
      labelsJson: JSON.stringify(
        {
          fields: {
            "products.name": "Başlık / İsim",
            "products.sku": "Referans No",
          },
          modules: {
            products: { displayName: "Portföy / Ürün" },
          },
        },
        null,
        2
      ),
      name: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: IndustryTemplate) => {
    let formattedJson = tpl.labelsJson;
    try {
      formattedJson = JSON.stringify(JSON.parse(tpl.labelsJson), null, 2);
    } catch {}

    setEditTemplate({
      defaultModules: tpl.defaultModules || [],
      description: tpl.description || "",
      id: tpl.id,
      key: tpl.key,
      labelsJson: formattedJson,
      name: tpl.name,
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
        defaultModules: editTemplate.defaultModules,
        description: editTemplate.description || undefined,
        id: editTemplate.id || undefined,
        key: editTemplate.key,
        labelsJson: editTemplate.labelsJson,
        name: editTemplate.name,
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
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-2xl text-zinc-900 tracking-tight">
            Sektör Şablonları
          </h1>
          <p className="mt-0.5 text-zinc-500 text-xs">
            Farklı sektörlerdeki müşteriler için hazır modül paketleri ve
            terminoloji sözlükleri oluşturun.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white text-xs shadow-sm transition hover:bg-blue-500 active:scale-95"
          onClick={handleOpenCreate}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Sektör Şablonu Tanımla</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
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
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-blue-200 hover:shadow-xs"
                key={tpl.id}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200/60 bg-amber-50 text-amber-600">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 text-sm">
                          {tpl.name}
                        </h3>
                        <p className="font-mono text-3xs text-zinc-400">
                          key: {tpl.key}
                        </p>
                      </div>
                    </div>
                    <button
                      className="rounded-xl border border-border bg-zinc-50 p-2 text-zinc-600 transition hover:border-blue-300 hover:bg-white hover:text-blue-600"
                      onClick={() => handleOpenEdit(tpl)}
                      title="Şablonu Düzenle"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {tpl.description || "Açıklama yok"}
                  </p>

                  {/* Modules in Template */}
                  <div className="space-y-1.5 border-border border-t pt-2">
                    <span className="font-bold text-3xs text-zinc-400 uppercase tracking-wider">
                      Varsayılan Modüller ({tpl.defaultModules?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tpl.defaultModules?.map((m) => (
                        <span
                          className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-3xs text-zinc-700"
                          key={m}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Key Label Previews */}
                  {parsedLabels?.modules && (
                    <div className="space-y-1.5 border-border border-t pt-2 text-2xs">
                      <span className="font-bold text-3xs text-zinc-400 uppercase tracking-wider">
                        Terminoloji Dönüşümleri
                      </span>
                      {Object.entries(parsedLabels.modules).map(
                        ([k, v]: [string, any]) => (
                          <div
                            className="flex justify-between text-zinc-600"
                            key={k}
                          >
                            <span className="capitalize">{k}</span>
                            <span className="font-semibold text-amber-700">
                              ➔ {v.displayName}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-border border-t pt-3 text-3xs text-zinc-400">
                  Oluşturulma:{" "}
                  {new Date(tpl.createdAt).toLocaleDateString("tr-TR")}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT / CREATE TEMPLATE MODAL */}
      {isModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-6 overflow-y-auto gap-0 p-6 sm:max-w-2xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-border border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-base text-zinc-900">
                    {editTemplate.id
                      ? "Sektör Şablonunu Düzenle"
                      : "Yeni Sektör Şablonu Oluştur"}
                  </DialogTitle>
                  <p className="text-zinc-500 text-xs">
                    Modülleri ve alan terminolojisini tanımlayın
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form className="space-y-4 text-xs" onSubmit={handleSaveTemplate}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-zinc-700">
                    Şablon Adı *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) =>
                      setEditTemplate({ ...editTemplate, name: e.target.value })
                    }
                    placeholder="Örn: Otomotiv & Galeri"
                    required
                    type="text"
                    value={editTemplate.name}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-zinc-700">
                    Şablon Anahtarı (Key) *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-card p-2.5 font-mono text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) =>
                      setEditTemplate({
                        ...editTemplate,
                        key: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    placeholder="Örn: automotive"
                    required
                    type="text"
                    value={editTemplate.key}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-zinc-700">
                  Açıklama
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) =>
                    setEditTemplate({
                      ...editTemplate,
                      description: e.target.value,
                    })
                  }
                  placeholder="Şablonun hangi sektör ve iş modelleri için geçerli olduğu..."
                  type="text"
                  value={editTemplate.description}
                />
              </div>

              {/* Default Modules */}
              <div>
                <label className="mb-2 block font-bold text-zinc-700">
                  Varsayılan Aktif Modüller (
                  {editTemplate.defaultModules.length} seçildi)
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-zinc-50 p-2 sm:grid-cols-3">
                  {ALL_MODULES.map((mod) => {
                    const checked = editTemplate.defaultModules.includes(
                      mod.key
                    );
                    return (
                      <label
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2 text-2xs transition ${ checked ? "border-blue-200 bg-blue-50 font-medium text-blue-800" : "border-border bg-card text-zinc-600 hover:bg-zinc-50" }`}
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                      >
                        <span>{mod.name}</span>
                        <input
                          checked={checked}
                          className="h-3 w-3 rounded text-blue-600 focus:ring-0"
                          onChange={() => {}}
                          type="checkbox"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* JSON Labels Schema */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block font-bold text-zinc-700">
                    Terminoloji Sözlüğü (JSON Schema)
                  </label>
                  <span className="font-mono text-3xs text-zinc-400">
                    modules & fields sözlüğü
                  </span>
                </div>
                <textarea
                  className="w-full rounded-xl border border-border bg-zinc-900 p-3 font-mono text-amber-300 text-xs leading-relaxed shadow-inner focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    setEditTemplate({
                      ...editTemplate,
                      labelsJson: e.target.value,
                    })
                  }
                  rows={8}
                  value={editTemplate.labelsJson}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 border-border border-t pt-4">
                <button
                  className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-zinc-700 text-xs hover:bg-zinc-50"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-sm hover:bg-blue-500 disabled:opacity-50"
                  disabled={saving}
                  type="submit"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Şablonu Kaydet</span>
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
