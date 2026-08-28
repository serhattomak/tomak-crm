"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Link as LinkIcon,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CustomerListDto,
  type DealSummaryDto,
  type ProductListDto,
  type QuoteDetailDto,
  type QuoteStatsResponse,
  type QuoteSummaryDto,
  type QuoteTemplateDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

// Currency Formatter Helper
const formatCurrency = (amount: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    currency: currency || "TRY",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount || 0);

export default function QuotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  // State
  const [quotes, setQuotes] = useState<QuoteSummaryDto[]>([]);
  const [stats, setStats] = useState<QuoteStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [printQuoteId, setPrintQuoteId] = useState<string | null>(null);

  // Fetch Quotes
  const fetchQuotes = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getQuotes(
        {
          search: searchTerm || undefined,
          status: selectedStatus === "All" ? undefined : selectedStatus,
        },
        activeTenant.id
      );

      if (res.success && res.data) {
        setQuotes(res.data.items || []);
      }
    } catch {
      toast.error("Teklifler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id, searchTerm, selectedStatus]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsStatsLoading(true);
    try {
      const res = await ApiClient.getQuoteStats(activeTenant.id);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsStatsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchQuotes();
    fetchStats();
  }, [fetchQuotes, fetchStats]);

  // Check URL query for direct quote detail opening
  useEffect(() => {
    const qid = searchParams.get("quoteId");
    if (qid) {
      setSelectedQuoteId(qid);
    }
  }, [searchParams]);

  // Status Tab counts helper
  const statusCounts = useMemo(
    () => ({
      Accepted: quotes.filter((q) => q.status === "Accepted").length,
      All: quotes.length,
      Draft: quotes.filter((q) => q.status === "Draft").length,
      Expired: quotes.filter((q) => q.status === "Expired").length,
      PendingApproval: quotes.filter((q) => q.status === "PendingApproval")
        .length,
      Rejected: quotes.filter((q) => q.status === "Rejected").length,
      RevisionRequested: quotes.filter((q) => q.status === "RevisionRequested")
        .length,
      Sent: quotes.filter((q) => q.status === "Sent" || q.status === "Viewed")
        .length,
    }),
    [quotes]
  );

  return (
    <div className="space-y-6 p-6">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100 text-xl tracking-tight">
                Teklif Yönetimi & Fiyatlandırma
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                Müşteri teklifleri, çoklu revizyonlar, iskonto onayları ve
                sipariş dönüşümleri
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() => setIsTemplatesOpen(true)}
            type="button"
          >
            <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Şart Şablonları</span>
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200"
            onClick={() => {
              fetchQuotes();
              fetchStats();
            }}
            title="Yenile"
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>

          <PermissionGate permission="Quotes.Create">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Teklif Oluştur</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Proposals Volume */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">
              Açık Teklif Hacmi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
              {formatCurrency(stats?.activeProposalsVolume || 0)}
            </div>
            <p className="mt-1 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
              {stats?.totalQuotes || 0} toplam teklif kaydı
            </p>
          </div>
        </div>

        {/* Card 2: Conversion Rate */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">
              Kabul & Kazanma Oranı
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                %{stats?.conversionRate || 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                {stats?.acceptedCount || 0} Sipariş
              </span>
            </div>
            <p className="mt-1 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
              Onaylanan ve siparişe dönüşen teklifler
            </p>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">
              Yönetici Onayı Bekleyen
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
              {stats?.pendingApprovalCount || 0}
            </div>
            <p className="mt-1 font-medium text-[11px] text-amber-600">
              İskonto / limit eşiği aşan teklifler
            </p>
          </div>
        </div>

        {/* Card 4: Sent / Viewed / Expired */}
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">
              Müşteride Olanlar
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                {stats?.sentCount || 0}
              </span>
              {stats?.expiredCount ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-bold text-[10px] text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.expiredCount} Süresi Dolan
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
              İncelemede & karar bekleyenler
            </p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Status Filter Tabs */}
      <div className="space-y-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-2xs">
        {/* Status Pills */}
        <div className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { key: "All", label: "Tüm Teklifler" },
            { key: "RevisionRequested", label: "Revizyon Talepleri" },
            { key: "Draft", label: "Taslaklar" },
            { key: "PendingApproval", label: "Onay Bekleyenler" },
            { key: "Sent", label: "Müşteride" },
            { key: "Accepted", label: "Kabul Edilenler" },
            { key: "Rejected", label: "Reddedilenler" },
            { key: "Expired", label: "Süresi Dolanlar" },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.key;
            return (
              <button
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-bold text-[10px] ${
                    isSelected
                      ? "bg-blue-500 text-white"
                      : "bg-slate-200 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {statusCounts[tab.key as keyof typeof statusCounts] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-2 pr-4 pl-10 text-zinc-900 dark:text-zinc-100 text-xs transition placeholder:text-zinc-400 dark:text-zinc-500 focus:border-blue-500 focus:bg-white dark:bg-zinc-900 focus:outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Teklif no, başlık veya müşteri adına göre ara..."
              type="text"
              value={searchTerm}
            />
          </div>
        </div>
      </div>

      {/* 4. Quotes Data Table */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xs">
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-zinc-500 dark:text-zinc-400">
            <RefreshCw className="mb-3 h-8 w-8 animate-spin text-blue-600" />
            <span className="font-semibold text-xs">
              Teklifler yükleniyor...
            </span>
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              Teklif Bulunamadı
            </h3>
            <p className="mt-1 max-w-sm text-zinc-500 dark:text-zinc-400 text-xs">
              Bu filtre kriterlerine uygun teklif kaydı bulunamadı. Yeni bir
              teklif oluşturabilirsiniz.
            </p>
            <PermissionGate permission="Quotes.Create">
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
                onClick={() => setIsCreateOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>Teklif Oluştur</span>
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div>
            {/* Mobile Card List View (Visible on small screens) */}
            <div className="block divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
              {quotes.map((quote) => (
                <div
                  className={`cursor-pointer p-4 transition active:bg-zinc-50 dark:bg-zinc-800/50 ${
                    quote.status === "RevisionRequested"
                      ? "border-l-4 border-l-amber-500 bg-amber-50/40"
                      : ""
                  }`}
                  key={quote.id}
                  onClick={() => setSelectedQuoteId(quote.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 text-xs">
                          {quote.quoteNumber}
                        </span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.2 font-bold text-[10px] text-blue-700">
                          R{quote.revisionNumber}
                        </span>
                      </div>
                      <h4 className="mt-1 line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                        {quote.title}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Building className="h-3 w-3 flex-none text-zinc-400 dark:text-zinc-500" />
                        <span className="truncate">{quote.customerName}</span>
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1.5">
                      <QuoteStatusBadge status={quote.status} />
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-t pt-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {quote.itemCount} Kalem
                      </span>
                      {quote.validUntil && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            SKT:{" "}
                            {new Date(quote.validUntil).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => {
                          const publicUrl = `${window.location.origin}/quotes/view/${quote.publicViewToken}`;
                          navigator.clipboard.writeText(publicUrl);
                          toast.success("Müşteri linki kopyalandı");
                        }}
                        title="Link Kopyala"
                        type="button"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                        onClick={() => setPrintQuoteId(quote.id)}
                        title="PDF"
                        type="button"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="ml-1 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Visible on medium+ screens) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50/70 dark:bg-zinc-800/40 font-bold text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Teklif No & Revizyon</th>
                    <th className="px-4 py-3.5">Teklif Başlığı & Müşteri</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Tutar & İskonto</th>
                    <th className="px-4 py-3.5">Geçerlilik</th>
                    <th className="px-4 py-3.5">Temsilci</th>
                    <th className="px-4 py-3.5 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                  {quotes.map((quote) => {
                    return (
                      <tr
                        className={`group cursor-pointer transition hover:bg-blue-50/40 ${
                          quote.status === "RevisionRequested"
                            ? "border-l-4 border-l-amber-500 bg-amber-50/50"
                            : ""
                        }`}
                        key={quote.id}
                        onClick={() => setSelectedQuoteId(quote.id)}
                      >
                        {/* 1. Quote Number & Revision Badge */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                              {quote.quoteNumber}
                            </span>
                            <span className="rounded-md bg-blue-100 px-1.5 py-0.5 font-bold text-[10px] text-blue-700">
                              R{quote.revisionNumber}
                            </span>
                          </div>
                          <span className="mt-0.5 block text-[10px] text-zinc-400 dark:text-zinc-500">
                            {quote.itemCount} Kalem
                          </span>
                        </td>

                        {/* 2. Title & Customer */}
                        <td className="max-w-xs px-4 py-3.5">
                          <span className="block truncate font-bold text-zinc-900 dark:text-zinc-100 transition group-hover:text-blue-600">
                            {quote.title}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <Building className="h-3 w-3 flex-none text-zinc-400 dark:text-zinc-500" />
                            <span className="truncate">
                              {quote.customerName}
                            </span>
                          </div>
                        </td>

                        {/* 3. Status Badge */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <QuoteStatusBadge status={quote.status} />
                        </td>

                        {/* 4. Total Amount & Discount */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="block font-extrabold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(quote.totalAmount, quote.currency)}
                          </span>
                          {quote.discountAmount > 0 && (
                            <span className="block font-semibold text-[10px] text-rose-600">
                              -%{quote.discountRate} İskonto (
                              {formatCurrency(
                                quote.discountAmount,
                                quote.currency
                              )}
                              )
                            </span>
                          )}
                        </td>

                        {/* 5. Valid Until */}
                        <td className="whitespace-nowrap px-4 py-3.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {quote.validUntil ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                              <span>
                                {new Date(quote.validUntil).toLocaleDateString(
                                  "tr-TR"
                                )}
                              </span>
                            </div>
                          ) : (
                            <span>Süresiz</span>
                          )}
                        </td>

                        {/* 6. Assigned User */}
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {quote.assignedUserName ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-[10px] text-zinc-700 dark:text-zinc-300">
                                {quote.assignedUserName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                                {quote.assignedUserName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 text-xs italic">
                              Atanmamış
                            </span>
                          )}
                        </td>

                        {/* 7. Action Buttons */}
                        <td
                          className="whitespace-nowrap px-4 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                              onClick={() => setSelectedQuoteId(quote.id)}
                              title="Detay & İncele"
                              type="button"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                              onClick={() => setPrintQuoteId(quote.id)}
                              title="Yazdır / PDF"
                              type="button"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-zinc-400 dark:text-zinc-500 transition hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => {
                                const publicUrl = `${window.location.origin}/quotes/view/${quote.publicViewToken}`;
                                navigator.clipboard.writeText(publicUrl);
                                toast.success(
                                  "Müşteri dijital teklif linki panoya kopyalandı"
                                );
                              }}
                              title="Müşteri Linkini Kopyala"
                              type="button"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Create Quote Modal */}
      {isCreateOpen && (
        <CreateQuoteModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            fetchQuotes();
            fetchStats();
          }}
        />
      )}

      {/* 6. Quote Detail Drawer */}
      {selectedQuoteId && (
        <QuoteDetailDrawer
          onClose={() => setSelectedQuoteId(null)}
          onPrint={(qid) => setPrintQuoteId(qid)}
          onUpdated={() => {
            fetchQuotes();
            fetchStats();
          }}
          quoteId={selectedQuoteId}
        />
      )}

      {/* 7. Quote Templates Modal */}
      {isTemplatesOpen && (
        <QuoteTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
        />
      )}

      {/* 8. Print Modal */}
      {printQuoteId && (
        <QuotePrintModal
          onClose={() => setPrintQuoteId(null)}
          quoteId={printQuoteId}
        />
      )}
    </div>
  );
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================
function QuoteStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "RevisionRequested":
      return (
        <span className="inline-flex animate-pulse items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-extrabold text-[10px] text-amber-700 shadow-2xs">
          <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
          Revizyon İstendi
        </span>
      );
    case "Draft":
      return (
        <span className="inline-flex items-center rounded-lg border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 font-bold text-[10px] text-zinc-700 dark:text-zinc-300">
          Taslak
        </span>
      );
    case "PendingApproval":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-bold text-[10px] text-amber-700">
          <AlertCircle className="h-3 w-3" />
          Onay Bekliyor
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Onaylandı
        </span>
      );
    case "Sent":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-bold text-[10px] text-blue-700">
          <Send className="h-3 w-3" />
          Müşteride
        </span>
      );
    case "Viewed":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-0.5 font-bold text-[10px] text-purple-700">
          <Eye className="h-3 w-3" />
          İncelendi
        </span>
      );
    case "Accepted":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700">
          <Award className="h-3 w-3" />
          Kabul Edildi
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-bold text-[10px] text-rose-700">
          <XCircle className="h-3 w-3" />
          Reddedildi
        </span>
      );
    case "Expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-0.5 font-bold text-[10px] text-red-700">
          <Clock className="h-3 w-3" />
          Süresi Doldu
        </span>
      );
    case "Revised":
      return (
        <span className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 font-bold text-[10px] text-zinc-500 dark:text-zinc-400">
          Revize Edildi
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 font-bold text-[10px] text-zinc-600 dark:text-zinc-400">
          {status}
        </span>
      );
  }
}

// ============================================================================
// CREATE QUOTE MODAL WIZARD
// ============================================================================
interface CreateQuoteItemForm {
  description?: string;
  discountRate: number;
  isOptional: boolean;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxRate: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
  variantId?: string;
}

function CreateQuoteModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { activeTenant, profile } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data sources
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [deals, setDeals] = useState<DealSummaryDto[]>([]);
  const [products, setProducts] = useState<ProductListDto[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplateDto[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [dealId, setDealId] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [validDays, setValidDays] = useState("15");
  const [discountType, setDiscountType] = useState<"Percentage" | "Amount">(
    "Percentage"
  );
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Terms & Conditions
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [items, setItems] = useState<CreateQuoteItemForm[]>([
    {
      discountRate: 0,
      isOptional: false,
      productName: "",
      quantity: 1,
      taxRate: 20,
      unit: "Adet",
      unitCost: 0,
      unitPrice: 0,
    },
  ]);

  // Load supporting options
  useEffect(() => {
    if (!activeTenant?.id) {
      return;
    }
    const loadData = async () => {
      try {
        const [cRes, dRes, pRes, tRes] = await Promise.all([
          ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
          ApiClient.getDeals({ pageSize: 100 }, activeTenant.id),
          ApiClient.getProducts({ pageSize: 100 }, activeTenant.id),
          ApiClient.getQuoteTemplates(activeTenant.id),
        ]);

        if (cRes.success && cRes.data?.items) {
          setCustomers(cRes.data.items);
        }
        if (dRes.success && dRes.data?.items) {
          setDeals(dRes.data.items);
        }
        if (pRes.success && pRes.data?.items) {
          setProducts(pRes.data.items);
        }
        if (tRes.success && tRes.data) {
          setTemplates(tRes.data);
          const def = tRes.data.find((t) => t.isDefault);
          if (def) {
            setSelectedTemplateId(def.id);
            setTermsAndConditions(def.termsAndConditions || "");
            setPaymentTerms(def.paymentTerms || "");
            setDeliveryTerms(def.deliveryTerms || "");
            setBankDetails(def.bankDetails || "");
          }
        }
      } catch {
        // ignore
      }
    };
    loadData();
  }, [activeTenant?.id]);

  // Handle template switch
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setTermsAndConditions(tmpl.termsAndConditions || "");
      setPaymentTerms(tmpl.paymentTerms || "");
      setDeliveryTerms(tmpl.deliveryTerms || "");
      setBankDetails(tmpl.bankDetails || "");
    }
  };

  // Handle customer pick
  const handleCustomerPick = (cId: string) => {
    setCustomerId(cId);
    const c = customers.find((cust) => cust.id === cId);
    if (c) {
      setCustomerName(c.name);
      if (!title) {
        setTitle(`${c.name} - Hizmet/Ürün Teklifi`);
      }
    }
  };

  // Handle deal pick
  const handleDealPick = (dId: string) => {
    setDealId(dId);
    const d = deals.find((deal) => deal.id === dId);
    if (d) {
      if (d.customerId) {
        setCustomerId(d.customerId);
        const c = customers.find((cust) => cust.id === d.customerId);
        if (c) {
          setCustomerName(c.name);
        }
      }
      if (d.contactName && !customerName) {
        setCustomerName(d.contactName);
      }
      if (d.currency) {
        setCurrency(d.currency);
      }
      setTitle(`${d.title} Teklifi`);
    }
  };

  // Add Item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        discountRate: 0,
        isOptional: false,
        productName: "",
        quantity: 1,
        taxRate: 20,
        unit: "Adet",
        unitCost: 0,
        unitPrice: 0,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Update item field
  const handleItemChange = (
    index: number,
    field: keyof CreateQuoteItemForm,
    val: any
  ) => {
    const next = [...items];
    next[index] = { ...next[index]!, [field]: val };

    // If product picked, autofill
    if (field === "productId") {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        next[index]!.productName = prod.name;
        next[index]!.sku = prod.sku;
        next[index]!.unitPrice = prod.sellingPrice || 0;
        next[index]!.unitCost = prod.costPrice || 0;
        next[index]!.taxRate = prod.taxRate ?? 20;
        next[index]!.unit = prod.unit || "Adet";
      }
    }

    setItems(next);
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalItemDiscount = 0;
    let requiresApproval = false;

    items.forEach((item) => {
      if (item.isOptional) {
        return;
      }
      const raw = (item.unitPrice || 0) * (item.quantity || 1);
      const itemDisc =
        item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
      const afterDisc = Math.max(0, raw - itemDisc);
      const itemTax = item.taxRate > 0 ? afterDisc * (item.taxRate / 100) : 0;

      if (item.discountRate > 20) {
        requiresApproval = true;
      }

      subtotal += afterDisc;
      totalTax += itemTax;
      totalItemDiscount += itemDisc;
    });

    let generalDiscountAmt = 0;
    if (discountType === "Percentage" && discountRate > 0) {
      generalDiscountAmt = subtotal * (discountRate / 100);
      if (discountRate > 15) {
        requiresApproval = true;
      }
    } else if (discountType === "Amount" && discountAmount > 0) {
      generalDiscountAmt = discountAmount;
      if (subtotal > 0 && generalDiscountAmt / subtotal > 0.15) {
        requiresApproval = true;
      }
    }

    const grandTotal = Math.max(0, subtotal - generalDiscountAmt + totalTax);

    return {
      generalDiscountAmt,
      grandTotal,
      requiresApproval,
      subtotal,
      totalDiscount: totalItemDiscount + generalDiscountAmt,
      totalItemDiscount,
      totalTax,
    };
  }, [items, discountType, discountRate, discountAmount]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.id) {
      return;
    }
    if (!customerName.trim()) {
      toast.error("Lütfen müşteri adı belirtin");
      return;
    }
    if (!title.trim()) {
      toast.error("Lütfen teklif başlığı girin");
      return;
    }
    if (items.some((i) => !i.productName.trim())) {
      toast.error("Lütfen tüm kalemlerin ürün/hizmet adını girin");
      return;
    }

    setIsSubmitting(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(
        validUntil.getDate() + (Number.parseInt(validDays) || 15)
      );

      const payload = {
        assignedUserId: profile?.id,
        assignedUserName: profile?.fullName || "Temsilci",
        bankDetails: bankDetails.trim() || undefined,
        currency,
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        dealId: dealId || undefined,
        deliveryTerms: deliveryTerms.trim() || undefined,
        discountAmount: calculations.generalDiscountAmt,
        discountRate,
        discountType,
        items: items.map((i, idx) => ({
          description: i.description?.trim(),
          discountRate: i.discountRate || 0,
          isOptional: i.isOptional,
          isSelected: true,
          orderIndex: idx,
          productId: i.productId || undefined,
          productName: i.productName.trim(),
          quantity: i.quantity || 1,
          sku: i.sku?.trim(),
          taxRate: i.taxRate ?? 20,
          unit: i.unit || "Adet",
          unitCost: i.unitCost || 0,
          unitPrice: i.unitPrice || 0,
          variantId: i.variantId || undefined,
        })),
        notes: notes.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        title: title.trim(),
        validUntil: validUntil.toISOString(),
      };

      const res = await ApiClient.createQuote(payload, activeTenant.id);
      if (res.success) {
        toast.success(
          calculations.requiresApproval
            ? "Teklif oluşturuldu (İskonto eşiği aşıldığı için Yönetici Onayına sunuldu)"
            : "Teklif başarıyla oluşturuldu"
        );
        onClose();
        onCreated();
      } else {
        toast.error(res.message || "Teklif oluşturulamadı");
      }
    } catch {
      toast.error("Teklif kaydedilirken bir hata meydana geldi");
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
      {/* Backdrop with Click-to-Close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50 dark:bg-zinc-800/50 p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-base text-zinc-900 dark:text-zinc-100 sm:text-lg">
                Yeni Teklif Hazırla
              </h2>
              <p className="truncate text-zinc-500 dark:text-zinc-400 text-xs">
                Müşteri, ürün kalemleri, KDV, iskonto ve şartnameleri belirleyin
              </p>
            </div>
          </div>

          <button
            className="shrink-0 rounded-xl p-2 text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-400"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          className="custom-scrollbar space-y-6 overflow-y-auto p-4 sm:p-6"
          onSubmit={handleSubmit}
        >
          {/* Section 1: Customer & Deal Linking */}
          <div className="space-y-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <h3 className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>1. Müşteri & Fırsat Bilgileri</span>
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Customer select or text */}
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Müşteri Seçin
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => handleCustomerPick(e.target.value)}
                  value={customerId}
                >
                  <option value="">-- Müşteri Listesinden Seç --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Müşteri Ünvanı *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Örn: ABC Holding A.Ş."
                  required
                  type="text"
                  value={customerName}
                />
              </div>

              {/* Deal Link */}
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Bağlı Pipeline Fırsatı (Opsiyonel)
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => handleDealPick(e.target.value)}
                  value={dealId}
                >
                  <option value="">-- Fırsat Bağlantısı Yok --</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({formatCurrency(d.value, d.currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Proposal Title */}
              <div className="sm:col-span-2">
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Teklif Başlığı *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Yıllık Yazılım ve Altyapı Lisans Teklifi"
                  required
                  type="text"
                  value={title}
                />
              </div>

              {/* Currency & Validity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                    Para Birimi
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setCurrency(e.target.value)}
                    value={currency}
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                    Geçerlilik
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setValidDays(e.target.value)}
                    value={validDays}
                  >
                    <option value="7">7 Gün</option>
                    <option value="15">15 Gün</option>
                    <option value="30">30 Gün</option>
                    <option value="60">60 Gün</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                <Package className="h-4 w-4 text-blue-600" />
                <span>2. Teklif Kalemleri & Ürünler</span>
              </h3>

              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700 text-xs transition hover:bg-blue-100"
                onClick={handleAddItem}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50/70 dark:bg-zinc-800/40 font-bold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="min-w-[200px] px-3 py-2.5">
                      Ürün / Hizmet Adı
                    </th>
                    <th className="w-20 px-2 py-2.5">Miktar</th>
                    <th className="w-24 px-2 py-2.5">Birim</th>
                    <th className="w-28 px-2 py-2.5">Birim Fiyat</th>
                    <th className="w-20 px-2 py-2.5">İskonto %</th>
                    <th className="w-20 px-2 py-2.5">KDV %</th>
                    <th className="w-28 px-2 py-2.5 text-right">Tutar</th>
                    <th className="w-10 px-2 py-2.5 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                  {items.map((item, idx) => {
                    const raw = (item.unitPrice || 0) * (item.quantity || 1);
                    const disc =
                      item.discountRate > 0
                        ? raw * (item.discountRate / 100)
                        : 0;
                    const afterDisc = Math.max(0, raw - disc);
                    const tax =
                      item.taxRate > 0 ? afterDisc * (item.taxRate / 100) : 0;
                    const total = afterDisc + tax;

                    return (
                      <tr
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${item.isOptional ? "bg-zinc-50 dark:bg-zinc-800/50 opacity-60" : ""}`}
                        key={idx}
                      >
                        {/* Product Picker or Free Text */}
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            {products.length > 0 && (
                              <select
                                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none"
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "productId",
                                    e.target.value
                                  )
                                }
                                value={item.productId || ""}
                              >
                                <option value="">
                                  -- Katalogdan Seç (Opsiyonel) --
                                </option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (
                                    {formatCurrency(p.sellingPrice, currency)})
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 font-semibold text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "productName",
                                  e.target.value
                                )
                              }
                              placeholder="Ürün / Hizmet açıklaması..."
                              required
                              type="text"
                              value={item.productName}
                            />
                            <div className="mt-1 flex items-center gap-2">
                              <label className="flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <input
                                  checked={item.isOptional}
                                  className="rounded text-blue-600 focus:ring-0"
                                  onChange={(e) =>
                                    handleItemChange(
                                      idx,
                                      "isOptional",
                                      e.target.checked
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>
                                  Opsiyonel Kalem (Toplama dahil edilmez)
                                </span>
                              </label>
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-2 py-2.5">
                          <input
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-center text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                            min="0.01"
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "quantity",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            required
                            step="0.01"
                            type="number"
                            value={item.quantity}
                          />
                        </td>

                        {/* Unit */}
                        <td className="px-2 py-2.5">
                          <input
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-center text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                            onChange={(e) =>
                              handleItemChange(idx, "unit", e.target.value)
                            }
                            type="text"
                            value={item.unit}
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="px-2 py-2.5">
                          <input
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-right font-semibold text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                            min="0"
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "unitPrice",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            required
                            step="0.01"
                            type="number"
                            value={item.unitPrice}
                          />
                        </td>

                        {/* Discount Rate */}
                        <td className="px-2 py-2.5">
                          <input
                            className={`w-full rounded-lg border px-2 py-1 text-center font-bold text-xs focus:outline-none ${
                              item.discountRate > 20
                                ? "border-amber-400 bg-amber-50 text-amber-800"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            }`}
                            max="100"
                            min="0"
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "discountRate",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            type="number"
                            value={item.discountRate}
                          />
                        </td>

                        {/* Tax Rate */}
                        <td className="px-2 py-2.5">
                          <select
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1.5 py-1 text-center text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "taxRate",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            value={item.taxRate}
                          >
                            <option value="0">%0</option>
                            <option value="1">%1</option>
                            <option value="10">%10</option>
                            <option value="20">%20</option>
                          </select>
                        </td>

                        {/* Total Price */}
                        <td className="whitespace-nowrap px-2 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(total, currency)}
                        </td>

                        {/* Remove */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            className="rounded-md p-1 text-slate-300 transition hover:text-rose-600 disabled:opacity-30"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItem(idx)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Summary Totals & Approval Threshold Banner */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left: General Discount & Approval warning */}
            <div className="space-y-3">
              <div className="space-y-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-800/50 p-4">
                <h4 className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                  Genel Teklif İskontosu
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl bg-slate-200 p-0.5 font-semibold text-xs">
                    <button
                      className={`rounded-lg px-3 py-1 transition ${
                        discountType === "Percentage"
                          ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                      onClick={() => setDiscountType("Percentage")}
                      type="button"
                    >
                      Oran (%)
                    </button>
                    <button
                      className={`rounded-lg px-3 py-1 transition ${
                        discountType === "Amount"
                          ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                      onClick={() => setDiscountType("Amount")}
                      type="button"
                    >
                      Tutar ({currency})
                    </button>
                  </div>

                  {discountType === "Percentage" ? (
                    <input
                      className="w-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                      max="100"
                      min="0"
                      onChange={(e) =>
                        setDiscountRate(Number.parseFloat(e.target.value) || 0)
                      }
                      placeholder="%"
                      type="number"
                      value={discountRate || ""}
                    />
                  ) : (
                    <input
                      className="w-32 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                      min="0"
                      onChange={(e) =>
                        setDiscountAmount(
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Tutar"
                      type="number"
                      value={discountAmount || ""}
                    />
                  )}
                </div>
              </div>

              {calculations.requiresApproval && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                  <div className="text-xs">
                    <h5 className="font-bold text-amber-900">
                      Yönetici Onayı Gerekli
                    </h5>
                    <p className="mt-0.5 text-amber-700">
                      Uygulanan iskonto oranı (%15 üzeri) yetki eşiğini aştığı
                      için bu teklif oluşturulduğunda otomatik olarak{" "}
                      <b>Yönetici Onayı Bekliyor</b> durumuna alınacaktır.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Calculated Totals Card */}
            <div className="space-y-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-800/40 p-4">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(calculations.subtotal, currency)}
                </span>
              </div>

              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between font-medium text-rose-600 text-xs">
                  <span>Toplam İndirim & İskonto:</span>
                  <span className="font-bold">
                    -{formatCurrency(calculations.totalDiscount, currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-xs">
                <span>Hesaplanan KDV:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(calculations.totalTax, currency)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-zinc-200 dark:border-zinc-800 border-t pt-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Genel Toplam:
                </span>
                <span className="font-extrabold text-blue-600 text-xl">
                  {formatCurrency(calculations.grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Terms, Delivery, Bank Details Templates */}
          <div className="space-y-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-800/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>3. Şartlar, Koşullar & Banka Bilgileri</span>
              </h3>

              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Şablon Seç:
                  </span>
                  <select
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1 font-semibold text-zinc-800 dark:text-zinc-200 text-xs focus:outline-none"
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    value={selectedTemplateId}
                  >
                    <option value="">-- Şablon Seçin --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? "(Varsayılan)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Ödeme & Fatura Şartları
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Örn: %50 siparişte peşin, %50 teslimatta 30 gün vadeli."
                  rows={2}
                  value={paymentTerms}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Teslimat & Sevkiyat Şartları
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="Örn: Sipariş onayından itibaren 10 iş günü içerisinde adrese teslim."
                  rows={2}
                  value={deliveryTerms}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Banka Hesap & IBAN Bilgileri
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="Örn: Garanti BBVA TR12 0006 2000... (ABC Ltd Şti)"
                  rows={2}
                  value={bankDetails}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Genel Şartlar & Garanti Koşulları
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Örn: Ürünler 2 yıl resmi garantilidir. Fiyatlarımıza KDV dahildir."
                  rows={2}
                  value={termsAndConditions}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-zinc-200 dark:border-zinc-800 border-t pt-4">
            <button
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Teklifi Kaydet & Oluştur</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// QUOTE DETAIL DRAWER COMPONENT
// ============================================================================
function QuoteDetailDrawer({
  quoteId,
  onClose,
  onUpdated,
  onPrint,
}: {
  quoteId: string;
  onClose: () => void;
  onUpdated: () => void;
  onPrint: (id: string) => void;
}) {
  const { activeTenant, profile } = usePermissions();
  const [quote, setQuote] = useState<QuoteDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "items" | "terms" | "revisions" | "activities"
  >("items");

  // Approval & Action Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Confirm Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getQuoteById(quoteId, activeTenant.id);
      if (res.success && res.data) {
        setQuote(res.data);
      } else {
        toast.error("Teklif detayları alınamadı");
      }
    } catch {
      toast.error("Detay yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id, quoteId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Action: Send to Customer
  const handleSend = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await ApiClient.sendQuote(quote.id, activeTenant.id);
      if (res.success) {
        toast.success("Teklif müşteriye iletildi olarak işaretlendi");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "İşlem başarısız");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Action: Convert to Order
  const handleConvertToOrder = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await ApiClient.convertQuoteToOrder(
        quote.id,
        activeTenant.id
      );
      if (res.success) {
        toast.success("Teklif kabul edildi ve sipariş başarıyla oluşturuldu!");
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Dönüştürme başarısız");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Action: Manager Approval / Reject
  const handleApprove = async (isApproved: boolean) => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await ApiClient.approveQuote(
        quote.id,
        { approvalNotes: approvalNotes.trim(), isApproved },
        activeTenant.id
      );
      if (res.success) {
        toast.success(
          isApproved ? "Teklif onaylandı" : "Teklif onayı reddedildi"
        );
        setIsApproveOpen(false);
        fetchDetail();
        onUpdated();
      } else {
        toast.error(res.message || "Onay işlemi başarısız");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Action: Create Revision
  const handleCreateRevision = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await ApiClient.createQuoteRevision(
        quote.id,
        { revisionNotes: revisionNotes.trim() },
        activeTenant.id
      );
      if (res.success && res.data) {
        toast.success(
          `Yeni revizyon (R${quote.revisionNumber + 1}) oluşturuldu`
        );
        setIsRevisionOpen(false);
        onClose();
        onUpdated();
      } else {
        toast.error(res.message || "Revizyon oluşturulamadı");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await ApiClient.deleteQuote(quote.id, activeTenant.id);
      if (res.success) {
        toast.success("Teklif silindi");
        setIsDeleteDialogOpen(false);
        onClose();
        onUpdated();
      } else {
        toast.error(res.message || "Teklif silinemedi");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsDeleting(false);
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
    <div className="fade-in fixed inset-0 z-50 flex animate-in justify-end">
      {/* Backdrop with Click-to-Close */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <ConfirmDialog
        cancelText="Vazgeç"
        confirmText="Evet, Sil"
        description={`"${quote?.quoteNumber} - ${quote?.title || "Bu teklif"}" kaydı kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Teklifi Sil"
        variant="destructive"
      />

      <div className="slide-in-from-right relative z-10 flex h-full w-full animate-in flex-col overflow-hidden border-zinc-200 dark:border-zinc-800 border-l bg-white dark:bg-zinc-900 shadow-2xl duration-200 md:max-w-3xl">
        {/* Drawer Header (Mobile-Optimized) */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50/80 dark:bg-zinc-800/50 p-3.5 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Back / Close Button */}
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 shadow-2xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
              onClick={onClose}
              title="Kapat & Geri Dön"
              type="button"
            >
              <ArrowLeft className="h-4.5 w-4.5 sm:hidden" />
              <X className="hidden h-4.5 w-4.5 sm:block" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-extrabold font-mono text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
                  {quote?.quoteNumber || "TEK-..."}
                </span>
                <span className="rounded-md bg-blue-100 px-1.5 py-0.2 font-bold text-[10px] text-blue-700">
                  R{quote?.revisionNumber ?? 0}
                </span>
                {quote && <QuoteStatusBadge status={quote.status} />}
              </div>
              <h2 className="mt-0.5 max-w-[170px] truncate font-bold text-zinc-900 dark:text-zinc-100 text-xs leading-tight sm:max-w-md sm:text-sm">
                {quote?.title || "Teklif Detayı"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              className="flex h-8 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 shadow-2xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:px-2.5"
              onClick={() => quote && onPrint(quote.id)}
              title="Yazdır / PDF"
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>

            <button
              className="flex h-8 items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 font-semibold text-[11px] text-blue-600 shadow-2xs transition hover:bg-blue-50 sm:px-2.5"
              onClick={() => {
                if (!quote) {
                  return;
                }
                const publicUrl = `${window.location.origin}/quotes/view/${quote.publicViewToken}`;
                navigator.clipboard.writeText(publicUrl);
                toast.success("Müşteri linki kopyalandı");
              }}
              title="Müşteri Linkini Kopyala"
              type="button"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link</span>
            </button>

            <button
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Teklifi Sil"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !quote ? (
          <div className="flex flex-1 items-center justify-center text-zinc-500 dark:text-zinc-400">
            <RefreshCw className="mr-2 h-6 w-6 animate-spin text-blue-600" />
            <span className="font-medium text-xs">Detaylar yükleniyor...</span>
          </div>
        ) : (
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-8">
            {/* 0. High-Visibility Customer Revision Request Alert Card */}
            {(quote.status === "RevisionRequested" ||
              quote.activities?.some(
                (a) => a.activityType === "RevisionRequested"
              )) && (
              <div className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 p-4.5 shadow-md">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-none animate-bounce items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-amber-950 text-sm">
                          Müşteri Revizyon / Değişiklik Talebinde Bulundu!
                        </h4>
                        <span className="rounded-full border border-amber-300 bg-amber-200/90 px-2 py-0.5 font-bold text-[10px] text-amber-900">
                          Yeni Versiyon Bekleniyor
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-amber-800 text-xs">
                        Müşteri dijital teklif sayfası üzerinden revizyon ve
                        güncelleme talebinde bulundu.
                      </p>
                    </div>
                  </div>

                  <button
                    className="inline-flex flex-none items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 font-extrabold text-white text-xs shadow-xs transition hover:bg-amber-700 active:scale-95"
                    onClick={() => {
                      const revAct = quote.activities?.find(
                        (a) =>
                          a.activityType === "RevisionRequested" ||
                          a.activityType === "NoteAdded"
                      );
                      if (revAct?.description) {
                        setRevisionNotes(
                          revAct.description.replace(
                            /^Müşterinin ilettiği revizyon.*?:\s*/,
                            ""
                          )
                        );
                      }
                      setIsRevisionOpen(true);
                    }}
                    type="button"
                  >
                    <History className="h-4 w-4" />
                    <span>
                      Yeni Revizyon Başlat (R{quote.revisionNumber + 1})
                    </span>
                  </button>
                </div>

                {(() => {
                  const revAct = quote.activities?.find(
                    (a) =>
                      a.activityType === "RevisionRequested" ||
                      a.activityType === "NoteAdded"
                  );
                  if (!revAct) {
                    return null;
                  }
                  return (
                    <div className="rounded-xl border border-amber-300 bg-white dark:bg-zinc-900/90 p-3.5 text-zinc-800 dark:text-zinc-200 text-xs shadow-2xs">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5 text-amber-600" />
                          Müşterinin İlettiği Talep Notu:
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(revAct.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-2.5 font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-relaxed">
                        "
                        {revAct.description?.replace(
                          /^Müşterinin ilettiği revizyon.*?:\s*/,
                          ""
                        ) || revAct.description}
                        "
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 1. Action Alert / Banner based on status */}
            {quote.status === "PendingApproval" && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs">
                      Yönetici İskonto / Limit Onayı Bekliyor
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Bu teklif iskonto eşiğini aştığı için yönetici onayı
                      gerektirir.
                    </p>
                  </div>
                </div>

                <button
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-amber-700"
                  onClick={() => setIsApproveOpen(true)}
                  type="button"
                >
                  Onayla / Değerlendir
                </button>
              </div>
            )}

            {quote.status === "Accepted" && quote.convertedOrderId && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-xs">
                      Teklif Kabul Edildi & Siparişe Dönüştü
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Sipariş No:{" "}
                      <b>{quote.convertedOrderNumber || "Aktif Sipariş"}</b>
                    </p>
                  </div>
                </div>

                <Link
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700 text-xs transition hover:bg-emerald-200 hover:text-emerald-900"
                  href={`/${activeTenant?.slug}/orders`}
                >
                  <span>Siparişe Git</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* 2. Primary CTA Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-800/50 p-3">
              {quote.status !== "Accepted" &&
                quote.status !== "ConvertedToOrder" && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-emerald-700"
                    disabled={isActionLoading}
                    onClick={handleConvertToOrder}
                    type="button"
                  >
                    <Check className="h-4 w-4" />
                    <span>Kabul Et & Siparişe Dönüştür</span>
                  </button>
                )}

              {(quote.status === "Draft" || quote.status === "Approved") && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
                  disabled={isActionLoading}
                  onClick={handleSend}
                  type="button"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Müşteriye Gönder</span>
                </button>
              )}

              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-300 text-xs shadow-2xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setIsRevisionOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Yeni Revizyon (R{quote.revisionNumber + 1})</span>
              </button>
            </div>

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:grid-cols-4">
              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  Müşteri
                </span>
                <p className="mt-0.5 truncate font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                  {quote.customerName}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  Genel Toplam
                </span>
                <p className="mt-0.5 font-extrabold text-blue-600 text-sm">
                  {formatCurrency(quote.totalAmount, quote.currency)}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  İskonto
                </span>
                <p className="mt-0.5 font-bold text-rose-600 text-xs">
                  %{quote.discountRate} (
                  {formatCurrency(quote.discountAmount, quote.currency)})
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase">
                  Geçerlilik
                </span>
                <p className="mt-0.5 font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                  {quote.validUntil
                    ? new Date(quote.validUntil).toLocaleDateString("tr-TR")
                    : "Süresiz"}
                </p>
              </div>
            </div>

            {/* 4. Tab Navigation */}
            <div className="flex border-zinc-200 dark:border-zinc-800 border-b">
              {[
                { key: "items", label: `Kalemler (${quote.items.length})` },
                { key: "terms", label: "Şartlar & Banka" },
                {
                  key: "revisions",
                  label: `Revizyonlar (${quote.revisions.length})`,
                },
                {
                  key: "activities",
                  label: `Aktivite Günlüğü (${quote.activities.length})`,
                },
              ].map((tab) => (
                <button
                  className={`-mb-px border-b-2 px-4 py-2.5 font-bold text-xs transition ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 5. Tab Contents */}
            {activeTab === "items" && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-zinc-200/80 dark:border-zinc-800/90 border-b bg-zinc-50/70 dark:bg-zinc-800/40 font-bold text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-3 py-2.5">Ürün / Hizmet</th>
                        <th className="px-2 py-2.5 text-center">Miktar</th>
                        <th className="px-2 py-2.5 text-right">Birim Fiyat</th>
                        <th className="px-2 py-2.5 text-center">İskonto</th>
                        <th className="px-2 py-2.5 text-center">KDV</th>
                        <th className="px-3 py-2.5 text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                      {quote.items.map((item) => (
                        <tr
                          className={
                            item.isOptional ? "bg-zinc-50/50 dark:bg-zinc-800/30 opacity-75" : ""
                          }
                          key={item.id}
                        >
                          <td className="px-3 py-2.5">
                            <span className="block font-bold text-zinc-900 dark:text-zinc-100">
                              {item.productName}
                            </span>
                            {item.sku && (
                              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                                SKU: {item.sku}
                              </span>
                            )}
                            {item.isOptional && (
                              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.2 font-bold text-[9px] text-amber-800">
                                Opsiyonel
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center font-bold">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium">
                            {formatCurrency(item.unitPrice, quote.currency)}
                          </td>
                          <td className="px-2 py-2.5 text-center font-bold text-rose-600">
                            {item.discountRate > 0
                              ? `%${item.discountRate}`
                              : "-"}
                          </td>
                          <td className="px-2 py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                            %{item.taxRate}
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.totalPrice, quote.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals Box */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 text-xs">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Ara Toplam:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(quote.subtotal, quote.currency)}
                      </span>
                    </div>
                    {quote.discountAmount > 0 && (
                      <div className="flex justify-between font-medium text-rose-600">
                        <span>İskonto:</span>
                        <span className="font-bold">
                          -
                          {formatCurrency(quote.discountAmount, quote.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>KDV Tutarı:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(quote.taxAmount, quote.currency)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between border-zinc-200 dark:border-zinc-800 border-t pt-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Genel Toplam:
                      </span>
                      <span className="font-extrabold text-base text-blue-600">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "terms" && (
              <div className="space-y-4 text-zinc-700 dark:text-zinc-300 text-xs">
                <div className="space-y-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Ödeme Şartları</h4>
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {quote.paymentTerms || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Teslimat & Sevkiyat Koşulları
                  </h4>
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {quote.deliveryTerms || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Banka Hesap & IBAN Bilgileri
                  </h4>
                  <p className="whitespace-pre-line font-mono text-zinc-600 dark:text-zinc-400">
                    {quote.bankDetails || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Genel Hükümler & Garanti
                  </h4>
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {quote.termsAndConditions || "Belirtilmedi"}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "revisions" && (
              <div className="space-y-3">
                <div className="mb-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  Bu teklife ait tüm pazarlık ve revizyon tarihçesi:
                </div>
                {quote.revisions.map((rev) => {
                  const isCurrent = rev.id === quote.id;
                  return (
                    <div
                      className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                        isCurrent
                          ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/20"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                      key={rev.id}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-blue-600 px-2 py-0.5 font-bold font-mono text-white text-xs">
                          R{rev.revisionNumber}
                        </span>
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {rev.quoteNumber}
                          </span>
                          <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                            {new Date(rev.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
                          {formatCurrency(rev.totalAmount, rev.currency)}
                        </span>
                        <QuoteStatusBadge status={rev.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "activities" && (
              <div className="space-y-3">
                {quote.activities.map((act) => (
                  <div
                    className="flex gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5"
                    key={act.id}
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(act.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve / Reject Modal */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yönetici Teklif Değerlendirmesi
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">
              Teklifi onaylayarak müşteriye gönderilmeye hazır hale getirebilir
              veya açıklama ekleyerek revizyon isteyebilirsiniz.
            </p>

            <div>
              <label className="mb-1 block font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                Değerlendirme Notu
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Örn: %18 iskonto onaylandı veya %10 seviyesine çekilmesini rica ederim."
                rows={3}
                value={approvalNotes}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl px-3.5 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setIsApproveOpen(false)}
                type="button"
              >
                Vazgeç
              </button>

              <button
                className="rounded-xl bg-rose-50 px-4 py-2 font-semibold text-rose-700 text-xs transition hover:bg-rose-100"
                onClick={() => handleApprove(false)}
                type="button"
              >
                Reddet / Revizyon İste
              </button>

              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-emerald-700"
                onClick={() => handleApprove(true)}
                type="button"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Revision Modal */}
      {isRevisionOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Revizyon Oluştur (R
              {quote?.revisionNumber ? quote.revisionNumber + 1 : 1})
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">
              Mevcut teklif kilitlenecek ve tüm kalemleriyle birlikte yeni bir
              versiyon oluşturulacaktır.
            </p>

            <div>
              <label className="mb-1 block font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                Revizyon Gerekçesi / Notu
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Örn: Müşteri %5 ek iskonto talep etti, 3. kalem çıkarıldı."
                rows={3}
                value={revisionNotes}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl px-3.5 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setIsRevisionOpen(false)}
                type="button"
              >
                Vazgeç
              </button>

              <button
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
                disabled={isActionLoading}
                onClick={handleCreateRevision}
                type="button"
              >
                Revizyonu Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUOTE TEMPLATES MODAL
// ============================================================================
function QuoteTemplatesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeTenant } = usePermissions();
  const [templates, setTemplates] = useState<QuoteTemplateDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getQuoteTemplates(activeTenant.id);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch {
      toast.error("Şablonlar yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant?.id && name.trim())) {
      return;
    }

    try {
      if (editingId) {
        await ApiClient.updateQuoteTemplate(
          editingId,
          {
            bankDetails,
            deliveryTerms,
            isDefault,
            name,
            paymentTerms,
            termsAndConditions,
          },
          activeTenant.id
        );
        toast.success("Şablon güncellendi");
      } else {
        await ApiClient.createQuoteTemplate(
          {
            bankDetails,
            deliveryTerms,
            isDefault,
            name,
            paymentTerms,
            termsAndConditions,
          },
          activeTenant.id
        );
        toast.success("Yeni şablon oluşturuldu");
      }
      setEditingId(null);
      setName("");
      setTermsAndConditions("");
      setPaymentTerms("");
      setDeliveryTerms("");
      setBankDetails("");
      setIsDefault(false);
      fetchTemplates();
    } catch {
      toast.error("İşlem sırasında hata oluştu");
    }
  };

  const handleEdit = (tmpl: QuoteTemplateDto) => {
    setEditingId(tmpl.id);
    setName(tmpl.name);
    setTermsAndConditions(tmpl.termsAndConditions || "");
    setPaymentTerms(tmpl.paymentTerms || "");
    setDeliveryTerms(tmpl.deliveryTerms || "");
    setBankDetails(tmpl.bankDetails || "");
    setIsDefault(tmpl.isDefault);
  };

  const handleDelete = async (id: string) => {
    if (!activeTenant?.id) {
      return;
    }
    try {
      await ApiClient.deleteQuoteTemplate(id, activeTenant.id);
      toast.success("Şablon silindi");
      fetchTemplates();
    } catch {
      toast.error("Silinemedi");
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-2xl flex-col space-y-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xl sm:p-6">
        <div className="flex shrink-0 items-center justify-between border-zinc-200/80 dark:border-zinc-800/90 border-b pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
                Teklif Şart & Banka Şablonları
              </h3>
              <p className="truncate text-zinc-500 dark:text-zinc-400 text-xs">
                Tekliflerde tek tıkla kullanılan hazır şartnameler
              </p>
            </div>
          </div>
          <button
            className="shrink-0 rounded-xl p-2 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Existing Templates list */}
        <div className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto">
          {templates.map((t) => (
            <div
              className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-3"
              key={t.id}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                  {t.name}
                </span>
                {t.isDefault && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-[9px] text-blue-700">
                    Varsayılan
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-[11px] text-blue-600 transition hover:bg-blue-100"
                  onClick={() => handleEdit(t)}
                  type="button"
                >
                  Düzenle
                </button>
                <button
                  className="p-1 text-zinc-400 dark:text-zinc-500 transition hover:text-rose-600"
                  onClick={() => handleDelete(t.id)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Form */}
        <form
          className="space-y-3 border-zinc-200 dark:border-zinc-800 border-t pt-3"
          onSubmit={handleSave}
        >
          <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
            {editingId ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}
          </h4>

          <div>
            <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
              Şablon Adı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs focus:border-blue-500 focus:outline-none"
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Standart Kurumsal Lisans Şartnamesi"
              required
              type="text"
              value={name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                Ödeme Şartları
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                value={paymentTerms}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                Teslimat Koşulları
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                onChange={(e) => setDeliveryTerms(e.target.value)}
                rows={2}
                value={deliveryTerms}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
              Banka & IBAN Bilgileri
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
              onChange={(e) => setBankDetails(e.target.value)}
              rows={2}
              value={bankDetails}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1 font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
            <input
              checked={isDefault}
              className="rounded text-blue-600 focus:ring-0"
              onChange={(e) => setIsDefault(e.target.checked)}
              type="checkbox"
            />
            <span>Varsayılan şablon olarak kullan</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
              type="submit"
            >
              {editingId ? "Güncelle" : "Şablonu Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// QUOTE PRINT ENGINE & MODAL - HIGH PRECISION A4 CORPORATE PDF
// ============================================================================
function renderQuotePrintHtml(quote: QuoteDetailDto, tenantName: string) {
  const formatCur = (amount: number) =>
    new Intl.NumberFormat("tr-TR", {
      currency: quote.currency || "TRY",
      minimumFractionDigits: 2,
      style: "currency",
    }).format(amount || 0);

  // Group Tax breakdown by rate
  const map = new Map<number, { baseAmount: number; taxAmount: number }>();
  quote.items.forEach((item) => {
    if (item.isOptional) {
      return;
    }
    const raw = (item.unitPrice || 0) * (item.quantity || 1);
    const disc = item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
    const base = Math.max(0, raw - disc);
    const tax =
      item.taxAmount || (item.taxRate > 0 ? base * (item.taxRate / 100) : 0);

    const existing = map.get(item.taxRate) || { baseAmount: 0, taxAmount: 0 };
    existing.baseAmount += base;
    existing.taxAmount += tax;
    map.set(item.taxRate, existing);
  });

  const taxRows = Array.from(map.entries())
    .map(
      ([rate, vals]) => `
      <tr>
        <td style="padding: 4px 6px; font-weight: 700;">%${rate}</td>
        <td style="padding: 4px 6px; text-align: right;">${formatCur(vals.baseAmount)}</td>
        <td style="padding: 4px 6px; text-align: right; font-weight: 700;">${formatCur(vals.taxAmount)}</td>
      </tr>
    `
    )
    .join("");

  const itemsHtml = quote.items
    .map(
      (item, idx) => `
    <tr style="${item.isOptional ? "background-color: #fefce8; opacity: 0.85;" : idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 700; color: #0f172a;">${item.productName}</div>
        ${item.sku ? `<div style="font-size: 9px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>` : ""}
        ${item.description ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${item.description}</div>` : ""}
        ${item.isOptional ? `<div style="display: inline-block; background-color: #fef08a; color: #713f12; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 4px; margin-top: 2px;">Opsiyonel Kalem (Toplama Dahil Değil)</div>` : ""}
      </td>
      <td style="padding: 7px 8px; text-align: center; font-weight: 700; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${item.quantity} ${item.unit}</td>
      <td style="padding: 7px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${formatCur(item.unitPrice)}</td>
      <td style="padding: 7px 8px; text-align: center; font-weight: 700; color: #e11d48; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${item.discountRate > 0 ? `%${item.discountRate}` : "-"}</td>
      <td style="padding: 7px 8px; text-align: center; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">%${item.taxRate}</td>
      <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${formatCur(item.totalPrice)}</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <title>${quote.quoteNumber} - ${quote.title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .page {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 10px 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          background: #2563eb;
          color: #ffffff;
          font-weight: 900;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .company-name {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }
        .doc-title {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
        .quote-ref-box {
          text-align: right;
        }
        .quote-badge {
          display: inline-block;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 4px 8px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .rev-badge {
          background: #2563eb;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 800;
          margin-left: 4px;
        }
        .ref-details {
          font-size: 10px;
          color: #475569;
          margin-top: 4px;
          line-height: 1.5;
        }
        .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .party-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .party-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2563eb;
          margin-bottom: 3px;
        }
        .party-title {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }
        .party-sub {
          font-size: 10px;
          color: #475569;
          margin-top: 2px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
        }
        .items-table th {
          background: #0f172a;
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px;
          text-align: left;
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .tax-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
        }
        .tax-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 4px;
        }
        .tax-table th {
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px;
          color: #64748b;
          font-weight: 700;
        }
        .totals-card {
          border: 2px solid #0f172a;
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #475569;
          margin-bottom: 4px;
        }
        .totals-row.discount {
          color: #e11d48;
          font-weight: 600;
        }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-top: 2px solid #0f172a;
          padding-top: 8px;
          margin-top: 6px;
        }
        .grand-total-label {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
        }
        .grand-total-val {
          font-size: 16px;
          font-weight: 900;
          color: #1d4ed8;
        }
        .terms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 9px;
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .term-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px;
        }
        .term-item.full {
          grid-column: span 2;
        }
        .term-item.bank {
          grid-column: span 2;
          background: #f8fafc;
          font-family: monospace;
        }
        .term-title {
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: 2px;
          font-size: 8px;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
          page-break-inside: avoid;
        }
        .sig-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          font-size: 9px;
          background: #ffffff;
        }
        .sig-line {
          height: 50px;
          border-bottom: 1px dashed #cbd5e1;
          margin-top: 6px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 2px;
          color: #94a3b8;
          font-size: 8px;
        }
        .footer {
          margin-top: 16px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          font-size: 8px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- 1. Header -->
        <div class="header">
          <div class="logo-box">
            <div class="logo-icon">${tenantName ? tenantName.charAt(0).toUpperCase() : "C"}</div>
            <div>
              <div class="company-name">${tenantName || "CRM ŞİRKETİ"}</div>
              <div class="doc-title">Kurumsal Satış & Fiyat Teklifi / Proforma Belgesi</div>
            </div>
          </div>
          <div class="quote-ref-box">
            <div>
              <span class="quote-badge">${quote.quoteNumber}</span>
              <span class="rev-badge">R${quote.revisionNumber}</span>
            </div>
            <div class="ref-details">
              <div><b>Teklif Tarihi:</b> ${new Date(quote.createdAt).toLocaleDateString("tr-TR")}</div>
              <div><b>Son Geçerlilik:</b> ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("tr-TR") : "Süresiz"}</div>
              <div><b>Para Birimi:</b> ${quote.currency}</div>
            </div>
          </div>
        </div>

        <!-- 2. Parties -->
        <div class="party-grid">
          <div class="party-card">
            <div class="party-label">SAYIN / MÜŞTERİ (ALICI)</div>
            <div class="party-title">${quote.customerName}</div>
            <div class="party-sub"><b>Konu:</b> ${quote.title}</div>
            ${quote.dealTitle ? `<div class="party-sub" style="font-size: 9px; color: #64748b;">Fırsat: ${quote.dealTitle}</div>` : ""}
          </div>

          <div class="party-card">
            <div class="party-label" style="color: #64748b;">TEKLİFİ VEREN / TEMSİLCİ</div>
            <div class="party-title">${quote.assignedUserName || "Satış Departmanı"}</div>
            <div class="party-sub"><b>Firma:</b> ${tenantName || "CRM Şirketi"}</div>
            <div class="party-sub" style="font-size: 9px; color: #64748b;">Durum: <b>${quote.status}</b></div>
          </div>
        </div>

        <!-- 3. Line Items -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>Ürün / Hizmet Tanımı</th>
              <th style="width: 70px; text-align: center;">Miktar</th>
              <th style="width: 90px; text-align: right;">Birim Fiyat</th>
              <th style="width: 55px; text-align: center;">İskonto</th>
              <th style="width: 45px; text-align: center;">KDV</th>
              <th style="width: 100px; text-align: right;">Toplam Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- 4. Financial Matrix -->
        <div class="bottom-grid">
          <div class="tax-box">
            <div class="party-label" style="color: #64748b;">KDV ORAN & MATRAH DAĞILIMI</div>
            <table class="tax-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Oran</th>
                  <th style="text-align: right;">Matrah</th>
                  <th style="text-align: right;">KDV Tutarı</th>
                </tr>
              </thead>
              <tbody>
                ${taxRows}
              </tbody>
            </table>
          </div>

          <div class="totals-card">
            <div class="totals-row">
              <span>Ara Toplam (KDV Hariç):</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCur(quote.subtotal)}</span>
            </div>
            ${
              quote.discountAmount > 0
                ? `
              <div class="totals-row discount">
                <span>Toplam İskonto / İndirim:</span>
                <span>-${formatCur(quote.discountAmount)}</span>
              </div>
            `
                : ""
            }
            <div class="totals-row">
              <span>Hesaplanan Toplam KDV:</span>
              <span style="font-weight: 700; color: #0f172a;">${formatCur(quote.taxAmount)}</span>
            </div>
            <div class="grand-total-row">
              <span class="grand-total-label">GENEL TOPLAM:</span>
              <span class="grand-total-val">${formatCur(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <!-- 5. Terms & Banking -->
        <div class="terms-grid">
          ${
            quote.paymentTerms
              ? `
            <div class="term-item">
              <div class="term-title">Ödeme ve Vade Koşulları</div>
              <div>${quote.paymentTerms}</div>
            </div>
          `
              : ""
          }
          ${
            quote.deliveryTerms
              ? `
            <div class="term-item">
              <div class="term-title">Teslimat ve Sevkiyat Şartları</div>
              <div>${quote.deliveryTerms}</div>
            </div>
          `
              : ""
          }
          ${
            quote.bankDetails
              ? `
            <div class="term-item bank">
              <div class="term-title" style="font-family: sans-serif;">Resmi Banka ve Hesap (IBAN) Bilgileri</div>
              <div>${quote.bankDetails}</div>
            </div>
          `
              : ""
          }
          ${
            quote.termsAndConditions
              ? `
            <div class="term-item full">
              <div class="term-title">Genel Hükümler ve Garanti Şartları</div>
              <div>${quote.termsAndConditions}</div>
            </div>
          `
              : ""
          }
        </div>

        <!-- 6. Signatures -->
        <div class="signatures">
          <div class="sig-box">
            <div class="term-title">TEKLİFİ DÜZENLEYEN (FİRMA YETKİLİSİ)</div>
            <div style="color: #64748b; font-size: 8px;">Yetkili Kaşe & İmza</div>
            <div class="sig-line">${quote.assignedUserName || tenantName}</div>
          </div>

          <div class="sig-box">
            <div class="term-title">TEKLİFİ ONAYLAYAN (MÜŞTERİ YETKİLİSİ)</div>
            <div style="color: #64748b; font-size: 8px;">Kabul & Onay İmzası</div>
            <div class="sig-line">${quote.customerName}</div>
          </div>
        </div>

        <!-- 7. Footer -->
        <div class="footer">
          <span>Bu teklif belgesi CRM sistemi üzerinden resmi ve elektronik olarak üretilmiştir.</span>
          <span>Belge No: ${quote.quoteNumber}-R${quote.revisionNumber} • Sayfa 1 / 1</span>
        </div>
      </div>
    </body>
    </html>
  `;
}

function printQuoteDocument(quote: QuoteDetailDto, tenantName: string) {
  const existingIframe = document.getElementById(
    "quote-print-iframe"
  ) as HTMLIFrameElement;
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "quote-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const html = renderQuotePrintHtml(quote, tenantName);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 250);
}

function QuotePrintModal({
  quoteId,
  onClose,
}: {
  quoteId: string;
  onClose: () => void;
}) {
  const { activeTenant } = usePermissions();
  const [quote, setQuote] = useState<QuoteDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    ApiClient.getQuoteById(quoteId, activeTenant.id)
      .then((res) => {
        if (res.success && res.data) {
          setQuote(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [activeTenant?.id, quoteId]);

  const handlePrint = () => {
    if (!quote) {
      return;
    }
    printQuoteDocument(quote, activeTenant?.name || "CRM Şirketi");
  };

  // Group Tax breakdown by rate
  const taxBreakdown = useMemo(() => {
    if (!quote?.items) {
      return [];
    }
    const map = new Map<number, { baseAmount: number; taxAmount: number }>();
    quote.items.forEach((item) => {
      if (item.isOptional) {
        return;
      }
      const raw = (item.unitPrice || 0) * (item.quantity || 1);
      const disc = item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
      const base = Math.max(0, raw - disc);
      const tax =
        item.taxAmount || (item.taxRate > 0 ? base * (item.taxRate / 100) : 0);

      const existing = map.get(item.taxRate) || { baseAmount: 0, taxAmount: 0 };
      existing.baseAmount += base;
      existing.taxAmount += tax;
      map.set(item.taxRate, existing);
    });

    return Array.from(map.entries())
      .map(([rate, vals]) => ({
        baseAmount: vals.baseAmount,
        rate,
        taxAmount: vals.taxAmount,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [quote?.items]);

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
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center overflow-y-auto p-2 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Modal Header */}
        <div className="z-20 flex shrink-0 items-center justify-between border-border border-b bg-card px-4 py-3.5 shadow-2xs sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-bold text-primary sm:h-10 sm:w-10">
              <FileSpreadsheet className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  Teklif Belgesi Önizleme
                </span>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-bold text-[10px] text-primary">
                  A4 Proforma
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {quote?.quoteNumber || "TEK-..."} (R{quote?.revisionNumber ?? 0}
                ) • {quote?.customerName || "Yükleniyor..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="hidden items-center gap-1 rounded-xl border border-border bg-muted/80 p-1 text-muted-foreground sm:flex">
              <button
                className="rounded-lg px-2 py-0.5 font-bold text-xs transition hover:bg-background hover:text-foreground"
                onClick={() => setZoom((prev) => Math.max(60, prev - 10))}
                title="Küçült"
                type="button"
              >
                -
              </button>
              <button
                className="rounded-lg px-2 py-0.5 font-bold font-mono text-primary text-xs transition hover:bg-background"
                onClick={() => setZoom(100)}
                title="Sıfırla (%100)"
                type="button"
              >
                %{zoom}
              </button>
              <button
                className="rounded-lg px-2 py-0.5 font-bold text-xs transition hover:bg-background hover:text-foreground"
                onClick={() => setZoom((prev) => Math.min(140, prev + 10))}
                title="Büyüt"
                type="button"
              >
                +
              </button>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground text-xs shadow-xs transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              disabled={isLoading || !quote}
              onClick={handlePrint}
              type="button"
            >
              <Printer className="h-4 w-4" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onClose}
              title="Kapat (ESC)"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Canvas Body */}
        <div className="flex flex-1 items-start justify-center overflow-x-auto overflow-y-auto bg-muted/40 p-4 sm:p-6 dark:bg-slate-950/80">
          {isLoading || !quote ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <RefreshCw className="mb-3 h-8 w-8 animate-spin text-primary" />
              <span className="font-semibold text-xs">
                Teklif belgesi hazırlanıyor...
              </span>
            </div>
          ) : (
            <div
              className="my-1 w-full max-w-[210mm] shrink-0 select-text space-y-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-zinc-900 dark:text-zinc-100 shadow-xl sm:p-10"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
            >
              {/* 1. Header & Branding */}
              <div className="flex items-start justify-between gap-4 border-slate-900 border-b-2 pb-4">
                <div className="max-w-sm space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground text-sm shadow-xs">
                      {activeTenant?.name
                        ? activeTenant.name.charAt(0).toUpperCase()
                        : "C"}
                    </div>
                    <h1 className="font-black text-lg text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                      {activeTenant?.name || "CRM ŞİRKETİ"}
                    </h1>
                  </div>
                  <p className="font-medium text-[10px] text-zinc-500 dark:text-zinc-400">
                    Kurumsal Satış & Fiyat Teklifi / Proforma Belgesi
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5">
                    <span className="font-black font-mono text-zinc-900 dark:text-zinc-100 text-xs tracking-wider">
                      {quote.quoteNumber}
                    </span>
                    <span className="rounded bg-primary px-1.5 py-0.2 font-bold text-[8px] text-primary-foreground">
                      R{quote.revisionNumber}
                    </span>
                  </div>

                  <div className="space-y-0.5 pt-0.5 font-medium text-[10px] text-zinc-600 dark:text-zinc-400">
                    <div>
                      <b>Tarih:</b>{" "}
                      {new Date(quote.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                    <div>
                      <b>Son Geçerlilik:</b>{" "}
                      {quote.validUntil ? (
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {new Date(quote.validUntil).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                      ) : (
                        "Süresiz"
                      )}
                    </div>
                    <div>
                      <b>Para Birimi:</b> {quote.currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Client & Issuer Party Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3">
                  <span className="block font-extrabold text-[8px] text-blue-700 uppercase tracking-wider">
                    SAYIN / MÜŞTERİ (ALICI)
                  </span>
                  <h3 className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs leading-snug">
                    {quote.customerName}
                  </h3>
                  <p className="font-semibold text-[10px] text-zinc-700 dark:text-zinc-300">
                    Konu:{" "}
                    <span className="font-normal text-zinc-600 dark:text-zinc-400">
                      {quote.title}
                    </span>
                  </p>
                  {quote.dealTitle && (
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                      Fırsat: {quote.dealTitle}
                    </p>
                  )}
                </div>

                <div className="space-y-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3">
                  <span className="block font-extrabold text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    TEKLİFİ VEREN / TEMSİLCİ
                  </span>
                  <h3 className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs leading-snug">
                    {quote.assignedUserName || "Satış Departmanı"}
                  </h3>
                  <p className="font-medium text-[10px] text-zinc-600 dark:text-zinc-400">
                    Firma:{" "}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {activeTenant?.name}
                    </span>
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                    Durum:{" "}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {quote.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* 3. Itemized Products/Services Table */}
              <div className="overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-900 font-bold text-[9px] text-white uppercase tracking-wider">
                      <th className="w-7 px-2.5 py-2 text-center">#</th>
                      <th className="px-2.5 py-2">Ürün / Hizmet Açıklaması</th>
                      <th className="w-14 px-2 py-2 text-center">Miktar</th>
                      <th className="w-20 px-2 py-2 text-right">Birim Fiyat</th>
                      <th className="w-12 px-2 py-2 text-center">İskonto</th>
                      <th className="w-10 px-2 py-2 text-center">KDV</th>
                      <th className="w-24 px-2.5 py-2 text-right">
                        Toplam Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                    {quote.items.map((item, idx) => (
                      <tr
                        className={
                          item.isOptional
                            ? "bg-amber-50/60 opacity-85"
                            : idx % 2 === 1
                              ? "bg-zinc-50/70 dark:bg-zinc-800/40"
                              : "bg-white dark:bg-zinc-900"
                        }
                        key={item.id}
                      >
                        <td className="px-2.5 py-1.5 text-center font-bold text-zinc-400 dark:text-zinc-500">
                          {idx + 1}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <span className="block font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                            {item.productName}
                          </span>
                          {item.sku && (
                            <span className="font-mono text-[8px] text-zinc-500 dark:text-zinc-400">
                              Kod: {item.sku}
                            </span>
                          )}
                          {item.description && (
                            <span className="mt-0.5 block text-[9px] text-zinc-600 dark:text-zinc-400">
                              {item.description}
                            </span>
                          )}
                          {item.isOptional && (
                            <span className="mt-0.5 inline-block rounded bg-amber-200/80 px-1.5 py-0.2 font-bold text-[7px] text-amber-900">
                              Opsiyonel Kalem (Toplama Dahil Değil)
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-zinc-800 dark:text-zinc-200">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(item.unitPrice, quote.currency)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-rose-600">
                          {item.discountRate > 0
                            ? `%${item.discountRate}`
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
                          %{item.taxRate}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(item.totalPrice, quote.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. Financial Calculations & Tax Breakdown Matrix */}
              <div className="grid grid-cols-1 gap-3 pt-0.5 sm:grid-cols-2">
                {/* Left: VAT Rate Breakdown Box */}
                <div className="space-y-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
                  <span className="block font-extrabold text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    KDV ORAN & MATRAH DAĞILIMI
                  </span>
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      <tr className="border-zinc-200 dark:border-zinc-800 border-b font-bold text-zinc-500 dark:text-zinc-400">
                        <th className="pb-1">Oran</th>
                        <th className="pb-1 text-right">Matrah</th>
                        <th className="pb-1 text-right">KDV Tutarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                      {taxBreakdown.map((t) => (
                        <tr key={t.rate}>
                          <td className="py-0.5 font-bold">%{t.rate}</td>
                          <td className="py-0.5 text-right">
                            {formatCurrency(t.baseAmount, quote.currency)}
                          </td>
                          <td className="py-0.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(t.taxAmount, quote.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right: Totals Box */}
                <div className="space-y-1 rounded-xl border-2 border-slate-900 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-[11px]">
                  <div className="flex justify-between font-medium text-zinc-600 dark:text-zinc-400">
                    <span>Ara Toplam (KDV Hariç):</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(quote.subtotal, quote.currency)}
                    </span>
                  </div>

                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between font-medium text-rose-600">
                      <span>Toplam İskonto:</span>
                      <span className="font-bold">
                        -{formatCurrency(quote.discountAmount, quote.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-medium text-zinc-600 dark:text-zinc-400">
                    <span>Hesaplanan Toplam KDV:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(quote.taxAmount, quote.currency)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between border-slate-900 border-t-2 pt-1.5">
                    <span className="font-black text-[11px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      GENEL TOPLAM:
                    </span>
                    <span className="font-black text-blue-700 text-sm">
                      {formatCurrency(quote.totalAmount, quote.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Terms & Banking Details */}
              <div className="grid grid-cols-1 gap-2.5 text-[9px] text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                {quote.paymentTerms && (
                  <div className="space-y-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2">
                    <span className="block font-bold text-[8px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      ÖDEME VE VADE KOŞULLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {quote.paymentTerms}
                    </p>
                  </div>
                )}

                {quote.deliveryTerms && (
                  <div className="space-y-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2">
                    <span className="block font-bold text-[8px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      TESLİMAT VE SEVKİYAT ŞARTLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {quote.deliveryTerms}
                    </p>
                  </div>
                )}

                {quote.bankDetails && (
                  <div className="space-y-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 font-mono sm:col-span-2">
                    <span className="block font-bold font-sans text-[8px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      RESMİ BANKA VE HESAP (IBAN) BİLGİLERİ:
                    </span>
                    <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {quote.bankDetails}
                    </p>
                  </div>
                )}

                {quote.termsAndConditions && (
                  <div className="space-y-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 sm:col-span-2">
                    <span className="block font-bold text-[8px] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      GENEL HÜKÜMLER VE GARANTİ ŞARTLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {quote.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Stamp / Signature Box */}
              <div className="grid grid-cols-2 gap-6 pt-2 text-center text-[9px]">
                <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    TEKLİFİ DÜZENLEYEN (FİRMA YETKİLİSİ)
                  </p>
                  <p className="mt-0.5 text-[8px] text-zinc-500 dark:text-zinc-400">
                    Yetkili Kaşe & İmza
                  </p>
                  <div className="mt-2 flex h-12 items-end justify-center border-zinc-300 dark:border-zinc-700 border-b border-dashed pb-1">
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                      {quote.assignedUserName || activeTenant?.name}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    TEKLİFİ ONAYLAYAN (MÜŞTERİ YETKİLİSİ)
                  </p>
                  <p className="mt-0.5 text-[8px] text-zinc-500 dark:text-zinc-400">
                    Kabul & Onay İmzası
                  </p>
                  <div className="mt-2 flex h-12 items-end justify-center border-zinc-300 dark:border-zinc-700 border-b border-dashed pb-1">
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                      {quote.customerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Document Footer Bar */}
              <div className="mt-4 flex items-center justify-between border-zinc-200 dark:border-zinc-800 border-t pt-2.5 text-[8px] text-zinc-400 dark:text-zinc-500">
                <span>
                  Bu teklif belgesi CRM sistemi üzerinden resmi ve elektronik
                  olarak üretilmiştir.
                </span>
                <span>
                  Belge No: {quote.quoteNumber}-R{quote.revisionNumber} • Sayfa
                  1 / 1
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
