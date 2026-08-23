"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Power,
  Sparkles,
  Layers,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";
import { apiClient } from "@/lib/api-client";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  industry: string;
  industryTemplateName?: string;
  isActive: boolean;
  memberCount: number;
  enabledModuleCount: number;
  createdAt: string;
}

interface IndustryTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  defaultModules: string[];
}

const ALL_MODULES = [
  { key: "customers", name: "Müşteriler", category: "Sales" },
  { key: "products", name: "Ürün / Hizmet / Stok", category: "Sales" },
  { key: "orders", name: "Siparişler & Satış", category: "Sales" },
  { key: "pipelines", name: "Pipeline & Fırsatlar", category: "Sales" },
  { key: "quotes", name: "Teklifler", category: "Sales" },
  { key: "shipping", name: "Kargo & Sevkiyat", category: "Sales" },
  { key: "organization", name: "Organizasyon & Kadro", category: "HR" },
  { key: "payroll", name: "Bordro & Maaş", category: "HR" },
  { key: "leaves", name: "İzinler & Takvim", category: "HR" },
  { key: "attendance", name: "Vardiya & PDKS", category: "HR" },
  { key: "chat", name: "Mesajlaşma", category: "Tools" },
];

function AdminTenantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenCreateModal = searchParams.get("create") === "true";

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(shouldOpenCreateModal);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    templateId: "",
    enabledModules: ALL_MODULES.map((m) => m.key),
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, templatesRes] = await Promise.all([
        apiClient.get<TenantItem[]>("/api/admin/tenants"),
        apiClient.get<IndustryTemplate[]>("/api/industry-templates"),
      ]);

      if (tenantsRes?.data) setTenants(tenantsRes.data);
      if (templatesRes?.data) {
        const tpls = templatesRes.data;
        setTemplates(tpls);
        const firstTpl = tpls[0];
        if (firstTpl && !formData.templateId) {
          setFormData((prev) => ({ ...prev, templateId: firstTpl.id }));
        }
      }
    } catch (err) {
      toast.error("Firma listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTemplateChange = (templateId: string) => {
    const selected = templates.find((t) => t.id === templateId);
    setFormData((prev) => ({
      ...prev,
      templateId,
      enabledModules: selected?.defaultModules?.length ? selected.defaultModules : ALL_MODULES.map((m) => m.key),
    }));
  };

  const handleToggleModule = (moduleKey: string) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(moduleKey);
      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((k) => k !== moduleKey)
          : [...prev.enabledModules, moduleKey],
      };
    });
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Lütfen firma adını giriniz.");
      return;
    }

    try {
      setCreating(true);
      const res = await apiClient.post<any>("/api/admin/tenants", {
        name: formData.name,
        slug: formData.slug || undefined,
        industryTemplateId: formData.templateId || undefined,
        enabledModules: formData.enabledModules,
      });

      if (res?.success) {
        toast.success("Firma başarıyla oluşturuldu.");
        setIsCreateModalOpen(false);
        setFormData({
          name: "",
          slug: "",
          templateId: templates[0]?.id || "",
          enabledModules: ALL_MODULES.map((m) => m.key),
        });
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Firma oluşturulurken bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const res = await apiClient.put<any>(`/api/admin/tenants/${tenantId}/status`, {
        isActive: !currentStatus,
      });
      if (res?.success) {
        toast.success(`Firma ${!currentStatus ? "aktifleştirildi" : "askıya alındı"}.`);
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, isActive: !currentStatus } : t))
        );
      }
    } catch (err) {
      toast.error("Durum güncellenirken hata oluştu.");
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">Kayıtlı Firmalar</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Sistemdeki kiracı firmaları, modül izinlerini ve terminolojiyi yönetin.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Firma Ekle</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Firma adı veya slug ile ara..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/70 font-semibold uppercase tracking-wider text-slate-500 text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Firma / Çalışma Alanı</th>
                <th className="px-5 py-3.5">Sektör Şablonu</th>
                <th className="px-5 py-3.5">Aktif Modüller</th>
                <th className="px-5 py-3.5">Üyeler</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                    Firmalar yükleniyor...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Kayıtlı firma bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="transition hover:bg-slate-50/60">
                    {/* Name & Slug */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 font-bold text-blue-600 text-xs">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/admin/tenants/${tenant.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600"
                          >
                            {tenant.name}
                          </Link>
                          <p className="text-[11px] text-slate-400">/{tenant.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Template */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {tenant.industryTemplateName ?? tenant.industry ?? "Genel"}
                      </span>
                    </td>

                    {/* Modules */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Layers className="h-3.5 w-3.5 text-blue-600" />
                        <span>{tenant.enabledModuleCount} / {ALL_MODULES.length} aktif</span>
                      </div>
                    </td>

                    {/* Members */}
                    <td className="px-5 py-4 text-slate-500">
                      {tenant.memberCount} kullanıcı
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {tenant.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200/60">
                          <XCircle className="h-3 w-3" />
                          Askıda
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                          title={tenant.isActive ? "Firmayı Askıya Al" : "Firmayı Aktifleştir"}
                          className={`rounded-xl p-2 transition ${
                            tenant.isActive
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition"
                          title="Firma Modül & Etiket Ayarları"
                        >
                          <Sliders className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/${tenant.slug}`}
                          target="_blank"
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition"
                          title="Çalışma Alanına Git"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TENANT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">Yeni Firma Tanımla</h2>
                  <p className="text-xs text-slate-500">Sektör şablonu ve modül paketini yapılandırın</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Firma Adı *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Akıncı Otomotiv A.Ş."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Özel URL / Slug (Opsiyonel)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Örn: akinci-oto"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sektör Şablonu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sektör Şablonu</label>
                <select
                  value={formData.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.description || tpl.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Modül Seçimi */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700">
                    Aktif Edilecek Modüller ({formData.enabledModules.length} seçildi)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        enabledModules:
                          formData.enabledModules.length === ALL_MODULES.length
                            ? []
                            : ALL_MODULES.map((m) => m.key),
                      })
                    }
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    {formData.enabledModules.length === ALL_MODULES.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {ALL_MODULES.map((mod) => {
                    const checked = formData.enabledModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition ${
                          checked
                            ? "bg-blue-50 border-blue-200 text-blue-800 font-medium"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xs">{mod.name}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Firmayı Oluştur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          Yükleniyor...
        </div>
      }
    >
      <AdminTenantsContent />
    </Suspense>
  );
}
