"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Power,
  Search,
  Sliders,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface TenantItem {
  createdAt: string;
  enabledModuleCount: number;
  id: string;
  industry: string;
  industryTemplateName?: string;
  isActive: boolean;
  logoUrl?: string;
  memberCount: number;
  name: string;
  slug: string;
}

interface IndustryTemplate {
  defaultModules: string[];
  description?: string;
  id: string;
  key: string;
  name: string;
}

const ALL_MODULES = [
  { category: "Sales", key: "customers", name: "Müşteriler" },
  { category: "Sales", key: "products", name: "Ürün / Hizmet / Stok" },
  { category: "Sales", key: "orders", name: "Siparişler & Satış" },
  { category: "Sales", key: "pipelines", name: "Pipeline & Fırsatlar" },
  { category: "Sales", key: "quotes", name: "Teklifler" },
  { category: "Sales", key: "shipping", name: "Kargo & Sevkiyat" },
  { category: "HR", key: "organization", name: "Organizasyon & Kadro" },
  { category: "HR", key: "payroll", name: "Bordro & Maaş" },
  { category: "HR", key: "leaves", name: "İzinler & Takvim" },
  { category: "HR", key: "attendance", name: "Vardiya & PDKS" },
  { category: "Tools", key: "chat", name: "Mesajlaşma" },
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    shouldOpenCreateModal
  );
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    enabledModules: ALL_MODULES.map((m) => m.key),
    name: "",
    slug: "",
    templateId: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, templatesRes] = await Promise.all([
        apiClient.get<TenantItem[]>("/api/admin/tenants"),
        apiClient.get<IndustryTemplate[]>("/api/industry-templates"),
      ]);

      if (tenantsRes?.data) {
        setTenants(tenantsRes.data);
      }
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
      enabledModules: selected?.defaultModules?.length
        ? selected.defaultModules
        : ALL_MODULES.map((m) => m.key),
      templateId,
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
        enabledModules: formData.enabledModules,
        industryTemplateId: formData.templateId || undefined,
        name: formData.name,
        slug: formData.slug || undefined,
      });

      if (res?.success) {
        toast.success("Firma başarıyla oluşturuldu.");
        setIsCreateModalOpen(false);
        setFormData({
          enabledModules: ALL_MODULES.map((m) => m.key),
          name: "",
          slug: "",
          templateId: templates[0]?.id || "",
        });
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Firma oluşturulurken bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (
    tenantId: string,
    currentStatus: boolean
  ) => {
    try {
      const res = await apiClient.put<any>(
        `/api/admin/tenants/${tenantId}/status`,
        {
          isActive: !currentStatus,
        }
      );
      if (res?.success) {
        toast.success(
          `Firma ${currentStatus ? "askıya alındı" : "aktifleştirildi"}.`
        );
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, isActive: !currentStatus } : t
          )
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
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            Kayıtlı Firmalar
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Sistemdeki kiracı firmaları, modül izinlerini ve terminolojiyi
            yönetin.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white text-xs shadow-sm transition hover:bg-blue-500 active:scale-95"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Firma Ekle</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute top-3 left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
        <input
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-4 pl-10 text-xs text-zinc-800 placeholder-zinc-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Firma adı veya slug ile ara..."
          type="text"
          value={searchTerm}
        />
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-zinc-200/80 bg-zinc-50/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
              <TableRow>
                <TableHead className="px-5 py-3.5 h-auto">Firma / Çalışma Alanı</TableHead>
                <TableHead className="px-5 py-3.5 h-auto">Sektör Şablonu</TableHead>
                <TableHead className="px-5 py-3.5 h-auto">Aktif Modüller</TableHead>
                <TableHead className="px-5 py-3.5 h-auto">Üyeler</TableHead>
                <TableHead className="px-5 py-3.5 h-auto">Durum</TableHead>
                <TableHead className="px-5 py-3.5 text-right h-auto">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
              {loading ? (
                <TableRow>
                  <TableCell
                    className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                    colSpan={6}
                  >
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
                    Firmalar yükleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-12 text-center text-zinc-400 dark:text-zinc-500"
                    colSpan={6}
                  >
                    Kayıtlı firma bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => (
                  <TableRow
                    className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                    key={tenant.id}
                  >
                    {/* Name & Slug */}
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 font-bold text-blue-600 text-xs">
                          {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            className="font-bold text-sm text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                            href={`/admin/tenants/${tenant.id}`}
                          >
                            {tenant.name}
                          </Link>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            /{tenant.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Template */}
                    <TableCell className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/60 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {tenant.industryTemplateName ??
                          tenant.industry ??
                          "Genel"}
                      </span>
                    </TableCell>

                    {/* Modules */}
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                        <Layers className="h-3.5 w-3.5 text-blue-600" />
                        <span>
                          {tenant.enabledModuleCount} / {ALL_MODULES.length}{" "}
                          aktif
                        </span>
                      </div>
                    </TableCell>

                    {/* Members */}
                    <TableCell className="px-5 py-4 text-zinc-500 dark:text-zinc-400">
                      {tenant.memberCount} kullanıcı
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-5 py-4">
                      {tenant.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 font-bold text-[11px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/60 bg-rose-50 px-2.5 py-0.5 font-bold text-[11px] text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                          <XCircle className="h-3 w-3" />
                          Askıda
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className={`rounded-xl p-2 transition ${
                            tenant.isActive
                              ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                          onClick={() =>
                            handleToggleStatus(tenant.id, tenant.isActive)
                          }
                          title={
                            tenant.isActive
                              ? "Firmayı Askıya Al"
                              : "Firmayı Aktifleştir"
                          }
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <Link
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 transition hover:border-blue-300 hover:bg-white hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          href={`/admin/tenants/${tenant.id}`}
                          title="Firma Modül & Etiket Ayarları"
                        >
                          <Sliders className="h-4 w-4" />
                        </Link>
                        <Link
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 transition hover:border-blue-300 hover:bg-white hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          href={`/${tenant.slug}`}
                          target="_blank"
                          title="Çalışma Alanına Git"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE TENANT MODAL */}
      {isCreateModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-6 overflow-y-auto gap-0 p-6 sm:max-w-2xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Yeni Firma Tanımla
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sektör şablonu ve modül paketini yapılandırın
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <form className="space-y-4 text-xs" onSubmit={handleCreateTenant}>
              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300">
                    Firma Adı *
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Örn: Akıncı Otomotiv A.Ş."
                    required
                    type="text"
                    value={formData.name}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300">
                    Özel URL / Slug (Opsiyonel)
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="Örn: akinci-oto"
                    type="text"
                    value={formData.slug}
                  />
                </div>
              </div>

              {/* Sektör Şablonu */}
              <div>
                <label className="mb-1 block font-bold text-zinc-700 dark:text-zinc-300">
                  Sektör Şablonu
                </label>
                <Combobox
                  emptyMessage="Şablon bulunamadı."
                  onChange={(val) => handleTemplateChange(val)}
                  options={templates.map((tpl) => ({
                    description: tpl.description || tpl.key,
                    label: tpl.name,
                    value: tpl.id,
                  }))}
                  placeholder="Sektör şablonu seçin"
                  searchPlaceholder="Şablon ara..."
                  value={formData.templateId}
                />
              </div>

              {/* Modül Seçimi */}
              <div className="border-zinc-100 border-t pt-2 dark:border-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    Aktif Edilecek Modüller ({formData.enabledModules.length}{" "}
                    seçildi)
                  </label>
                  <button
                    className="font-semibold text-[11px] text-blue-600 hover:underline"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        enabledModules:
                          formData.enabledModules.length === ALL_MODULES.length
                            ? []
                            : ALL_MODULES.map((m) => m.key),
                      })
                    }
                    type="button"
                  >
                    {formData.enabledModules.length === ALL_MODULES.length
                      ? "Tümünü Kaldır"
                      : "Tümünü Seç"}
                  </button>
                </div>

                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                  {ALL_MODULES.map((mod) => {
                    const checked = formData.enabledModules.includes(mod.key);
                    return (
                      <label
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-2 transition ${
                          checked
                            ? "border-blue-200 bg-blue-50 font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                        key={mod.key}
                        onClick={() => handleToggleModule(mod.key)}
                      >
                        <span className="text-xs">{mod.name}</span>
                        <input
                          checked={checked}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-0 dark:border-zinc-700"
                          onChange={() => {}}
                          type="checkbox"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 border-zinc-100 border-t pt-4 dark:border-zinc-800">
                <button
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-sm hover:bg-blue-500 disabled:opacity-50"
                  disabled={creating}
                  type="submit"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Firmayı Oluştur</span>
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}

export default function AdminTenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
          Yükleniyor...
        </div>
      }
    >
      <AdminTenantsContent />
    </Suspense>
  );
}
