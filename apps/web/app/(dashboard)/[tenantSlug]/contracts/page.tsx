/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Adaptive Zinc/Violet · design-system: design.md · designed-as-app */
"use client";

import { Button } from "@workspace/ui/components/button";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type ContractDetailDto,
  type ContractListDto,
  type CustomerListDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

const formatCurrency = (amount: number, currency = "TRY"): string =>
  new Intl.NumberFormat("tr-TR", {
    currency: currency || "TRY",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount || 0);

export default function ContractsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [contracts, setContracts] = useState<ContractListDto[]>([]);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<ContractDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete modal states
  const [contractToDelete, setContractToDelete] = useState<{ id: string; title: string; contractNumber: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingContract, setIsDeletingContract] = useState(false);

  // New contract form
  const [newTitle, setNewTitle] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newTotalAmount, setNewTotalAmount] = useState<number>(0);
  const [newCurrency, setNewCurrency] = useState("TRY");
  const [newContentHtml, setNewContentHtml] = useState(
    `<div style="font-family: sans-serif; line-height: 1.6; color: #18181b;">
  <h2>HİZMET VE GİZLİLİK SÖZLEŞMESİ</h2>
  <p><strong>Madde 1 - Taraflar:</strong> İşbu sözleşme, CRM Hizmet Sağlayıcı ile Müşteri arasında akdedilmiştir.</p>
  <p><strong>Madde 2 - Konu:</strong> İşbu sözleşmenin konusu, kararlaştırılan hizmet ve ürünlerin temin edilmesidir.</p>
  <p><strong>Madde 3 - Süre ve Fesih:</strong> Taraflar 30 gün önceden yazılı bildirimle sözleşmeyi feshedebilir.</p>
</div>`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getContracts(
        {
          search: searchTerm || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
        tenantSlug
      );
      if (res.data?.items) {
        setContracts(res.data.items);
      } else {
        setContracts([]);
      }
    } catch {
      toast.error("Sözleşmeler yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, tenantSlug]);

  const loadCustomers = useCallback(async () => {
    if (!activeTenant?.id) return;
    try {
      const res = await ApiClient.getCustomers(
        activeTenant.id,
        { page: 1, pageSize: 100 }
      );
      if (res.data?.items) {
        setCustomers(res.data.items);
      }
    } catch {
      // ignore
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await ApiClient.getContractById(id, tenantSlug);
      if (res.data) {
        setSelectedContract(res.data);
      }
    } catch {
      toast.error("Sözleşme detayı yüklenemedi.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Lütfen sözleşme başlığını girin.");
      return;
    }
    if (!newCustomerId) {
      toast.error("Lütfen bir müşteri seçin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiClient.createContract(
        {
          contentHtml: newContentHtml,
          currency: newCurrency,
          customerId: newCustomerId,
          title: newTitle,
          totalAmount: Number(newTotalAmount) || 0,
        },
        tenantSlug
      );
      if (res.success || res.data?.id) {
        toast.success("Sözleşme başarıyla oluşturuldu.");
        setIsCreateModalOpen(false);
        setNewTitle("");
        setNewCustomerId("");
        setNewTotalAmount(0);
        loadContracts();
      } else {
        toast.error(res.message || "Sözleşme oluşturulamadı.");
      }
    } catch {
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromptDelete = (contract: { id: string; title: string; contractNumber: string }) => {
    setContractToDelete(contract);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    setIsDeletingContract(true);
    try {
      await ApiClient.deleteContract(contractToDelete.id, tenantSlug);
      toast.success("Sözleşme silindi.");
      if (selectedContract?.id === contractToDelete.id) {
        setSelectedContract(null);
      }
      setIsDeleteDialogOpen(false);
      setContractToDelete(null);
      loadContracts();
    } catch {
      toast.error("Sözleşme silinemedi.");
    } finally {
      setIsDeletingContract(false);
    }
  };

  // KPIs
  const totalCount = contracts.length;
  const signedCount = contracts.filter(
    (c) => c.status === "Signed" || c.status === "Active"
  ).length;
  const draftCount = contracts.filter(
    (c) => c.status === "Draft" || c.status === "Sent"
  ).length;
  const totalValue = contracts.reduce(
    (acc, c) => acc + (Number(c.totalAmount) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header & Action Path */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-zinc-200/80 border-b pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Sözleşmeler & E-İmza
            </h1>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-medium text-violet-600 text-xs dark:bg-violet-500/20 dark:text-violet-400">
              B2B Dijital Onay
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Müşteri sözleşmelerini oluşturun, tekliflerle ilişkilendirin ve
            çevrimiçi e-imza ile yürürlüğe alın.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            className="flex items-center gap-2"
            onClick={() => loadContracts()}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Yenile
          </Button>

          <Button
            className="flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]"
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Yeni Sözleşme Oluştur
          </Button>
        </div>
      </div>

      {/* 2. Bento Grid KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase dark:text-zinc-400">
              Toplam Sözleşme
            </span>
            <FileText className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 font-semibold text-2xl text-zinc-900 tabular-nums dark:text-zinc-100">
            {totalCount}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase dark:text-zinc-400">
              İmzalanan / Aktif
            </span>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-semibold text-2xl text-emerald-600 tabular-nums dark:text-emerald-400">
            {signedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase dark:text-zinc-400">
              Onay Bekleyenler
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-semibold text-2xl text-amber-600 tabular-nums dark:text-amber-400">
            {draftCount}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase dark:text-zinc-400">
              Toplam Portföy Değeri
            </span>
            <ShieldCheck className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 font-semibold text-2xl text-zinc-900 tabular-nums dark:text-zinc-100">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <input
              className="h-9 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/50 pr-3 pl-9 text-xs text-zinc-900 outline-hidden transition focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100 dark:focus:border-violet-400"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sözleşme no, başlık veya müşteri ara..."
              type="text"
              value={searchTerm}
            />
          </div>

          <div className="flex items-center gap-1">
            {["ALL", "Draft", "Sent", "Signed", "Active"].map((s) => (
              <button
                className={`rounded-lg px-2.5 py-1.5 font-medium text-xs transition ${
                  statusFilter === s
                    ? "bg-violet-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
                key={s}
                onClick={() => setStatusFilter(s)}
                type="button"
              >
                {s === "ALL"
                  ? "Tümü"
                  : s === "Draft"
                    ? "Taslak"
                    : s === "Sent"
                      ? "Gönderildi"
                      : s === "Signed"
                        ? "İmzalandı"
                        : "Aktif"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Contracts Table (Workbench Table Invariant) */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <table className="w-full text-left text-xs">
          <thead className="border-zinc-200/80 border-b bg-zinc-50/75 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            <tr>
              <th className="py-3 pr-4 pl-5 font-semibold">Sözleşme No</th>
              <th className="px-4 py-3 font-semibold">Başlık & Müşteri</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 text-right font-semibold">Tutar</th>
              <th className="px-4 py-3 font-semibold">İmza Durumu</th>
              <th className="py-3 pr-5 pl-4 text-right font-semibold">
                Aksiyonlar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {isLoading ? (
              <tr>
                <td className="py-12 text-center text-zinc-500" colSpan={6}>
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-500" />
                  <span className="mt-2 block">Yükleniyor...</span>
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td className="py-12 text-center text-zinc-500" colSpan={6}>
                  Kayıtlı sözleşme bulunamadı.
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr
                  className="transition hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                  key={c.id}
                >
                  <td className="py-3 pr-4 pl-5 font-medium font-mono text-zinc-900 dark:text-zinc-100">
                    {c.contractNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {c.customerName || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-[11px] ${
                        c.status === "Signed" || c.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : c.status === "Draft"
                            ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}
                    >
                      {c.status === "Signed"
                        ? "İmzalandı"
                        : c.status === "Draft"
                          ? "Taslak"
                          : c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                    {formatCurrency(c.totalAmount, c.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {c.signedAt ? (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {new Date(c.signedAt).toLocaleDateString("tr-TR")} (
                          {c.signedByName})
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">İmza Bekliyor</span>
                    )}
                  </td>
                  <td className="py-3 pr-5 pl-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {c.publicToken && (
                        <button
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          onClick={() => {
                            const url = `${window.location.origin}/portal/${c.publicToken}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Müşteri imza linki kopyalandı.");
                          }}
                          title="İmza Linkini Kopyala"
                          type="button"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        onClick={() => handleOpenDetail(c.id)}
                        title="İncele & Önizle"
                        type="button"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>

                      <button
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        onClick={() => handlePromptDelete({ id: c.id, title: c.title, contractNumber: c.contractNumber })}
                        title="Sil"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Create Contract Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-zinc-200 border-b px-6 py-4 dark:border-zinc-800">
              <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                Yeni Sözleşme Oluştur
              </h2>
              <button
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="flex-1 overflow-y-auto p-6"
              onSubmit={handleCreateContract}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Sözleşme Başlığı *
                  </label>
                  <input
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 outline-hidden focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: 2026 Yıllık Yazılım Bakım Sözleşmesi"
                    required
                    type="text"
                    value={newTitle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Müşteri Seçin *
                    </label>
                    <SelectField
                      onChange={(val) => setNewCustomerId(val)}
                      options={customers.map((cust) => ({
                        label: cust.name,
                        value: cust.id,
                      }))}
                      placeholder="Müşteri Seçin..."
                      value={newCustomerId}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                      Sözleşme Bedeli & Para Birimi
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <NumberInput
                          min={0}
                          onChange={(val) => setNewTotalAmount(val)}
                          precision={2}
                          step={100}
                          value={newTotalAmount}
                        />
                      </div>
                      <div className="w-28 shrink-0">
                        <SelectField
                          onChange={(val) => setNewCurrency(val)}
                          options={[
                            { label: "TRY (₺)", value: "TRY" },
                            { label: "USD ($)", value: "USD" },
                            { label: "EUR (€)", value: "EUR" },
                          ]}
                          value={newCurrency}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Sözleşme Maddeleri (HTML Metin)
                  </label>
                  <textarea
                    className="min-h-[160px] w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900 outline-hidden focus:border-violet-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    onChange={(e) => setNewContentHtml(e.target.value)}
                    value={newContentHtml}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-zinc-200 border-t pt-4 dark:border-zinc-800">
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Vazgeç
                </Button>
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Sözleşmeyi Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Contract Detail & Preview Drawer */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between border-zinc-200 border-b p-5 dark:border-zinc-800">
              <div>
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                  {selectedContract.title}
                </h3>
                <p className="font-mono text-xs text-zinc-500">
                  {selectedContract.contractNumber}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  onClick={() =>
                    handlePromptDelete({
                      contractNumber: selectedContract.contractNumber,
                      id: selectedContract.id,
                      title: selectedContract.title,
                    })
                  }
                  title="Sözleşmeyi Sil"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setSelectedContract(null)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col gap-6">
                {/* Audit summary */}
                <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-800/60 dark:bg-violet-950/30">
                  <h4 className="flex items-center gap-1.5 font-semibold text-violet-900 text-xs dark:text-violet-300">
                    <ShieldCheck className="h-4 w-4" />
                    E-İmza & Güvenlik Özeti
                  </h4>
                  <div className="mt-2 space-y-1 text-violet-800/80 text-xs dark:text-violet-400">
                    <div>
                      <strong>İmzalayan:</strong>{" "}
                      {selectedContract.signedByName || "Henüz imzalanmadı"}
                    </div>
                    {selectedContract.signedAt && (
                      <div>
                        <strong>İmza Tarihi:</strong>{" "}
                        {new Date(selectedContract.signedAt).toLocaleString(
                          "tr-TR"
                        )}
                      </div>
                    )}
                    {selectedContract.auditHash && (
                      <div className="break-all font-mono text-[10px]">
                        <strong>SHA-256 Audit Hash:</strong>{" "}
                        {selectedContract.auditHash}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content preview */}
                <div>
                  <h4 className="mb-2 font-medium text-xs text-zinc-700 uppercase dark:text-zinc-300">
                    Sözleşme Metni Önizleme
                  </h4>
                  <div
                    className="prose prose-sm dark:prose-invert rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
                    dangerouslySetInnerHTML={{
                      __html: selectedContract.contentHtml,
                    }}
                  />
                </div>

                {/* Digital Signature rendering */}
                {selectedContract.signatureImageUrl && (
                  <div>
                    <h4 className="mb-2 font-medium text-xs text-zinc-700 uppercase dark:text-zinc-300">
                      Müşteri Dijital İmzası
                    </h4>
                    <div className="inline-block rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="E-İmza"
                        className="max-h-24 object-contain"
                        src={selectedContract.signatureImageUrl}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-zinc-200 border-t p-4 dark:border-zinc-800">
              <Button
                onClick={() => {
                  window.print();
                }}
                size="sm"
                variant="outline"
              >
                Yazdır / PDF
              </Button>
              <Button
                className="bg-violet-600 text-white hover:bg-violet-700"
                onClick={() => setSelectedContract(null)}
                size="sm"
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Sözleşme Silme Onay Penceresi */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Sözleşmeyi Sil"
        description={`"${contractToDelete?.contractNumber || ""} - ${contractToDelete?.title || ""}" sözleşmesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="destructive"
        loading={isDeletingContract}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
