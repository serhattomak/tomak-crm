"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "@workspace/ui/components/sonner";
import { Textarea } from "@workspace/ui/components/textarea";
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
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Link as LinkIcon,
  Mail,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BulkActionBar, BulkDeleteIcon } from "@/components/bulk-action-bar";
import { PermissionGate } from "@/components/permission-gate";
import {
  type QuoteForEmail,
  SendQuoteEmailModal,
} from "@/components/quotes/send-quote-email-modal";
import { TemplatePreview } from "@/components/quotes/TemplatePreview";
import { TestSendModal } from "@/components/quotes/TestSendModal";
import { VariableChips } from "@/components/quotes/VariableChips";
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
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { usePermissions } from "@/lib/permissions/permission-context";

// Currency Formatter Helper
const formatCurrency = (amount: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    currency: currency || "TRY",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount || 0);

function getExpiryStatus(validUntil?: string): {
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  if (!validUntil) {
    return { isExpired: false, isExpiringSoon: false };
  }
  const isExpired = new Date(validUntil) < new Date();
  if (isExpired) {
    return { isExpired: true, isExpiringSoon: false };
  }
  const diffDays = Math.ceil(
    (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = diffDays <= 3 && diffDays >= 0;
  return { isExpired, isExpiringSoon };
}

function QuoteExpiryBadge({ validUntil }: { validUntil?: string }) {
  if (!validUntil) {
    return <span>Süresiz</span>;
  }
  const { isExpired, isExpiringSoon } = getExpiryStatus(validUntil);
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 font-bold text-[10px] text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300">
        <Clock className="h-3 w-3" />
        Süresi doldu
      </span>
    );
  }
  if (isExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-[10px] text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock className="h-3 w-3" />
        Son 3 gün
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
      <span>{new Date(validUntil).toLocaleDateString("tr-TR")}</span>
    </span>
  );
}

export default function QuotesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();
  const { getParam, setParams } = useUrlFilters();

  // State
  const [quotes, setQuotes] = useState<QuoteSummaryDto[]>([]);
  const [stats, setStats] = useState<QuoteStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters — initialized from URL
  const [searchTerm, setSearchTerm] = useState(() => getParam("search", ""));
  const [selectedStatus, setSelectedStatus] = useState<string>(() =>
    getParam("status", "All")
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() =>
    getParam("quoteId", null as unknown as string)
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [printQuoteId, setPrintQuoteId] = useState<string | null>(null);
  const [emailQuote, setEmailQuote] = useState<QuoteForEmail | null>(null);

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
    if (qid && qid !== selectedQuoteId) {
      setSelectedQuoteId(qid);
    }
  }, [searchParams, selectedQuoteId]);

  // ── Bulk operations ────────────────────────────────────────────────────────
  const allPageIds = quotes.map((q) => q.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected =
    allPageIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPageIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!(activeTenant?.id && selectedIds.size > 0)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const { deletedCount, failedCount } = await ApiClient.bulkDeleteQuotes(
        Array.from(selectedIds),
        activeTenant.id
      );
      setSelectedIds(new Set());
      fetchQuotes();
      fetchStats();
      if (failedCount > 0) {
        toast.info(
          `${deletedCount} teklif silindi, ${failedCount} silinemedi.`
        );
      } else {
        toast.success(`${deletedCount} teklif başarıyla silindi.`);
      }
    } catch {
      toast.error("Toplu silme sırasında hata oluştu");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── URL-synced handlers ───────────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setParams({ search: val || undefined });
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setParams({ status: status === "All" ? undefined : status });
  };

  const handleOpenDetail = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setParams({ quoteId });
  };

  const handleCloseDetail = () => {
    setSelectedQuoteId(null);
    setParams({ quoteId: undefined });
  };

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
    <PageContainer className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/60 dark:text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Teklif Yönetimi & Fiyatlandırma
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Müşteri teklifleri, çoklu revizyonlar, iskonto onayları ve
                sipariş dönüşümleri
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            onClick={() => setIsTemplatesOpen(true)}
            type="button"
          >
            <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>E-posta Şablonları</span>
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-zinc-500 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
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
        <div className="rounded-3xl border border-border bg-card p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              Açık Teklif Hacmi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {formatCurrency(stats?.activeProposalsVolume || 0)}
            </div>
            <p className="mt-1 font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
              {stats?.totalQuotes || 0} toplam teklif kaydı
            </p>
          </div>
        </div>

        {/* Card 2: Conversion Rate */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              Kabul & Kazanma Oranı
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
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
        <div className="rounded-3xl border border-border bg-card p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              Yönetici Onayı Bekleyen
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {stats?.pendingApprovalCount || 0}
            </div>
            <p className="mt-1 font-medium text-[11px] text-amber-600">
              İskonto / limit eşiği aşan teklifler
            </p>
          </div>
        </div>

        {/* Card 4: Sent / Viewed / Expired */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              Müşteride Olanlar
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
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
      <div className="space-y-4 rounded-3xl border border-border bg-card p-4 shadow-2xs">
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
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-bold text-[10px] ${
                    isSelected
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
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
          <div className="w-full flex-1">
            <Input
              leftIcon={<Search />}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Teklif no, başlık veya müşteri adına göre ara..."
              value={searchTerm}
            />
          </div>
        </div>
      </div>

      {/* 4. Quotes Data Table */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xs">
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
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Teklif Bulunamadı
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
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
            <div className="block divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
              {quotes.map((quote) => (
                <div
                  className={`cursor-pointer p-4 transition active:bg-zinc-50 dark:bg-zinc-800/50 ${
                    quote.status === "RevisionRequested"
                      ? "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
                      : ""
                  }`}
                  key={quote.id}
                  onClick={() => setSelectedQuoteId(quote.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                          {quote.quoteNumber}
                        </span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.2 font-bold text-[10px] text-blue-700">
                          R{quote.revisionNumber}
                        </span>
                      </div>
                      <h4 className="mt-1 line-clamp-1 font-bold text-sm text-zinc-900 leading-snug dark:text-zinc-100">
                        {quote.title}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Building className="h-3 w-3 flex-none text-zinc-400 dark:text-zinc-500" />
                        <span className="truncate">{quote.customerName}</span>
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1.5">
                      <QuoteStatusBadge status={quote.status} />
                      <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-border border-t pt-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {quote.itemCount} Kalem
                      </span>
                      {quote.validUntil
                        ? (() => {
                            const { isExpired, isExpiringSoon } =
                              getExpiryStatus(quote.validUntil);
                            if (isExpired) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-bold text-[10px] text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300">
                                  <Clock className="h-3 w-3" />
                                  Süresi doldu
                                </span>
                              );
                            }
                            if (isExpiringSoon) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-bold text-[10px] text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Clock className="h-3 w-3" />
                                  Son 3 gün
                                </span>
                              );
                            }
                            return (
                              <>
                                <span className="text-zinc-300">•</span>
                                <span>
                                  SKT:{" "}
                                  {new Date(
                                    quote.validUntil as string
                                  ).toLocaleDateString("tr-TR")}
                                </span>
                              </>
                            );
                          })()
                        : null}
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-500"
                        onClick={() => {
                          const publicUrl = `${window.location.origin}/portal/${quote.publicViewToken}`;
                          navigator.clipboard.writeText(publicUrl);
                          toast.success("Bağlantı kopyalandı");
                        }}
                        title="Link Kopyala"
                        type="button"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50/70 font-bold text-[11px] text-zinc-500 uppercase tracking-wider dark:bg-zinc-800/40 dark:text-zinc-400">
                    <TableHead className="w-10 py-3.5 pr-2 pl-4 h-auto">
                      <Checkbox
                        aria-label="Tümünü seç"
                        checked={allSelected}
                        data-indeterminate={someSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Teklif No &amp; Revizyon</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">
                      Teklif Başlığı &amp; Müşteri
                    </TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Durum</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Tutar &amp; İskonto</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Geçerlilik</TableHead>
                    <TableHead className="px-4 py-3.5 h-auto">Temsilci</TableHead>
                    <TableHead className="px-4 py-3.5 text-right h-auto">Aksiyonlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                  {quotes.map((quote) => {
                    return (
                      <TableRow
                        className={`group cursor-pointer transition hover:bg-blue-50/40 dark:hover:bg-zinc-800/40 ${
                          selectedIds.has(quote.id)
                            ? "bg-blue-50/60 dark:bg-blue-950/20"
                            : quote.status === "RevisionRequested"
                              ? "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                              : ""
                        }`}
                        key={quote.id}
                        onClick={() => handleOpenDetail(quote.id)}
                      >
                        <TableCell
                          className="w-10 py-3.5 pr-2 pl-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`${quote.quoteNumber} seç`}
                            checked={selectedIds.has(quote.id)}
                            onCheckedChange={() => toggleSelectOne(quote.id)}
                          />
                        </TableCell>
                        {/* 1. Quote Number & Revision Badge */}
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
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
                        </TableCell>

                        {/* 2. Title & Customer */}
                        <TableCell className="max-w-xs px-4 py-3.5">
                          <span className="block truncate font-bold text-zinc-900 transition group-hover:text-blue-600 dark:text-zinc-100">
                            {quote.title}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <Building className="h-3 w-3 flex-none text-zinc-400 dark:text-zinc-500" />
                            <span className="truncate">
                              {quote.customerName}
                            </span>
                          </div>
                        </TableCell>

                        {/* 3. Status Badge */}
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
                          <QuoteStatusBadge status={quote.status} />
                        </TableCell>

                        {/* 4. Total Amount & Discount */}
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
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
                        </TableCell>

                        {/* 5. Valid Until — expiry badge: rose 'Süresi doldu', amber 'Son 3 gün', or tr-TR date */}
                        <TableCell className="whitespace-nowrap px-4 py-3.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <QuoteExpiryBadge validUntil={quote.validUntil} />
                        </TableCell>

                        {/* 6. Assigned User */}
                        <TableCell className="whitespace-nowrap px-4 py-3.5">
                          {quote.assignedUserName ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 font-bold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {quote.assignedUserName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                {quote.assignedUserName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic dark:text-zinc-500">
                              Atanmamış
                            </span>
                          )}
                        </TableCell>

                        {/* 7. Action Buttons */}
                        <TableCell
                          className="whitespace-nowrap px-4 py-3.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                              onClick={() => setSelectedQuoteId(quote.id)}
                              title="Detay & İncele"
                              type="button"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                              onClick={async () => {
                                toast.info("PDF hazırlanıyor...");
                                const blob = await ApiClient.downloadQuotePdf(
                                  quote.id,
                                  activeTenant?.slug || activeTenant?.id
                                );
                                if (blob) {
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `Teklif-${quote.quoteNumber}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  a.remove();
                                  toast.success("PDF başarıyla indirildi.");
                                } else {
                                  toast.error("PDF oluşturulamadı.");
                                }
                              }}
                              title="PDF İndir (QuestPDF)"
                              type="button"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
                              onClick={() => {
                                setEmailQuote({
                                  currency: quote.currency,
                                  customerName: quote.customerName,
                                  id: quote.id,
                                  quoteNumber: quote.quoteNumber,
                                  totalAmount: quote.totalAmount,
                                });
                              }}
                              title="E-posta ile Gönder"
                              type="button"
                            >
                              <Mail className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                              onClick={() => setPrintQuoteId(quote.id)}
                              title="Yazdır / Önizle"
                              type="button"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            <button
                              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600 dark:text-zinc-500"
                              onClick={() => {
                                const publicUrl = `${window.location.origin}/portal/${quote.publicViewToken}`;
                                navigator.clipboard.writeText(publicUrl);
                                toast.success("Bağlantı kopyalandı");
                              }}
                              title="Müşteri Linkini Kopyala"
                              type="button"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
          onClose={handleCloseDetail}
          onEmailQuote={(q) => setEmailQuote(q)}
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

      {/* 9. Send Quote Email Modal */}
      {emailQuote && (
        <SendQuoteEmailModal
          isOpen={Boolean(emailQuote)}
          onClose={() => setEmailQuote(null)}
          onSuccess={() => {
            fetchQuotes();
            fetchStats();
          }}
          quote={emailQuote}
          tenantSlug={tenantSlug}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        actions={[
          {
            disabled: isBulkDeleting,
            icon: <BulkDeleteIcon />,
            label: isBulkDeleting ? "Siliniyor..." : "Seçilenleri Sil",
            onClick: handleBulkDelete,
            variant: "danger",
          },
        ]}
        onClear={() => setSelectedIds(new Set())}
        selectedCount={selectedIds.size}
      />
    </PageContainer>
  );
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================
function QuoteStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "RevisionRequested":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-bold text-[10px] text-amber-700 shadow-2xs dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
          <RefreshCw className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          Revizyon İstendi
        </span>
      );
    case "Draft":
      return (
        <span className="inline-flex items-center rounded-lg border border-border bg-zinc-100 px-2.5 py-0.5 font-bold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Taslak
        </span>
      );
    case "PendingApproval":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-bold text-[10px] text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertCircle className="h-3 w-3" />
          Onay Bekliyor
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Onaylandı
        </span>
      );
    case "Sent":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-bold text-[10px] text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-300">
          <Send className="h-3 w-3" />
          Müşteride
        </span>
      );
    case "Viewed":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-0.5 font-bold text-[10px] text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/60 dark:text-purple-300">
          <Eye className="h-3 w-3" />
          İncelendi
        </span>
      );
    case "Accepted":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Award className="h-3 w-3" />
          Kabul Edildi
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-bold text-[10px] text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300">
          <XCircle className="h-3 w-3" />
          Reddedildi
        </span>
      );
    case "Expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-0.5 font-bold text-[10px] text-red-700 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300">
          <Clock className="h-3 w-3" />
          Süresi Doldu
        </span>
      );
    case "Revised":
      return (
        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-0.5 font-bold text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          Revize Edildi
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-0.5 font-bold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
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
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [paymentDueDays, setPaymentDueDays] = useState<string>("");
  const [paymentDueDate, setPaymentDueDate] = useState<string>("");

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
        paymentDueDate: paymentDueDate
          ? new Date(paymentDueDate).toISOString()
          : undefined,
        paymentDueDays: paymentDueDays
          ? Number.parseInt(paymentDueDays, 10)
          : undefined,
        paymentMethod: paymentMethod || undefined,
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[94vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-border border-b bg-zinc-50 p-4 sm:p-6 dark:bg-zinc-800/50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/60 dark:text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate font-bold text-base text-zinc-900 sm:text-lg dark:text-zinc-100">
                Yeni Teklif Hazırla
              </DialogTitle>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                Müşteri, ürün kalemleri, KDV, iskonto ve şartnameleri belirleyin
              </p>
            </div>
          </div>

          <DialogClose asChild>
            <button
              className="shrink-0 rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        {/* Form */}
        <form
          className="custom-scrollbar space-y-6 overflow-y-auto p-4 sm:p-6"
          onSubmit={handleSubmit}
        >
          {/* Section 1: Customer & Deal Linking */}
          <div className="space-y-4 rounded-2xl border border-border bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>1. Müşteri & Fırsat Bilgileri</span>
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Customer select or text */}
              <div>
                <Label className="mb-1">Müşteri Seçin</Label>
                <Select
                  onValueChange={(val) =>
                    handleCustomerPick(val === "none" ? "" : val)
                  }
                  value={customerId || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Müşteri Listesinden Seç --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      -- Müşteri Listesinden Seç --
                    </SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Name */}
              <div>
                <Label className="mb-1" required>
                  Müşteri Ünvanı
                </Label>
                <Input
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Örn: ABC Holding A.Ş."
                  required
                  value={customerName}
                />
              </div>

              {/* Deal Link */}
              <div>
                <Label className="mb-1">
                  Bağlı Pipeline Fırsatı (Opsiyonel)
                </Label>
                <Select
                  onValueChange={(val) =>
                    handleDealPick(val === "none" ? "" : val)
                  }
                  value={dealId || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Fırsat Bağlantısı Yok --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      -- Fırsat Bağlantısı Yok --
                    </SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title} ({formatCurrency(d.value, d.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Proposal Title */}
              <div className="sm:col-span-2">
                <Label className="mb-1" required>
                  Teklif Başlığı
                </Label>
                <Input
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Yıllık Yazılım ve Altyapı Lisans Teklifi"
                  required
                  value={title}
                />
              </div>

              {/* Currency & Validity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1">Para Birimi</Label>
                  <Select onValueChange={setCurrency} value={currency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY (₺)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1">Geçerlilik</Label>
                  <Select onValueChange={setValidDays} value={validDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Gün</SelectItem>
                      <SelectItem value="15">15 Gün</SelectItem>
                      <SelectItem value="30">30 Gün</SelectItem>
                      <SelectItem value="60">60 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
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

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-border bg-zinc-50/70 font-bold text-[10px] text-zinc-500 uppercase tracking-wider dark:bg-zinc-800/40 dark:text-zinc-400">
                    <TableHead className="min-w-[200px] px-3 py-2.5 h-auto">
                      Ürün / Hizmet Adı
                    </TableHead>
                    <TableHead className="w-20 px-2 py-2.5 h-auto">Miktar</TableHead>
                    <TableHead className="w-24 px-2 py-2.5 h-auto">Birim</TableHead>
                    <TableHead className="w-28 px-2 py-2.5 h-auto">Birim Fiyat</TableHead>
                    <TableHead className="w-20 px-2 py-2.5 h-auto">İskonto %</TableHead>
                    <TableHead className="w-20 px-2 py-2.5 h-auto">KDV %</TableHead>
                    <TableHead className="w-28 px-2 py-2.5 text-right h-auto">Tutar</TableHead>
                    <TableHead className="w-10 px-2 py-2.5 text-center h-auto" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 font-medium dark:divide-zinc-800">
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
                      <TableRow
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${item.isOptional ? "bg-zinc-50 opacity-60 dark:bg-zinc-800/50" : ""}`}
                        key={idx}
                      >
                        {/* Product Picker or Free Text */}
                        <TableCell className="px-3 py-2.5">
                          <div className="space-y-1">
                            {products.length > 0 && (
                              <Select
                                onValueChange={(val) =>
                                  handleItemChange(
                                    idx,
                                    "productId",
                                    val === "none" ? "" : val
                                  )
                                }
                                value={item.productId || "none"}
                              >
                                <SelectTrigger className="h-7 text-[11px]">
                                  <SelectValue placeholder="-- Katalogdan Seç (Opsiyonel) --" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    -- Katalogdan Seç (Opsiyonel) --
                                  </SelectItem>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} (
                                      {formatCurrency(p.sellingPrice, currency)}
                                      )
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <input
                              className="w-full rounded-lg border border-border bg-card px-2 py-1 font-semibold text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="w-24 px-2 py-2.5">
                          <NumberInput
                            inputSize="sm"
                            min={0.01}
                            onChange={(val) =>
                              handleItemChange(idx, "quantity", val ?? 0)
                            }
                            required
                            showStepper
                            step={1}
                            value={item.quantity}
                          />
                        </TableCell>

                        {/* Unit */}
                        <TableCell className="px-2 py-2.5">
                          <input
                            className="w-full rounded-lg border border-border bg-card px-2 py-1 text-center text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                            onChange={(e) =>
                              handleItemChange(idx, "unit", e.target.value)
                            }
                            type="text"
                            value={item.unit}
                          />
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell className="w-28 px-2 py-2.5">
                          <NumberInput
                            inputSize="sm"
                            min={0}
                            onChange={(val) =>
                              handleItemChange(idx, "unitPrice", val ?? 0)
                            }
                            prefix={
                              currency === "USD"
                                ? "$"
                                : currency === "EUR"
                                  ? "€"
                                  : currency === "GBP"
                                    ? "£"
                                    : "₺"
                            }
                            required
                            step={0.01}
                            value={item.unitPrice}
                          />
                        </TableCell>

                        {/* Discount Rate */}
                        <TableCell className="w-20 px-2 py-2.5">
                          <NumberInput
                            className={
                              item.discountRate > 20
                                ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-300"
                                : undefined
                            }
                            inputSize="sm"
                            max={100}
                            min={0}
                            onChange={(val) =>
                              handleItemChange(idx, "discountRate", val ?? 0)
                            }
                            suffix="%"
                            value={item.discountRate}
                          />
                        </TableCell>

                        {/* Tax Rate */}
                        <TableCell className="px-2 py-2.5">
                          <Select
                            onValueChange={(val) =>
                              handleItemChange(
                                idx,
                                "taxRate",
                                Number.parseFloat(val) || 0
                              )
                            }
                            value={String(item.taxRate)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">%0</SelectItem>
                              <SelectItem value="1">%1</SelectItem>
                              <SelectItem value="10">%10</SelectItem>
                              <SelectItem value="20">%20</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Total Price */}
                        <TableCell className="whitespace-nowrap px-2 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(total, currency)}
                        </TableCell>

                        {/* Remove */}
                        <TableCell className="px-2 py-2.5 text-center">
                          <button
                            className="rounded-md p-1 text-zinc-300 transition hover:text-rose-600 disabled:opacity-30"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItem(idx)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section 3: Summary Totals & Approval Threshold Banner */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left: General Discount & Approval warning */}
            <div className="space-y-3">
              <div className="space-y-3 rounded-2xl border border-border bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  Genel Teklif İskontosu
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl bg-zinc-200 p-0.5 font-semibold text-xs">
                    <button
                      className={`rounded-lg px-3 py-1 transition ${ discountType === "Percentage" ? "bg-card text-blue-600 shadow-xs" : "text-zinc-600 dark:text-zinc-400" }`}
                      onClick={() => setDiscountType("Percentage")}
                      type="button"
                    >
                      Oran (%)
                    </button>
                    <button
                      className={`rounded-lg px-3 py-1 transition ${ discountType === "Amount" ? "bg-card text-blue-600 shadow-xs" : "text-zinc-600 dark:text-zinc-400" }`}
                      onClick={() => setDiscountType("Amount")}
                      type="button"
                    >
                      Tutar ({currency})
                    </button>
                  </div>

                  {discountType === "Percentage" ? (
                    <NumberInput
                      className="w-24 font-bold"
                      inputSize="sm"
                      max={100}
                      min={0}
                      onChange={(val) => setDiscountRate(val ?? 0)}
                      placeholder="%"
                      suffix="%"
                      value={discountRate || undefined}
                    />
                  ) : (
                    <NumberInput
                      className="w-32 font-bold"
                      inputSize="sm"
                      min={0}
                      onChange={(val) => setDiscountAmount(val ?? 0)}
                      placeholder="Tutar"
                      prefix={
                        currency === "USD"
                          ? "$"
                          : currency === "EUR"
                            ? "€"
                            : currency === "GBP"
                              ? "£"
                              : "₺"
                      }
                      step={0.01}
                      value={discountAmount || undefined}
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
            <div className="space-y-2.5 rounded-2xl border border-border bg-zinc-50/70 p-4 dark:bg-zinc-800/40">
              <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
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

              <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Hesaplanan KDV:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(calculations.totalTax, currency)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-border border-t pt-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Genel Toplam:
                </span>
                <span className="font-extrabold text-blue-600 text-xl">
                  {formatCurrency(calculations.grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Method & Due Date */}
          <div className="space-y-3 rounded-2xl border border-border bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
              <span>4. Ödeme Yöntemi & Vade</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1">Ödeme Yöntemi</Label>
                <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BankTransfer">Havale / EFT</SelectItem>
                    <SelectItem value="CreditCard">Kredi Kartı</SelectItem>
                    <SelectItem value="Cash">Nakit</SelectItem>
                    <SelectItem value="Check">Çek / Senet</SelectItem>
                    <SelectItem value="OpenAccount">
                      Açık Hesap (Cari)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1">Vade (Gün)</Label>
                <NumberInput
                  min={0}
                  onChange={(val) =>
                    setPaymentDueDays(val === undefined ? "" : String(val))
                  }
                  placeholder="Örn: 30"
                  showStepper
                  step={1}
                  value={paymentDueDays ? Number(paymentDueDays) : undefined}
                />
              </div>
              <div>
                <Label className="mb-1">Vade Tarihi</Label>
                <DatePicker
                  onChange={setPaymentDueDate}
                  placeholder="Vade tarihi seçin"
                  value={paymentDueDate}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Terms, Delivery, Bank Details Templates */}
          <div className="space-y-4 rounded-2xl border border-border bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-xs text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>5. Şartlar, Koşullar & Banka Bilgileri</span>
              </h3>

              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Şablon Seç:
                  </span>
                  <div className="w-56">
                    <Select
                      onValueChange={(val) =>
                        handleTemplateChange(val === "none" ? "" : val)
                      }
                      value={selectedTemplateId || "none"}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="-- Şablon Seçin --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Şablon Seçin --</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.isDefault ? "(Varsayılan)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold text-[11px] text-zinc-600 dark:text-zinc-400">
                  Ödeme & Fatura Şartları
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
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
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Örn: Ürünler 2 yıl resmi garantilidir. Fiyatlarımıza KDV dahildir."
                  rows={2}
                  value={termsAndConditions}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-border border-t pt-4">
            <button
              className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-xs text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
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
      </DialogContent>
    </Dialog>
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
  onEmailQuote,
}: {
  quoteId: string;
  onClose: () => void;
  onUpdated: () => void;
  onPrint: (id: string) => void;
  onEmailQuote?: (quote: QuoteForEmail) => void;
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
  const [isConvertPreviewOpen, setIsConvertPreviewOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revisionPaymentDueDate, setRevisionPaymentDueDate] = useState("");
  const [revisionItems, setRevisionItems] = useState<
    { id: string; quantity: number; unitPrice: number }[]
  >([]);
  const [convertItems, setConvertItems] = useState<
    {
      quoteItemId: string;
      quantity: number;
      unitPrice: number;
      isSelected: boolean;
      productName: string;
    }[]
  >([]);
  const [convertShippingFee, setConvertShippingFee] = useState<string>("0");
  const [convertDueDate, setConvertDueDate] = useState<string>("");
  const [convertPaymentMethod, setConvertPaymentMethod] =
    useState<string>("BankTransfer");
  const [convertNotes, setConvertNotes] = useState<string>("");
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

  useEffect(() => {
    if (isRevisionOpen && quote) {
      setRevisionItems(
        quote.items.map((it) => ({
          id: it.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      );
      setRevisionPaymentDueDate(
        quote.paymentDueDate ? quote.paymentDueDate.slice(0, 10) : ""
      );
    }
  }, [isRevisionOpen, quote]);

  useEffect(() => {
    if (isConvertPreviewOpen && quote) {
      setConvertItems(
        quote.items.map((it) => ({
          isSelected: it.isSelected,
          productName: it.productName,
          quantity: it.quantity,
          quoteItemId: it.id,
          unitPrice: it.unitPrice,
        }))
      );
      setConvertShippingFee("0");
      setConvertDueDate(
        quote.paymentDueDate
          ? quote.paymentDueDate.slice(0, 10)
          : quote.validUntil
            ? quote.validUntil.slice(0, 10)
            : ""
      );
      setConvertPaymentMethod(quote.paymentMethod || "BankTransfer");
      setConvertNotes("");
    }
  }, [isConvertPreviewOpen, quote]);

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

  // Action: Convert to Order (preview modal)
  const handleConfirmConvert = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    if (quote.convertedOrderId) {
      toast.error("Bu teklif zaten siparişe çevrilmiş");
      return;
    }
    setIsActionLoading(true);
    try {
      const payload = {
        dueDate: convertDueDate
          ? new Date(convertDueDate).toISOString()
          : undefined,
        items: convertItems.map((ci) => ({
          isSelected: ci.isSelected,
          productName: ci.productName,
          quantity: ci.quantity,
          quoteItemId: ci.quoteItemId,
          unitPrice: ci.unitPrice,
        })),
        notes: convertNotes.trim() || undefined,
        paymentMethod: convertPaymentMethod,
        shippingFee: convertShippingFee
          ? Number.parseFloat(convertShippingFee)
          : 0,
      };
      const res = await ApiClient.convertQuoteToOrder(
        quote.id,
        payload,
        activeTenant.id
      );
      if (res.success) {
        toast.success("Teklif kabul edildi ve sipariş başarıyla oluşturuldu!");
        setIsConvertPreviewOpen(false);
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

  // Action: Create Revision with overrides
  const handleCreateRevision = async () => {
    if (!(activeTenant?.id && quote)) {
      return;
    }
    setIsActionLoading(true);
    try {
      const payload = {
        items: revisionItems.map((ri) => ({
          id: ri.id,
          quantity: ri.quantity,
          unitPrice: ri.unitPrice,
        })),
        paymentDueDate: revisionPaymentDueDate
          ? new Date(revisionPaymentDueDate).toISOString()
          : undefined,
        revisionNotes: revisionNotes.trim() || undefined,
      };
      const res = await ApiClient.createQuoteRevision(
        quote.id,
        payload,
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
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
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

      <SheetContent
        aria-describedby={undefined}
        className="data-[side=right]:w-full overflow-hidden p-0 data-[side=right]:sm:max-w-none data-[side=right]:md:max-w-3xl"
        side="right"
      >
        {/* Drawer Header (Mobile-Optimized) */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-border border-b bg-zinc-50/80 p-3.5 sm:p-5 dark:bg-zinc-800/50">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Back / Close Button */}
            <SheetClose asChild>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-zinc-700 shadow-2xs transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Kapat & Geri Dön"
                type="button"
              >
                <ArrowLeft className="h-4.5 w-4.5 sm:hidden" />
                <X className="hidden h-4.5 w-4.5 sm:block" />
              </button>
            </SheetClose>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-extrabold font-mono text-xs text-zinc-900 sm:text-sm dark:text-zinc-100">
                  {quote?.quoteNumber || "TEK-..."}
                </span>
                <span className="rounded-md bg-blue-100 px-1.5 py-0.2 font-bold text-[10px] text-blue-700">
                  R{quote?.revisionNumber ?? 0}
                </span>
                {quote && <QuoteStatusBadge status={quote.status} />}
              </div>
              <SheetTitle className="mt-0.5 max-w-[170px] truncate font-bold text-xs text-zinc-900 leading-tight sm:max-w-md sm:text-sm dark:text-zinc-100">
                {quote?.title || "Teklif Detayı"}
              </SheetTitle>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              className="flex h-8 items-center gap-1 rounded-xl border border-border bg-card px-2 font-semibold text-[11px] text-zinc-700 shadow-2xs transition hover:bg-zinc-50 sm:px-2.5 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              onClick={async () => {
                if (!quote) {
                  return;
                }
                toast.info("PDF hazırlanıyor...");
                const blob = await ApiClient.downloadQuotePdf(
                  quote.id,
                  activeTenant?.slug || activeTenant?.id
                );
                if (blob) {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Teklif-${quote.quoteNumber}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                  toast.success("PDF başarıyla indirildi.");
                } else {
                  toast.error("PDF oluşturulamadı.");
                }
              }}
              title="PDF İndir (QuestPDF)"
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              className="flex h-8 items-center gap-1 rounded-xl border border-border bg-card px-2 font-semibold text-[11px] text-zinc-700 shadow-2xs transition hover:bg-zinc-50 sm:px-2.5 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              onClick={() => quote && onPrint(quote.id)}
              title="Yazdır / Önizle"
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>

            <button
              className="flex h-8 items-center gap-1 rounded-xl border border-border bg-card px-2 font-semibold text-[11px] text-blue-600 shadow-2xs transition hover:bg-blue-50 sm:px-2.5"
              onClick={() => {
                if (!quote) {
                  return;
                }
                const publicUrl = `${window.location.origin}/portal/${quote.publicViewToken}`;
                navigator.clipboard.writeText(publicUrl);
                toast.success("Bağlantı kopyalandı");
              }}
              title="Müşteri Linkini Kopyala"
              type="button"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link</span>
            </button>

            <button
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-zinc-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500"
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
              <div className="space-y-3 rounded-2xl border-2 border-amber-400/80 bg-amber-50/90 p-4.5 shadow-md dark:border-amber-500/40 dark:bg-amber-950/40">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-amber-950 text-sm dark:text-amber-200">
                          Müşteri Revizyon / Değişiklik Talebinde Bulundu!
                        </h4>
                        <span className="rounded-full border border-amber-300 bg-amber-200/80 px-2 py-0.5 font-bold text-[10px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/60 dark:text-amber-200">
                          Yeni Versiyon Bekleniyor
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-amber-800 text-xs dark:text-amber-300/90">
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
                    <div className="rounded-xl border border-amber-300/80 bg-white/90 p-3.5 text-xs text-zinc-800 shadow-2xs dark:border-amber-800/60 dark:bg-zinc-900/90 dark:text-zinc-200">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 uppercase tracking-wider dark:text-amber-300">
                          <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Müşterinin İlettiği Talep Notu:
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(revAct.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-2.5 font-semibold text-xs text-zinc-900 leading-relaxed dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-zinc-100">
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
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs dark:text-amber-200">
                      Yönetici İskonto / Limit Onayı Bekliyor
                    </h4>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
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
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-xs dark:text-emerald-200">
                      Teklif Kabul Edildi & Siparişe Dönüştü
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                      Sipariş No:{" "}
                      <b>{quote.convertedOrderNumber || "Aktif Sipariş"}</b>
                    </p>
                  </div>
                </div>

                <Link
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700 text-xs transition hover:bg-emerald-200 hover:text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/60 dark:text-emerald-200 dark:hover:bg-emerald-800"
                  href={`/${activeTenant?.slug}/orders`}
                >
                  <span>Siparişe Git</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* 2. Primary CTA Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/50">
              {quote.status !== "Accepted" &&
                quote.status !== "ConvertedToOrder" &&
                !quote.convertedOrderId && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                    disabled={isActionLoading}
                    onClick={() => setIsConvertPreviewOpen(true)}
                    type="button"
                  >
                    <Check className="h-4 w-4" />
                    <span>Kabul Et & Siparişe Dönüştür</span>
                  </button>
                )}
              {quote.convertedOrderId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800 text-xs">
                  ⚠️ Bu teklif zaten siparişe çevrildi —{" "}
                  {quote.convertedOrderNumber || quote.convertedOrderId}
                </div>
              )}

              {(quote.status === "Draft" || quote.status === "Approved") && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700"
                  disabled={isActionLoading}
                  onClick={() => {
                    if (onEmailQuote) {
                      onEmailQuote({
                        currency: quote.currency,
                        customerName: quote.customerName,
                        id: quote.id,
                        quoteNumber: quote.quoteNumber,
                        totalAmount: quote.totalAmount,
                      });
                    } else {
                      handleSend();
                    }
                  }}
                  type="button"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>E-posta & PDF Gönder</span>
                </button>
              )}

              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={async () => {
                  if (!quote) {
                    return;
                  }
                  toast.info("PDF hazırlanıyor...");
                  const blob = await ApiClient.downloadQuotePdf(
                    quote.id,
                    activeTenant?.slug || activeTenant?.id
                  );
                  if (blob) {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Teklif-${quote.quoteNumber}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    toast.success("PDF başarıyla indirildi.");
                  } else {
                    toast.error("PDF oluşturulamadı.");
                  }
                }}
                type="button"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>PDF İndir</span>
              </button>

              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setIsRevisionOpen(true)}
                type="button"
              >
                <History className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Yeni Revizyon (R{quote.revisionNumber + 1})</span>
              </button>
            </div>

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-4">
              <div>
                <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  Müşteri
                </span>
                <p className="mt-0.5 truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {quote.customerName}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  Genel Toplam
                </span>
                <p className="mt-0.5 font-extrabold text-blue-600 text-sm">
                  {formatCurrency(quote.totalAmount, quote.currency)}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  İskonto
                </span>
                <p className="mt-0.5 font-bold text-rose-600 text-xs">
                  %{quote.discountRate} (
                  {formatCurrency(quote.discountAmount, quote.currency)})
                </p>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-zinc-500 uppercase dark:text-zinc-400">
                  Geçerlilik
                </span>
                <p className="mt-0.5 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                  {quote.validUntil
                    ? new Date(quote.validUntil).toLocaleDateString("tr-TR")
                    : "Süresiz"}
                </p>
              </div>
            </div>

            {/* 4. Tab Navigation */}
            <div className="flex border-border border-b">
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
                      : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-border bg-zinc-50/70 font-bold text-[10px] text-zinc-500 uppercase tracking-wider dark:bg-zinc-800/40 dark:text-zinc-400">
                        <TableHead className="px-3 py-2.5 h-auto">Ürün / Hizmet</TableHead>
                        <TableHead className="px-2 py-2.5 text-center h-auto">Miktar</TableHead>
                        <TableHead className="px-2 py-2.5 text-right h-auto">Birim Fiyat</TableHead>
                        <TableHead className="px-2 py-2.5 text-center h-auto">İskonto</TableHead>
                        <TableHead className="px-2 py-2.5 text-center h-auto">KDV</TableHead>
                        <TableHead className="px-3 py-2.5 text-right h-auto">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                      {quote.items.map((item) => (
                        <TableRow
                          className={
                            item.isOptional
                              ? "bg-zinc-50/50 opacity-75 dark:bg-zinc-800/30"
                              : ""
                          }
                          key={item.id}
                        >
                          <TableCell className="px-3 py-2.5">
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
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-center font-bold">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-right font-medium">
                            {formatCurrency(item.unitPrice, quote.currency)}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-center font-bold text-rose-600">
                            {item.discountRate > 0
                              ? `%${item.discountRate}`
                              : "-"}
                          </TableCell>
                          <TableCell className="px-2 py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                            %{item.taxRate}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(item.totalPrice, quote.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Subtotals Box */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 rounded-2xl border border-border bg-zinc-50 p-3.5 text-xs dark:bg-zinc-800/50">
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
                    <div className="flex items-baseline justify-between border-border border-t pt-2">
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
              <div className="space-y-4 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <div className="font-bold text-[11px] text-zinc-500 uppercase tracking-wider">
                      Ödeme Yöntemi
                    </div>
                    <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                      {quote.paymentMethod || "Belirtilmedi"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <div className="font-bold text-[11px] text-zinc-500 uppercase tracking-wider">
                      Vade Tarihi
                    </div>
                    <div className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                      {quote.paymentDueDate
                        ? new Date(quote.paymentDueDate).toLocaleDateString(
                            "tr-TR"
                          )
                        : "Belirtilmedi"}
                    </div>
                    {quote.paymentDueDays !== undefined &&
                      quote.paymentDueDays !== null && (
                        <div className="text-[11px] text-zinc-500">
                          {quote.paymentDueDays} gün
                        </div>
                      )}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Ödeme Şartları
                  </h4>
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {quote.paymentTerms || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Teslimat & Sevkiyat Koşulları
                  </h4>
                  <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {quote.deliveryTerms || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Banka Hesap & IBAN Bilgileri
                  </h4>
                  <p className="whitespace-pre-line font-mono text-zinc-600 dark:text-zinc-400">
                    {quote.bankDetails || "Belirtilmedi"}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
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
                <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Bu teklife ait tüm pazarlık ve revizyon tarihçesi:
                </div>
                {quote.revisions.map((rev) => {
                  const isCurrent = rev.id === quote.id;
                  return (
                    <div
                      className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${ isCurrent ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/20" : "border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-800/50" }`}
                      key={rev.id}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-blue-600 px-2 py-0.5 font-bold font-mono text-white text-xs">
                          R{rev.revisionNumber}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {rev.quoteNumber}
                          </span>
                          <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                            {new Date(rev.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
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
                    className="flex gap-3 rounded-2xl border border-border bg-card p-3.5"
                    key={act.id}
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
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
      </SheetContent>

      {/* Approve / Reject Modal */}
      {isApproveOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsApproveOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yönetici Teklif Değerlendirmesi
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Teklifi onaylayarak müşteriye gönderilmeye hazır hale getirebilir
              veya açıklama ekleyerek revizyon isteyebilirsiniz.
            </p>

            <div>
              <label className="mb-1 block font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                Değerlendirme Notu
              </label>
              <textarea
                className="w-full rounded-xl border border-border p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Örn: %18 iskonto onaylandı veya %10 seviyesine çekilmesini rica ederim."
                rows={3}
                value={approvalNotes}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl px-3.5 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
          </DialogContent>
        </Dialog>
      )}

      {/* New Revision Modal with Override */}
      {isRevisionOpen && quote && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsRevisionOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-2xl"
            showCloseButton={false}
          >
            <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Yeni Revizyon Oluştur (R{quote.revisionNumber + 1}) — Tek Adımda
              Düzenle
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Kalem miktar/fiyat ve vade tek adımda güncellenir, yeni versiyon
              oluşturulur.
            </p>

            <div className="space-y-2 rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/40">
              <div className="font-bold text-[11px] text-zinc-600 uppercase tracking-wider dark:text-zinc-400">
                Kalemler (Miktar / Birim Fiyat)
              </div>
              {revisionItems.map((ri, idx) => {
                const qItem = quote.items.find((q) => q.id === ri.id);
                return (
                  <div
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
                    key={ri.id}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-xs">
                      {qItem?.productName || `Kalem ${idx + 1}`}
                    </span>
                    <NumberInput
                      className="w-20 text-center"
                      inputSize="sm"
                      min={0.01}
                      onChange={(val) => {
                        const v = val ?? 0;
                        setRevisionItems((prev) =>
                          prev.map((p) =>
                            p.id === ri.id ? { ...p, quantity: v } : p
                          )
                        );
                      }}
                      step={1}
                      value={ri.quantity}
                    />
                    <NumberInput
                      className="w-24 text-right"
                      inputSize="sm"
                      min={0}
                      onChange={(val) => {
                        const v = val ?? 0;
                        setRevisionItems((prev) =>
                          prev.map((p) =>
                            p.id === ri.id ? { ...p, unitPrice: v } : p
                          )
                        );
                      }}
                      prefix={
                        quote.currency === "USD"
                          ? "$"
                          : quote.currency === "EUR"
                            ? "€"
                            : quote.currency === "GBP"
                              ? "£"
                              : "₺"
                      }
                      step={0.01}
                      value={ri.unitPrice}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Vade Tarihi (Ödeme)</Label>
                <DatePicker
                  onChange={setRevisionPaymentDueDate}
                  placeholder="Vade tarihi seçin"
                  value={revisionPaymentDueDate}
                />
              </div>
              <div>
                <Label className="mb-1">Revizyon Gerekçesi / Notu</Label>
                <Textarea
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Örn: Müşteri %5 ek iskonto talep etti"
                  rows={2}
                  value={revisionNotes}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl px-3.5 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => setIsRevisionOpen(false)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                disabled={isActionLoading}
                onClick={handleCreateRevision}
                type="button"
              >
                Revizyonu Başlat
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Convert Preview Modal */}
      {isConvertPreviewOpen && quote && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsConvertPreviewOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-3xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between">
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Siparişe Dönüştür — Önizleme & Düzenle
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
            {quote.convertedOrderId ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-700 text-xs">
                Bu teklif zaten siparişe çevrilmiş (
                {quote.convertedOrderNumber || quote.convertedOrderId}). Tekrar
                dönüştürülemez.
              </div>
            ) : (
              <>
                <div className="space-y-2 rounded-xl border border-border bg-zinc-50 p-3 dark:bg-zinc-800/40">
                  <div className="font-bold text-[11px] text-zinc-600 uppercase tracking-wider dark:text-zinc-400">
                    Kalemler — Seç / Miktar / Fiyat
                  </div>
                  {convertItems.map((ci) => (
                    <div
                      className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
                      key={ci.quoteItemId}
                    >
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          checked={ci.isSelected}
                          onChange={(e) =>
                            setConvertItems((prev) =>
                              prev.map((p) =>
                                p.quoteItemId === ci.quoteItemId
                                  ? { ...p, isSelected: e.target.checked }
                                  : p
                              )
                            )
                          }
                          type="checkbox"
                        />
                        <span
                          className={`truncate font-semibold ${ci.isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 line-through"}`}
                        >
                          {ci.productName}
                        </span>
                      </label>
                      <NumberInput
                        className="ml-auto w-20 text-center"
                        disabled={!ci.isSelected}
                        inputSize="sm"
                        min={0.01}
                        onChange={(val) =>
                          setConvertItems((prev) =>
                            prev.map((p) =>
                              p.quoteItemId === ci.quoteItemId
                                ? {
                                    ...p,
                                    quantity: val ?? 0,
                                  }
                                : p
                            )
                          )
                        }
                        step={1}
                        value={ci.quantity}
                      />
                      <NumberInput
                        className="w-24 text-right"
                        disabled={!ci.isSelected}
                        inputSize="sm"
                        min={0}
                        onChange={(val) =>
                          setConvertItems((prev) =>
                            prev.map((p) =>
                              p.quoteItemId === ci.quoteItemId
                                ? {
                                    ...p,
                                    unitPrice: val ?? 0,
                                  }
                                : p
                            )
                          )
                        }
                        prefix={
                          quote.currency === "USD"
                            ? "$"
                            : quote.currency === "EUR"
                              ? "€"
                              : quote.currency === "GBP"
                                ? "£"
                                : "₺"
                        }
                        step={0.01}
                        value={ci.unitPrice}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <Label className="mb-1">Kargo Ücreti</Label>
                    <NumberInput
                      min={0}
                      onChange={(val) =>
                        setConvertShippingFee(
                          val === undefined ? "0" : String(val)
                        )
                      }
                      prefix={
                        quote.currency === "USD"
                          ? "$"
                          : quote.currency === "EUR"
                            ? "€"
                            : quote.currency === "GBP"
                              ? "£"
                              : "₺"
                      }
                      step={0.01}
                      value={
                        convertShippingFee ? Number(convertShippingFee) : 0
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Vade Tarihi</Label>
                    <DatePicker
                      onChange={setConvertDueDate}
                      placeholder="Vade tarihi seçin"
                      value={convertDueDate}
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Ödeme Yöntemi</Label>
                    <Select
                      onValueChange={setConvertPaymentMethod}
                      value={convertPaymentMethod}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BankTransfer">
                          Havale / EFT
                        </SelectItem>
                        <SelectItem value="CreditCard">Kredi Kartı</SelectItem>
                        <SelectItem value="Cash">Nakit</SelectItem>
                        <SelectItem value="Check">Çek / Senet</SelectItem>
                        <SelectItem value="OpenAccount">Açık Hesap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1">Sipariş Notu</Label>
                    <Input
                      onChange={(e) => setConvertNotes(e.target.value)}
                      placeholder="Not"
                      value={convertNotes}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-xl px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-100"
                    onClick={() => setIsConvertPreviewOpen(false)}
                    type="button"
                  >
                    Vazgeç
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white text-xs hover:bg-emerald-700 disabled:opacity-50"
                    disabled={isActionLoading || !!quote.convertedOrderId}
                    onClick={handleConfirmConvert}
                    type="button"
                  >
                    {isActionLoading
                      ? "Dönüştürülüyor..."
                      : "Onayla & Siparişe Dönüştür"}
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
}

// ============================================================================
// QUOTE TEMPLATES MODAL — Split-pane editor (Subject + HtmlBody + chips)
// Decision: UPGRADE MODAL to split-pane (less navigation changes, preserves
// existing quotes/page.tsx flow). Page route /quotes/templates not created;
// modal is the single entry. PermissionGate Quotes.Templates wraps editor.
// Right pane: live preview iframe sandbox="allow-same-origin" srcDoc with
// 400ms debounced ApiClient.previewQuoteTemplate, zoom 60-140% + copy HTML,
// quote selector for real-data preview, + Test Gönder modal (subtask 06).
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state — email template fields + legacy fields for backward compat
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [subjectError, setSubjectError] = useState<string | undefined>(
    undefined
  );
  const [htmlBodyError, setHtmlBodyError] = useState<string | undefined>(
    undefined
  );
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [showExtraFields, setShowExtraFields] = useState(false);
  const htmlBodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Preview + test-send state — subtask 06
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<60 | 80 | 100 | 140>(100);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [previewQuotes, setPreviewQuotes] = useState<QuoteSummaryDto[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(false);
  const [isTestSendOpen, setIsTestSendOpen] = useState<boolean>(false);
  const previewRequestIdRef = useRef<number>(0);

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

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setSubject("");
    setHtmlBody("");
    setTermsAndConditions("");
    setPaymentTerms("");
    setDeliveryTerms("");
    setBankDetails("");
    setIsDefault(false);
    setSubjectError(undefined);
    setHtmlBodyError(undefined);
    setNameError(undefined);
    setShowExtraFields(false);
  }, []);

  const handleSelectNew = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleEdit = useCallback((tmpl: QuoteTemplateDto) => {
    setEditingId(tmpl.id);
    setName(tmpl.name);
    setSubject(tmpl.subject ?? "");
    setHtmlBody(tmpl.htmlBody ?? "");
    setTermsAndConditions(tmpl.termsAndConditions ?? "");
    setPaymentTerms(tmpl.paymentTerms ?? "");
    setDeliveryTerms(tmpl.deliveryTerms ?? "");
    setBankDetails(tmpl.bankDetails ?? "");
    setIsDefault(tmpl.isDefault);
    setSubjectError(undefined);
    setHtmlBodyError(undefined);
    setNameError(undefined);
    // Show extra fields if legacy content exists
    if (
      tmpl.paymentTerms ||
      tmpl.deliveryTerms ||
      tmpl.bankDetails ||
      tmpl.termsAndConditions
    ) {
      setShowExtraFields(true);
    }
  }, []);

  const extractVariables = useCallback((text: string): string[] => {
    const found = new Set<string>();
    for (const match of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
      const varName = match[1];
      if (varName) {
        found.add(varName);
      }
    }
    return Array.from(found);
  }, []);

  const insertVariable = useCallback(
    (varName: string): void => {
      const token = `{{${varName}}}`;
      const el = htmlBodyRef.current;
      if (!el) {
        setHtmlBody((prev) => `${prev}${token}`);
        return;
      }
      const start = el.selectionStart ?? htmlBody.length;
      const end = el.selectionEnd ?? htmlBody.length;
      const before = htmlBody.slice(0, start);
      const after = htmlBody.slice(end);
      const next = `${before}${token}${after}`;
      setHtmlBody(next);
      // Preserve cursor — requestAnimationFrame keeps focus + undo stack
      const pos = start + token.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [htmlBody]
  );

  const fallbackHtml: string = useMemo<string>(() => {
    const safeSubject: string = (subject.trim() || "(Konu yok)")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const body: string =
      htmlBody.trim() ||
      "<p style='color:#71717a;font-size:13px'>Önizleme için HTML gövdesi girin…</p>";
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;padding:16px;color:#18181b;line-height:1.6;font-size:13px} h1,h2,h3{font-weight:700;margin:8px 0} p{margin:6px 0} table{border-collapse:collapse;width:100%;margin:12px 0} th,td{border:1px solid #e4e4e7;padding:6px 8px;text-align:left;font-size:12px} th{background:#f4f4f5} a{color:#2563eb;word-break:break-all}</style></head><body><p style="font-size:11px;color:#71717a;border-bottom:1px solid #e4e4e7;padding-bottom:8px;margin-bottom:12px">Konu: ${safeSubject}</p>${body}</body></html>`;
  }, [subject, htmlBody]);

  const handleCopyHtml = useCallback(async (): Promise<void> => {
    const html: string = previewHtml || fallbackHtml;
    try {
      await navigator.clipboard.writeText(html);
      toast.success("Kopyalandı");
    } catch {
      toast.error("Kopyalama başarısız");
    }
  }, [previewHtml, fallbackHtml]);

  const validateForm = useCallback((): boolean => {
    let valid = true;
    if (name.trim()) {
      setNameError(undefined);
    } else {
      setNameError("Şablon adı zorunlu");
      valid = false;
    }
    if (!subject.trim()) {
      setSubjectError("Konu zorunlu");
      valid = false;
    } else if (subject.length > 200) {
      setSubjectError("En fazla 200 karakter");
      valid = false;
    } else {
      setSubjectError(undefined);
    }
    if (htmlBody.trim()) {
      setHtmlBodyError(undefined);
    } else {
      setHtmlBodyError("HTML gövdesi zorunlu");
      valid = false;
    }
    return valid;
  }, [name, subject, htmlBody]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTenant?.id) {
        return;
      }
      if (!validateForm()) {
        return;
      }
      const variables = extractVariables(`${subject} ${htmlBody}`);
      setIsSaving(true);
      try {
        const payload: Partial<QuoteTemplateDto> = {
          bankDetails: bankDetails.trim() || undefined,
          deliveryTerms: deliveryTerms.trim() || undefined,
          htmlBody: htmlBody.trim(),
          isDefault,
          name: name.trim(),
          paymentTerms: paymentTerms.trim() || undefined,
          subject: subject.trim(),
          termsAndConditions: termsAndConditions.trim() || undefined,
          variables,
        };
        if (editingId) {
          const res = await ApiClient.updateQuoteTemplate(
            editingId,
            payload,
            activeTenant.id
          );
          if (!res.success) {
            toast.error(res.message || "Güncelleme başarısız");
            return;
          }
          toast.success("Şablon güncellendi");
        } else {
          const res = await ApiClient.createQuoteTemplate(
            payload,
            activeTenant.id
          );
          if (!res.success) {
            toast.error(res.message || "Oluşturma başarısız");
            return;
          }
          toast.success("Yeni şablon oluşturuldu");
        }
        // Optimistic IsDefault: single default per tenant — refresh list
        resetForm();
        await fetchTemplates();
      } catch {
        toast.error("İşlem sırasında hata oluştu");
      } finally {
        setIsSaving(false);
      }
    },
    [
      activeTenant?.id,
      bankDetails,
      deliveryTerms,
      editingId,
      extractVariables,
      fetchTemplates,
      htmlBody,
      isDefault,
      name,
      paymentTerms,
      resetForm,
      subject,
      termsAndConditions,
      validateForm,
    ]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!(activeTenant?.id && deleteConfirmId)) {
      return;
    }
    setIsDeletingId(deleteConfirmId);
    try {
      const res = await ApiClient.deleteQuoteTemplate(
        deleteConfirmId,
        activeTenant.id
      );
      if (!res.success) {
        toast.error(res.message || "Silinemedi");
        return;
      }
      toast.success("Şablon silindi");
      if (editingId === deleteConfirmId) {
        resetForm();
      }
      setDeleteConfirmId(null);
      await fetchTemplates();
    } catch {
      toast.error("Silinemedi");
    } finally {
      setIsDeletingId(null);
    }
  }, [activeTenant?.id, deleteConfirmId, editingId, fetchTemplates, resetForm]);

  // Debounced preview — 400ms on subject/htmlBody/quoteId change, abort previous via AbortController + requestId race guard
  useEffect(() => {
    if (!editingId) {
      setPreviewHtml("");
      setPreviewSubject("");
      setPreviewError(null);
      setIsPreviewLoading(false);
      return;
    }
    if (!(subject.trim() || htmlBody.trim())) {
      setPreviewHtml("");
      setPreviewSubject("");
      setPreviewError(null);
      setIsPreviewLoading(false);
      return;
    }
    if (!activeTenant?.id) {
      return;
    }
    const controller = new AbortController();
    const currentId = (previewRequestIdRef.current += 1);
    setIsPreviewLoading(true);
    setPreviewError(null);
    const handle = window.setTimeout(async () => {
      if (controller.signal.aborted) {
        return;
      }
      try {
        const res = await ApiClient.previewQuoteTemplate(
          editingId,
          { quoteId: previewQuoteId ?? undefined, variables: {} },
          activeTenant.id
        );
        if (
          controller.signal.aborted ||
          previewRequestIdRef.current !== currentId
        ) {
          return;
        }
        if (res.success && res.data) {
          setPreviewHtml(res.data.html);
          setPreviewSubject(res.data.subject ?? "");
          setPreviewError(null);
        } else {
          setPreviewError(res.message || "Önizleme alınamadı");
          setPreviewHtml("");
          setPreviewSubject("");
        }
      } catch {
        if (
          controller.signal.aborted ||
          previewRequestIdRef.current !== currentId
        ) {
          return;
        }
        setPreviewError("Önizleme sırasında hata oluştu");
        setPreviewHtml("");
        setPreviewSubject("");
      } finally {
        if (
          !controller.signal.aborted &&
          previewRequestIdRef.current === currentId
        ) {
          setIsPreviewLoading(false);
        }
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [editingId, subject, htmlBody, previewQuoteId, activeTenant?.id]);

  // Fetch recent quotes for real-data preview selector
  useEffect(() => {
    if (!(isOpen && activeTenant?.id)) {
      return;
    }
    let cancelled = false;
    const fetchQuotesForPreview = async (): Promise<void> => {
      setIsQuotesLoading(true);
      try {
        const res = await ApiClient.getQuotes(
          { pageSize: 20 },
          activeTenant.id
        );
        if (!cancelled && res.success && res.data) {
          setPreviewQuotes(res.data.items ?? []);
        }
      } catch {
        // ignore preview quote fetch errors
      } finally {
        if (!cancelled) {
          setIsQuotesLoading(false);
        }
      }
    };
    void fetchQuotesForPreview();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTenant?.id]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTestSendOpen) {
          setIsTestSendOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTestSendOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const selectedTemplate = editingId
    ? (templates.find((t) => t.id === editingId) ?? null)
    : null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton={false}
      >
        <PermissionGate
          fallback={
            <div className="p-8 text-center">
              <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                Bu alanı görüntülemek için yetkiniz yok.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Yöneticinizden Quotes.Templates izni isteyin.
              </p>
              <button
                className="mt-4 rounded-xl border border-border bg-card px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
                onClick={onClose}
                type="button"
              >
                Kapat
              </button>
            </div>
          }
          permission="Quotes.Templates"
        >
          {/* Header — Bento, 1px border, Geist, 4pt spacing, 8-20px radii */}
          <div className="flex shrink-0 items-center justify-between border-border border-b bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 dark:bg-zinc-900/80">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <Settings className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate font-bold text-sm text-zinc-900 tracking-tight sm:text-base dark:text-zinc-100">
                  E-posta Şablonları
                </DialogTitle>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Handlebars konu + HTML gövdesi — değişken ekle, varsayılan
                  seç, kaydet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="hidden rounded-xl border border-border bg-card px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:bg-zinc-50 sm:inline-flex dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                onClick={handleSelectNew}
                type="button"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Yeni Şablon
              </button>
              <DialogClose asChild>
                <button
                  className="shrink-0 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          {/* Body — Workbench Bento Grid, responsive stacked on mobile */}
          <div className="custom-scrollbar flex flex-1 flex-col overflow-hidden">
            {/* Template list strip */}
            <div className="shrink-0 border-border border-b bg-zinc-50/60 px-3 py-2.5 sm:px-4 dark:bg-zinc-800/20">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[11px] text-zinc-600 uppercase tracking-wider dark:text-zinc-400">
                  Şablonlar ({templates.length})
                </span>
                {isLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Yükleniyor...
                  </span>
                ) : null}
              </div>
              <div className="custom-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {templates.length === 0 && !isLoading ? (
                  <span className="rounded-xl border border-border border-dashed bg-card px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Henüz şablon yok — sağdaki editörden oluşturun.
                  </span>
                ) : (
                  templates.map((t) => {
                    const isActive = t.id === editingId;
                    return (
                      <button
                        className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-2xs transition ${ isActive ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100" : "border-border bg-card text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50" }`}
                        key={t.id}
                        onClick={() => handleEdit(t)}
                        type="button"
                      >
                        <span className="max-w-[160px] truncate font-semibold text-xs">
                          {t.name}
                        </span>
                        {t.isDefault ? (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 font-bold text-[9px] text-white">
                            Varsayılan
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Split-pane editor: left = editor, right = preview placeholder */}
            <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
              {/* Left pane — editor (Bento card, 1px border, blur) */}
              <div className="custom-scrollbar overflow-y-auto border-border p-4 sm:p-5 lg:border-r">
                <div className="rounded-xl border border-border bg-card p-4 shadow-2xs backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      {editingId ? "Şablonu Düzenle" : "Yeni Şablon"}
                      {selectedTemplate?.isDefault ? (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 font-bold text-[9px] text-blue-700">
                          Varsayılan
                        </span>
                      ) : null}
                    </h4>
                    {editingId ? (
                      <button
                        className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        onClick={handleSelectNew}
                        type="button"
                      >
                        Temizle
                      </button>
                    ) : null}
                  </div>

                  <form className="space-y-4" onSubmit={handleSave}>
                    <div className="space-y-1.5">
                      <Label className="text-xs" required>
                        Şablon Adı
                      </Label>
                      <Input
                        error={nameError}
                        maxLength={255}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setName(e.target.value)
                        }
                        placeholder="Örn: Standart Kurumsal Teklif"
                        required
                        value={name}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs" required>
                        E-posta Konusu
                      </Label>
                      <Input
                        error={subjectError}
                        maxLength={200}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSubject(e.target.value)
                        }
                        placeholder="{{companyName}} Teklif #{{quoteNumber}}"
                        required
                        value={subject}
                      />
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                        {subject.length}/200 — Handlebars değişkenleri
                        desteklenir
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs" required>
                        E-posta HTML Gövdesi
                      </Label>
                      <Textarea
                        className="min-h-[180px] font-mono text-xs leading-relaxed"
                        error={htmlBodyError}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setHtmlBody(e.target.value)
                        }
                        placeholder="<h1>Merhaba {{customerName}}</h1> <p>Teklif tutarı: {{totalAmount}}</p> {{itemsTable}}"
                        ref={htmlBodyRef}
                        required
                        rows={12}
                        value={htmlBody}
                      />
                    </div>

                    <div className="rounded-xl border border-border bg-zinc-50/50 p-3 dark:bg-zinc-800/30">
                      <VariableChips onInsert={insertVariable} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                      <div>
                        <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          Varsayılan şablon
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Yeni tekliflerde otomatik seçilir
                        </p>
                      </div>
                      <Checkbox
                        checked={isDefault}
                        onCheckedChange={(checked) =>
                          setIsDefault(checked === true)
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-border">
                      <button
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        onClick={() => setShowExtraFields((prev) => !prev)}
                        type="button"
                      >
                        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                          Ek Alanlar
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {showExtraFields ? "Gizle" : "Göster"}
                        </span>
                      </button>
                      {showExtraFields ? (
                        <div className="space-y-3 border-border border-t p-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Ödeme Şartları</Label>
                              <Textarea
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) => setPaymentTerms(e.target.value)}
                                placeholder="Ödeme koşulları..."
                                rows={2}
                                value={paymentTerms}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Teslimat Koşulları
                              </Label>
                              <Textarea
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) => setDeliveryTerms(e.target.value)}
                                placeholder="Teslimat koşulları..."
                                rows={2}
                                value={deliveryTerms}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">
                              Banka & IBAN Bilgileri
                            </Label>
                            <Textarea
                              onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>
                              ) => setBankDetails(e.target.value)}
                              placeholder="Banka bilgileri..."
                              rows={2}
                              value={bankDetails}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">
                              Genel Şartlar & Koşullar
                            </Label>
                            <Textarea
                              onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>
                              ) => setTermsAndConditions(e.target.value)}
                              placeholder="Genel hükümler..."
                              rows={2}
                              value={termsAndConditions}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {editingId ? (
                        <button
                          className="rounded-xl border border-rose-200 bg-card px-4 py-2 font-semibold text-rose-600 text-xs transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          disabled={isSaving || isDeletingId === editingId}
                          onClick={() => setDeleteConfirmId(editingId)}
                          type="button"
                        >
                          {isDeletingId === editingId ? "Siliniyor..." : "Sil"}
                        </button>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                          onClick={() => {
                            if (editingId) {
                              const orig = templates.find(
                                (t) => t.id === editingId
                              );
                              if (orig) {
                                handleEdit(orig);
                              }
                            } else {
                              resetForm();
                            }
                          }}
                          type="button"
                        >
                          Sıfırla
                        </button>
                        <button
                          className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                          disabled={isSaving}
                          type="submit"
                        >
                          {isSaving
                            ? "Kaydediliyor..."
                            : editingId
                              ? "Güncelle"
                              : "Şablonu Kaydet"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right pane — live preview iframe + zoom/copy + test-send (subtask 06) */}
              <div className="flex flex-col overflow-hidden bg-zinc-50/50 p-4 sm:p-5 dark:bg-zinc-800/20">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                    disabled={!editingId}
                    onClick={() => setIsTestSendOpen(true)}
                    type="button"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Test Gönder</span>
                  </button>
                  {editingId ? null : (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Kaydedilmemiş şablon — yerel fallback önizleme
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <TemplatePreview
                    error={previewError}
                    fallbackHtml={fallbackHtml}
                    isLoading={isPreviewLoading}
                    isQuotesLoading={isQuotesLoading}
                    onCopy={handleCopyHtml}
                    onQuoteChange={setPreviewQuoteId}
                    onZoomChange={setPreviewZoom}
                    previewHtml={previewHtml}
                    previewSubject={previewSubject}
                    quoteId={previewQuoteId}
                    quoteOptions={previewQuotes}
                    zoom={previewZoom}
                  />
                </div>
              </div>
            </div>
          </div>
        </PermissionGate>

        <ConfirmDialog
          cancelText="Vazgeç"
          confirmText="Evet, sil"
          description={
            deleteConfirmId
              ? `"${templates.find((t) => t.id === deleteConfirmId)?.name ?? "Bu şablon"}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`
              : "Bu şablon silinecek."
          }
          loading={isDeletingId !== null}
          onConfirm={handleDeleteConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmId(null);
            }
          }}
          open={deleteConfirmId !== null}
          title="Şablonu sil?"
          variant="destructive"
        />

        <TestSendModal
          initialQuoteId={previewQuoteId}
          isOpen={isTestSendOpen}
          onClose={() => setIsTestSendOpen(false)}
          quoteOptions={previewQuotes}
          templateId={editingId}
          templateName={selectedTemplate?.name}
        />
      </DialogContent>
    </Dialog>
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
      <TableRow>
        <TableCell style="padding: 4px 6px; font-weight: 700;">%${rate}</TableCell>
        <TableCell style="padding: 4px 6px; text-align: right;">${formatCur(vals.baseAmount)}</TableCell>
        <TableCell style="padding: 4px 6px; text-align: right; font-weight: 700;">${formatCur(vals.taxAmount)}</TableCell>
      </TableRow>
    `
    )
    .join("");

  const itemsHtml = quote.items
    .map(
      (item, idx) => `
    <TableRow style="${item.isOptional ? "background-color: #fefce8; opacity: 0.85;" : idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <TableCell style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${idx + 1}</TableCell>
      <TableCell style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 700; color: #0f172a;">${item.productName}</div>
        ${item.sku ? `<div style="font-size: 9px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>` : ""}
        ${item.description ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${item.description}</div>` : ""}
        ${item.isOptional ? `<div style="display: inline-block; background-color: #fef08a; color: #713f12; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 4px; margin-top: 2px;">Opsiyonel Kalem (Toplama Dahil Değil)</div>` : ""}
      </TableCell>
      <TableCell style="padding: 7px 8px; text-align: center; font-weight: 700; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${item.quantity} ${item.unit}</TableCell>
      <TableCell style="padding: 7px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${formatCur(item.unitPrice)}</TableCell>
      <TableCell style="padding: 7px 8px; text-align: center; font-weight: 700; color: #e11d48; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${item.discountRate > 0 ? `%${item.discountRate}` : "-"}</TableCell>
      <TableCell style="padding: 7px 8px; text-align: center; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">%${item.taxRate}</TableCell>
      <TableCell style="padding: 7px 8px; text-align: right; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${formatCur(item.totalPrice)}</TableCell>
    </TableRow>
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
        <Table class="items-table">
          <TableHeader>
            <TableRow>
              <TableHead style="width: 25px; text-align: center;">#</TableHead>
              <TableHead>Ürün / Hizmet Tanımı</TableHead>
              <TableHead style="width: 70px; text-align: center;">Miktar</TableHead>
              <TableHead style="width: 90px; text-align: right;">Birim Fiyat</TableHead>
              <TableHead style="width: 55px; text-align: center;">İskonto</TableHead>
              <TableHead style="width: 45px; text-align: center;">KDV</TableHead>
              <TableHead style="width: 100px; text-align: right;">Toplam Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            ${itemsHtml}
          </TableBody>
        </Table>

        <!-- 4. Financial Matrix -->
        <div class="bottom-grid">
          <div class="tax-box">
            <div class="party-label" style="color: #64748b;">KDV ORAN & MATRAH DAĞILIMI</div>
            <Table class="tax-table">
              <TableHeader>
                <TableRow>
                  <TableHead style="text-align: left;">Oran</TableHead>
                  <TableHead style="text-align: right;">Matrah</TableHead>
                  <TableHead style="text-align: right;">KDV Tutarı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                ${taxRows}
              </TableBody>
            </Table>
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="z-20 flex shrink-0 items-center justify-between border-border border-b bg-card px-4 py-3.5 shadow-2xs sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-bold text-primary sm:h-10 sm:w-10">
              <FileSpreadsheet className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="font-bold text-foreground text-sm">
                  Teklif Belgesi Önizleme
                </DialogTitle>
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

            <DialogClose asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Kapat (ESC)"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Modal Scrollable Canvas Body */}
        <div className="flex flex-1 items-start justify-center overflow-x-auto overflow-y-auto bg-muted/40 p-4 sm:p-6 dark:bg-zinc-950/80">
          {isLoading || !quote ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <RefreshCw className="mb-3 h-8 w-8 animate-spin text-primary" />
              <span className="font-semibold text-xs">
                Teklif belgesi hazırlanıyor...
              </span>
            </div>
          ) : (
            <div
              className="my-1 w-full max-w-[210mm] shrink-0 select-text space-y-5 rounded-xl border border-border bg-card p-6 text-zinc-900 shadow-xl sm:p-10 dark:text-zinc-100"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
            >
              {/* 1. Header & Branding */}
              <div className="flex items-start justify-between gap-4 border-zinc-900 border-b-2 pb-4">
                <div className="max-w-sm space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground text-sm shadow-xs">
                      {activeTenant?.name
                        ? activeTenant.name.charAt(0).toUpperCase()
                        : "C"}
                    </div>
                    <h1 className="font-black text-lg text-zinc-900 uppercase tracking-tight dark:text-zinc-100">
                      {activeTenant?.name || "CRM ŞİRKETİ"}
                    </h1>
                  </div>
                  <p className="font-medium text-[10px] text-zinc-500 dark:text-zinc-400">
                    Kurumsal Satış & Fiyat Teklifi / Proforma Belgesi
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <div className="inline-flex items-center gap-2 rounded-md border border-border bg-zinc-100 px-2.5 py-0.5 dark:bg-zinc-800">
                    <span className="font-black font-mono text-xs text-zinc-900 tracking-wider dark:text-zinc-100">
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
                <div className="space-y-0.5 rounded-xl border border-border bg-zinc-50/70 p-3 dark:bg-zinc-800/40">
                  <span className="block font-extrabold text-[8px] text-blue-700 uppercase tracking-wider">
                    SAYIN / MÜŞTERİ (ALICI)
                  </span>
                  <h3 className="font-extrabold text-xs text-zinc-900 leading-snug dark:text-zinc-100">
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

                <div className="space-y-0.5 rounded-xl border border-border bg-zinc-50/70 p-3 dark:bg-zinc-800/40">
                  <span className="block font-extrabold text-[8px] text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    TEKLİFİ VEREN / TEMSİLCİ
                  </span>
                  <h3 className="font-extrabold text-xs text-zinc-900 leading-snug dark:text-zinc-100">
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
              <div className="overflow-hidden rounded-xl border border-border">
                <Table className="border-collapse text-[10px]">
                  <TableHeader>
                    <TableRow className="bg-zinc-900 font-bold text-[9px] text-white uppercase tracking-wider">
                      <TableHead className="w-7 px-2.5 py-2 text-center h-auto">#</TableHead>
                      <TableHead className="px-2.5 py-2 h-auto">Ürün / Hizmet Açıklaması</TableHead>
                      <TableHead className="w-14 px-2 py-2 text-center h-auto">Miktar</TableHead>
                      <TableHead className="w-20 px-2 py-2 text-right h-auto">Birim Fiyat</TableHead>
                      <TableHead className="w-12 px-2 py-2 text-center h-auto">İskonto</TableHead>
                      <TableHead className="w-10 px-2 py-2 text-center h-auto">KDV</TableHead>
                      <TableHead className="w-24 px-2.5 py-2 text-right h-auto">
                        Toplam Tutar
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-200 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                    {quote.items.map((item, idx) => (
                      <TableRow
                        className={
                          item.isOptional
                            ? "bg-amber-50/60 opacity-85"
                            : idx % 2 === 1
                              ? "bg-zinc-50/70 dark:bg-zinc-800/40"
                              : "bg-card"
                        }
                        key={item.id}
                      >
                        <TableCell className="px-2.5 py-1.5 text-center font-bold text-zinc-400 dark:text-zinc-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="px-2.5 py-1.5">
                          <span className="block font-bold text-zinc-900 leading-tight dark:text-zinc-100">
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
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-zinc-800 dark:text-zinc-200">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(item.unitPrice, quote.currency)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-center font-bold text-rose-600">
                          {item.discountRate > 0
                            ? `%${item.discountRate}`
                            : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-center text-zinc-600 dark:text-zinc-400">
                          %{item.taxRate}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2.5 py-1.5 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(item.totalPrice, quote.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 4. Financial Calculations & Tax Breakdown Matrix */}
              <div className="grid grid-cols-1 gap-3 pt-0.5 sm:grid-cols-2">
                {/* Left: VAT Rate Breakdown Box */}
                <div className="space-y-1.5 rounded-xl border border-border bg-zinc-50/50 p-2.5 dark:bg-zinc-800/30">
                  <span className="block font-extrabold text-[8px] text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    KDV ORAN & MATRAH DAĞILIMI
                  </span>
                  <Table className="text-[9px]">
                    <TableHeader>
                      <TableRow className="border-border font-bold text-zinc-500 dark:text-zinc-400">
                        <TableHead className="pb-1">Oran</TableHead>
                        <TableHead className="pb-1 text-right">Matrah</TableHead>
                        <TableHead className="pb-1 text-right">KDV Tutarı</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-zinc-100 font-medium text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
                      {taxBreakdown.map((t) => (
                        <TableRow key={t.rate}>
                          <TableCell className="py-0.5 font-bold">%{t.rate}</TableCell>
                          <TableCell className="py-0.5 text-right">
                            {formatCurrency(t.baseAmount, quote.currency)}
                          </TableCell>
                          <TableCell className="py-0.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(t.taxAmount, quote.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Right: Totals Box */}
                <div className="space-y-1 rounded-xl border-2 border-zinc-900 bg-zinc-50 p-3 text-[11px] dark:bg-zinc-800/50">
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

                  <div className="flex items-baseline justify-between border-zinc-900 border-t-2 pt-1.5">
                    <span className="font-black text-[11px] text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      GENEL TOPLAM:
                    </span>
                    <span className="font-black text-blue-700 text-sm">
                      {formatCurrency(quote.totalAmount, quote.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Terms & Banking Details */}
              <div className="grid grid-cols-1 gap-2.5 text-[9px] text-zinc-700 sm:grid-cols-2 dark:text-zinc-300">
                {quote.paymentTerms && (
                  <div className="space-y-0.5 rounded-lg border border-border bg-card p-2">
                    <span className="block font-bold text-[8px] text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      ÖDEME VE VADE KOŞULLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
                      {quote.paymentTerms}
                    </p>
                  </div>
                )}

                {quote.deliveryTerms && (
                  <div className="space-y-0.5 rounded-lg border border-border bg-card p-2">
                    <span className="block font-bold text-[8px] text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      TESLİMAT VE SEVKİYAT ŞARTLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
                      {quote.deliveryTerms}
                    </p>
                  </div>
                )}

                {quote.bankDetails && (
                  <div className="space-y-0.5 rounded-lg border border-border bg-zinc-50 p-2 font-mono sm:col-span-2 dark:bg-zinc-800/50">
                    <span className="block font-bold font-sans text-[8px] text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      RESMİ BANKA VE HESAP (IBAN) BİLGİLERİ:
                    </span>
                    <p className="whitespace-pre-line text-zinc-700 leading-relaxed dark:text-zinc-300">
                      {quote.bankDetails}
                    </p>
                  </div>
                )}

                {quote.termsAndConditions && (
                  <div className="space-y-0.5 rounded-lg border border-border bg-card p-2 sm:col-span-2">
                    <span className="block font-bold text-[8px] text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                      GENEL HÜKÜMLER VE GARANTİ ŞARTLARI:
                    </span>
                    <p className="whitespace-pre-line text-zinc-600 leading-relaxed dark:text-zinc-400">
                      {quote.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Stamp / Signature Box */}
              <div className="grid grid-cols-2 gap-6 pt-2 text-center text-[9px]">
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                    TEKLİFİ DÜZENLEYEN (FİRMA YETKİLİSİ)
                  </p>
                  <p className="mt-0.5 text-[8px] text-zinc-500 dark:text-zinc-400">
                    Yetkili Kaşe & İmza
                  </p>
                  <div className="mt-2 flex h-12 items-end justify-center border-border border-b border-dashed pb-1">
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                      {quote.assignedUserName || activeTenant?.name}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="font-bold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
                    TEKLİFİ ONAYLAYAN (MÜŞTERİ YETKİLİSİ)
                  </p>
                  <p className="mt-0.5 text-[8px] text-zinc-500 dark:text-zinc-400">
                    Kabul & Onay İmzası
                  </p>
                  <div className="mt-2 flex h-12 items-end justify-center border-border border-b border-dashed pb-1">
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                      {quote.customerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Document Footer Bar */}
              <div className="mt-4 flex items-center justify-between border-border border-t pt-2.5 text-[8px] text-zinc-400 dark:text-zinc-500">
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
      </DialogContent>
    </Dialog>
  );
}
