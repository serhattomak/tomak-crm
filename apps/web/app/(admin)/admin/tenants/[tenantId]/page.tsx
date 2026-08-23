"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Sparkles,
  Layers,
  Save,
  Trash2,
  Plus,
  ExternalLink,
  CheckCircle2,
  Sliders,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";
import { apiClient } from "@/lib/api-client";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  industryTemplateId?: string;
  isActive: boolean;
}

interface TenantModuleItem {
  moduleKey: string;
  defaultDisplayName: string;
  displayNameOverride?: string;
  category: string;
  isEnabled: boolean;
  activatedAt?: string;
}

interface IndustryTemplate {
  id: string;
  key: string;
  name: string;
  labelsJson: string;
}

interface TenantLabels {
  tenantId: string;
  industryKey?: string;
  industryName?: string;
  moduleDisplayNames: Record<string, string>;
  fieldLabels: Record<string, string>;
}

export default function AdminTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params?.tenantId as string;

  const [activeTab, setActiveTab] = useState<"modules" | "labels">("modules");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [modules, setModules] = useState<TenantModuleItem[]>([]);
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [labels, setLabels] = useState<TenantLabels | null>(null);

  // Editable Overrides: Array of { key, value }
  const [customOverrides, setCustomOverrides] = useState<{ key: string; value: string }[]>([]);
  const [newOverrideKey, setNewOverrideKey] = useState("");
  const [newOverrideValue, setNewOverrideValue] = useState("");

  const loadData = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const [tenantsListRes, modulesRes, labelsRes, templatesRes] = await Promise.all([
        apiClient.get<any[]>("/api/admin/tenants"),
        apiClient.get<TenantModuleItem[]>(`/api/tenants/${tenantId}/modules`),
        apiClient.get<TenantLabels>(`/api/tenants/${tenantId}/labels`),
        apiClient.get<IndustryTemplate[]>("/api/industry-templates"),
      ]);

      const found = tenantsListRes?.data?.find((t: any) => t.id === tenantId);
      if (found) setTenant(found);

      if (modulesRes?.data) setModules(modulesRes.data);
      if (templatesRes?.data) setTemplates(templatesRes.data);
      if (labelsRes?.data) {
        setLabels(labelsRes.data);
        const initialOverrides = Object.entries(labelsRes.data.fieldLabels || {}).map(
          ([key, value]) => ({ key, value: String(value ?? "") })
        );
        setCustomOverrides(initialOverrides);
      }
    } catch (err) {
      toast.error("Firma detayları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Toggle module enabled status
  const handleToggleModule = async (moduleKey: string, currentStatus: boolean, displayName?: string) => {
    try {
      const res = await apiClient.put<any>(`/api/tenants/${tenantId}/modules/${moduleKey}`, {
        tenantId,
        moduleKey,
        isEnabled: !currentStatus,
        displayName: displayName || undefined,
      });

      if (res?.success) {
        toast.success(`Modül ${!currentStatus ? "aktif edildi" : "devre dışı bırakıldı"}.`);
        setModules((prev) =>
          prev.map((m) =>
            m.moduleKey === moduleKey ? { ...m, isEnabled: !currentStatus } : m
          )
        );
      }
    } catch (err) {
      toast.error("Modül durumu güncellenemedi.");
    }
  };

  // Update module custom display name
  const handleUpdateModuleName = async (moduleKey: string, newDisplayName: string) => {
    const targetModule = modules.find((m) => m.moduleKey === moduleKey);
    if (!targetModule) return;

    try {
      await apiClient.put<any>(`/api/tenants/${tenantId}/modules/${moduleKey}`, {
        tenantId,
        moduleKey,
        isEnabled: targetModule.isEnabled,
        displayName: newDisplayName.trim() || undefined,
      });
      toast.success("Modül görüntüleme adı güncellendi.");
    } catch (err) {
      toast.error("Görüntüleme adı kaydedilemedi.");
    }
  };

  // Add a new label override
  const handleAddOverride = () => {
    if (!newOverrideKey.trim() || !newOverrideValue.trim()) {
      toast.error("Etiket anahtarı ve değeri boş bırakılamaz.");
      return;
    }

    const key = newOverrideKey.trim();
    const value = newOverrideValue.trim();

    if (customOverrides.some((o) => o.key.toLowerCase() === key.toLowerCase())) {
      toast.error("Bu alan için zaten bir özel etiket tanımlanmış.");
      return;
    }

    setCustomOverrides([...customOverrides, { key, value }]);
    setNewOverrideKey("");
    setNewOverrideValue("");
  };

  // Remove a label override
  const handleRemoveOverride = (key: string) => {
    setCustomOverrides(customOverrides.filter((o) => o.key !== key));
  };

  // Save all label overrides
  const handleSaveLabels = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put<any>(`/api/tenants/${tenantId}/labels`, {
        tenantId,
        industryTemplateId: tenant?.industryTemplateId || undefined,
        overrides: customOverrides,
      });

      if (res?.success) {
        toast.success("Etiket ve terminoloji ayarları başarıyla kaydedildi.");
        loadData();
      }
    } catch (err) {
      toast.error("Etiketler kaydedilirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !tenant) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        Firma bilgileri yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/tenants"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">{tenant?.name}</h1>
              {tenant?.isActive ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  Aktif
                </span>
              ) : (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
                  Askıda
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">/{tenant?.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/${tenant?.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
            <span>Canlı Çalışma Alanını Aç</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-1">
        <button
          onClick={() => setActiveTab("modules")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "modules"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Modül Yetkilendirme & Paket</span>
        </button>

        <button
          onClick={() => setActiveTab("labels")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === "labels"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Sektörel Terminoloji & Etiketler</span>
        </button>
      </div>

      {/* TAB 1: MODULES MANAGEMENT */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs text-slate-600 flex items-center justify-between shadow-2xs">
            <p>
              Bu firmanın kullanıcılarının erişebileceği modülleri aşağıdan aktif/pasif yapabilir veya menüde görünecek özel ismi özelleştirebilirsiniz.
            </p>
            <span className="font-bold text-blue-600">
              {modules.filter((m) => m.isEnabled).length} / {modules.length} Aktif Modül
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.moduleKey}
                className={`rounded-2xl border p-4.5 transition-all ${
                  mod.isEnabled
                    ? "border-blue-200/80 bg-white shadow-xs"
                    : "border-slate-200/80 bg-slate-50/40 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {mod.category}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={mod.isEnabled}
                      onChange={() =>
                        handleToggleModule(mod.moduleKey, mod.isEnabled, mod.displayNameOverride)
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                  </label>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-slate-900">{mod.defaultDisplayName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">key: {mod.moduleKey}</p>
                </div>

                {/* Custom Display Name Input */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">
                    Menüde Görünecek Özel İsim:
                  </label>
                  <input
                    type="text"
                    defaultValue={mod.displayNameOverride ?? ""}
                    placeholder={mod.defaultDisplayName}
                    onBlur={(e) => handleUpdateModuleName(mod.moduleKey, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TERMINOLOGY & LABELS */}
      {activeTab === "labels" && (
        <div className="space-y-6">
          {/* Active Industry Template Info */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Tanımlı Sektör Şablonu: {labels?.industryName ?? labels?.industryKey ?? "Genel"}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Aşağıdaki alan etiketleri, bu firmanın kullanıcıları formları ve tabloları kullanırken otomatik olarak uygulanır.
              </p>
            </div>
            <button
              onClick={handleSaveLabels}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Değişiklikleri Kaydet</span>
            </button>
          </div>

          {/* Add New Override Box */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-3 shadow-2xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Yeni Özel Alan Etiketi (Override) Ekle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={newOverrideKey}
                  onChange={(e) => setNewOverrideKey(e.target.value)}
                  placeholder="Alan Anahtarı (örn: products.name)"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newOverrideValue}
                  onChange={(e) => setNewOverrideValue(e.target.value)}
                  placeholder="Görünecek Etiket (örn: Araç Modeli)"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAddOverride}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Listeye Ekle</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Örnekler: <code className="text-blue-600 font-semibold">products.name</code>, <code className="text-blue-600 font-semibold">products.sku</code>, <code className="text-blue-600 font-semibold">products.brand</code>, <code className="text-blue-600 font-semibold">customers.name</code>
            </p>
          </div>

          {/* List of Custom Overrides */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Bu Firmaya Özel Etiket Tanımları ({customOverrides.length})</span>
            </div>

            <div className="divide-y divide-slate-100">
              {customOverrides.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Bu firmaya özel ezilmiş bir alan etiketi yok. Sektör şablonundan gelen varsayılanlar kullanılır.
                </div>
              ) : (
                customOverrides.map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-700 font-semibold">{item.key}</span>
                      <span className="text-slate-400">➔</span>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomOverrides((prev) =>
                            prev.map((o) => (o.key === item.key ? { ...o, value: val } : o))
                          );
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOverride(item.key)}
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Etiketi Kaldır"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
