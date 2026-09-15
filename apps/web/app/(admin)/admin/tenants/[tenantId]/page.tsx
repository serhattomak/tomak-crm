"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import { toast } from "@workspace/ui/components/sonner";
import {
  ArrowLeft,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface TenantDetail {
  id: string;
  industry?: string;
  industryTemplateId?: string;
  isActive: boolean;
  name: string;
  slug: string;
}

interface TenantModuleItem {
  activatedAt?: string;
  category: string;
  defaultDisplayName: string;
  displayNameOverride?: string;
  isEnabled: boolean;
  moduleKey: string;
}

interface IndustryTemplate {
  id: string;
  key: string;
  labelsJson: string;
  name: string;
}

interface TenantLabels {
  fieldLabels: Record<string, string>;
  industryKey?: string;
  industryName?: string;
  moduleDisplayNames: Record<string, string>;
  tenantId: string;
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
  const [customOverrides, setCustomOverrides] = useState<
    { key: string; value: string }[]
  >([]);
  const [newOverrideKey, setNewOverrideKey] = useState("");
  const [newOverrideValue, setNewOverrideValue] = useState("");

  const loadData = async () => {
    if (!tenantId) {
      return;
    }
    try {
      setLoading(true);
      const [tenantsListRes, modulesRes, labelsRes, templatesRes] =
        await Promise.all([
          apiClient.get<any[]>("/api/admin/tenants"),
          apiClient.get<TenantModuleItem[]>(`/api/tenants/${tenantId}/modules`),
          apiClient.get<TenantLabels>(`/api/tenants/${tenantId}/labels`),
          apiClient.get<IndustryTemplate[]>("/api/industry-templates"),
        ]);

      const found = tenantsListRes?.data?.find((t: any) => t.id === tenantId);
      if (found) {
        setTenant(found);
      }

      if (modulesRes?.data) {
        setModules(modulesRes.data);
      }
      if (templatesRes?.data) {
        setTemplates(templatesRes.data);
      }
      if (labelsRes?.data) {
        setLabels(labelsRes.data);
        const initialOverrides = Object.entries(
          labelsRes.data.fieldLabels || {}
        ).map(([key, value]) => ({ key, value: String(value ?? "") }));
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
  const handleToggleModule = async (
    moduleKey: string,
    currentStatus: boolean,
    displayName?: string
  ) => {
    try {
      const res = await apiClient.put<any>(
        `/api/tenants/${tenantId}/modules/${moduleKey}`,
        {
          displayName: displayName || undefined,
          isEnabled: !currentStatus,
          moduleKey,
          tenantId,
        }
      );

      if (res?.success) {
        toast.success(
          `Modül ${currentStatus ? "devre dışı bırakıldı" : "aktif edildi"}.`
        );
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
  const handleUpdateModuleName = async (
    moduleKey: string,
    newDisplayName: string
  ) => {
    const targetModule = modules.find((m) => m.moduleKey === moduleKey);
    if (!targetModule) {
      return;
    }

    try {
      await apiClient.put<any>(
        `/api/tenants/${tenantId}/modules/${moduleKey}`,
        {
          displayName: newDisplayName.trim() || undefined,
          isEnabled: targetModule.isEnabled,
          moduleKey,
          tenantId,
        }
      );
      toast.success("Modül görüntüleme adı güncellendi.");
    } catch (err) {
      toast.error("Görüntüleme adı kaydedilemedi.");
    }
  };

  // Add a new label override
  const handleAddOverride = () => {
    if (!(newOverrideKey.trim() && newOverrideValue.trim())) {
      toast.error("Etiket anahtarı ve değeri boş bırakılamaz.");
      return;
    }

    const key = newOverrideKey.trim();
    const value = newOverrideValue.trim();

    if (
      customOverrides.some((o) => o.key.toLowerCase() === key.toLowerCase())
    ) {
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
        industryTemplateId: tenant?.industryTemplateId || undefined,
        overrides: customOverrides,
        tenantId,
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
      <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
        Firma bilgileri yükleniyor...
      </div>
    );
  }

  return (
    <PageContainer className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            href="/admin/tenants"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
                {tenant?.name}
              </h1>
              {tenant?.isActive ? (
                <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Aktif
                </span>
              ) : (
                <span className="rounded-full border border-rose-200/60 bg-rose-50 px-2 py-0.5 font-bold text-[10px] text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                  Askıda
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              /{tenant?.slug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:border-blue-300 hover:bg-zinc-50 hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
            href={`/${tenant?.slug}`}
            target="_blank"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
            <span>Canlı Çalışma Alanını Aç</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-zinc-200 border-b dark:border-zinc-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "modules"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("modules")}
        >
          <Layers className="h-4 w-4" />
          <span>Modül Yetkilendirme & Paket</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "labels"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
          onClick={() => setActiveTab("labels")}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Sektörel Terminoloji & Etiketler</span>
        </button>
      </div>

      {/* TAB 1: MODULES MANAGEMENT */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 text-xs text-zinc-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
            <p>
              Bu firmanın kullanıcılarının erişebileceği modülleri aşağıdan
              aktif/pasif yapabilir veya menüde görünecek özel ismi
              özelleştirebilirsiniz.
            </p>
            <span className="font-bold text-blue-600">
              {modules.filter((m) => m.isEnabled).length} / {modules.length}{" "}
              Aktif Modül
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                className={`rounded-2xl border p-4.5 transition-all ${
                  mod.isEnabled
                    ? "border-blue-200/80 bg-white shadow-xs dark:border-blue-800 dark:bg-zinc-900"
                    : "border-zinc-200/80 bg-zinc-50/40 opacity-70 dark:border-zinc-800 dark:bg-zinc-800/30"
                }`}
                key={mod.moduleKey}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-bold text-[10px] text-zinc-600 uppercase tracking-wider dark:bg-zinc-800 dark:text-zinc-400">
                    {mod.category}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      checked={mod.isEnabled}
                      className="peer sr-only"
                      onChange={() =>
                        handleToggleModule(
                          mod.moduleKey,
                          mod.isEnabled,
                          mod.displayNameOverride
                        )
                      }
                      type="checkbox"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-zinc-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-zinc-700" />
                  </label>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {mod.defaultDisplayName}
                  </h3>
                  <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                    key: {mod.moduleKey}
                  </p>
                </div>

                {/* Custom Display Name Input */}
                <div className="mt-3 space-y-1 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                  <label className="font-bold text-[10px] text-zinc-500 dark:text-zinc-400">
                    Menüde Görünecek Özel İsim:
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-900"
                    defaultValue={mod.displayNameOverride ?? ""}
                    onBlur={(e) =>
                      handleUpdateModuleName(mod.moduleKey, e.target.value)
                    }
                    placeholder={mod.defaultDisplayName}
                    type="text"
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
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-2xs sm:flex-row sm:items-center dark:border-amber-800 dark:bg-amber-950/30">
            <div>
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm dark:text-amber-300">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>
                  Tanımlı Sektör Şablonu:{" "}
                  {labels?.industryName ?? labels?.industryKey ?? "Genel"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Aşağıdaki alan etiketleri, bu firmanın kullanıcıları formları ve
                tabloları kullanırken otomatik olarak uygulanır.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white text-xs shadow-sm hover:bg-blue-500 disabled:opacity-50"
              disabled={saving}
              onClick={handleSaveLabels}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Değişiklikleri Kaydet</span>
            </button>
          </div>

          {/* Add New Override Box */}
          <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40">
            <h3 className="font-bold text-xs text-zinc-600 uppercase tracking-wider dark:text-zinc-400">
              Yeni Özel Alan Etiketi (Override) Ekle
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 font-mono text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  onChange={(e) => setNewOverrideKey(e.target.value)}
                  placeholder="Alan Anahtarı (örn: products.name)"
                  type="text"
                  value={newOverrideKey}
                />
              </div>
              <div>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  onChange={(e) => setNewOverrideValue(e.target.value)}
                  placeholder="Görünecek Etiket (örn: Araç Modeli)"
                  type="text"
                  value={newOverrideValue}
                />
              </div>
              <div>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={handleAddOverride}
                  type="button"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Listeye Ekle</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Örnekler:{" "}
              <code className="font-semibold text-blue-600">products.name</code>
              ,{" "}
              <code className="font-semibold text-blue-600">products.sku</code>,{" "}
              <code className="font-semibold text-blue-600">
                products.brand
              </code>
              ,{" "}
              <code className="font-semibold text-blue-600">
                customers.name
              </code>
            </p>
          </div>

          {/* List of Custom Overrides */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-zinc-100 border-b p-4 font-bold text-xs text-zinc-600 uppercase tracking-wider dark:border-zinc-800 dark:text-zinc-400">
              <span>
                Bu Firmaya Özel Etiket Tanımları ({customOverrides.length})
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {customOverrides.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Bu firmaya özel ezilmiş bir alan etiketi yok. Sektör
                  şablonundan gelen varsayılanlar kullanılır.
                </div>
              ) : (
                customOverrides.map((item) => (
                  <div
                    className="flex items-center justify-between p-3.5 text-xs"
                    key={item.key}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-blue-700">
                        {item.key}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        ➔
                      </span>
                      <input
                        className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-900"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomOverrides((prev) =>
                            prev.map((o) =>
                              o.key === item.key ? { ...o, value: val } : o
                            )
                          );
                        }}
                        type="text"
                        value={item.value}
                      />
                    </div>
                    <button
                      className="rounded-xl p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/40"
                      onClick={() => handleRemoveOverride(item.key)}
                      title="Etiketi Kaldır"
                      type="button"
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
    </PageContainer>
  );
}
