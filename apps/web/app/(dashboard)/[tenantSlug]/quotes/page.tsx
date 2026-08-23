"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Building,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Kanban,
  Layers,
  Link as LinkIcon,
  List,
  Mail,
  MoreHorizontal,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CustomerListDto,
  type DealSummaryDto,
  type ProductListDto,
  type PublicQuoteViewDto,
  type QuoteActivityDto,
  type QuoteDetailDto,
  type QuoteItemDto,
  type QuoteRevisionSummaryDto,
  type QuoteStatsResponse,
  type QuoteSummaryDto,
  type QuoteTemplateDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

// Currency Formatter Helper
const formatCurrency = (amount: number, currency = "TRY") => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

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
    if (!activeTenant?.id) return;
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
    if (!activeTenant?.id) return;
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
  const statusCounts = useMemo(() => {
    return {
      All: quotes.length,
      Draft: quotes.filter((q) => q.status === "Draft").length,
      PendingApproval: quotes.filter((q) => q.status === "PendingApproval").length,
      Sent: quotes.filter((q) => q.status === "Sent" || q.status === "Viewed").length,
      Accepted: quotes.filter((q) => q.status === "Accepted").length,
      Rejected: quotes.filter((q) => q.status === "Rejected").length,
      Expired: quotes.filter((q) => q.status === "Expired").length,
    };
  }, [quotes]);

  return (
    <div className="space-y-6 p-6">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight">
                Teklif Yönetimi & Fiyatlandırma
              </h1>
              <p className="text-slate-500 text-xs">
                Müşteri teklifleri, çoklu revizyonlar, iskonto onayları ve sipariş dönüşümleri
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTemplatesOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Şart Şablonları</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchQuotes();
              fetchStats();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:bg-slate-50 hover:text-slate-800"
            title="Yenile"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <PermissionGate permission="Quotes.Create">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
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
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold text-xs text-slate-600">Açık Teklif Hacmi</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
              {formatCurrency(stats?.activeProposalsVolume || 0)}
            </div>
            <p className="mt-1 font-medium text-[11px] text-slate-500">
              {stats?.totalQuotes || 0} toplam teklif kaydı
            </p>
          </div>
        </div>

        {/* Card 2: Conversion Rate */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold text-xs text-slate-600">Kabul & Kazanma Oranı</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
                %{stats?.conversionRate || 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                {stats?.acceptedCount || 0} Sipariş
              </span>
            </div>
            <p className="mt-1 font-medium text-[11px] text-slate-500">
              Onaylanan ve siparişe dönüşen teklifler
            </p>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold text-xs text-slate-600">Yönetici Onayı Bekleyen</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
              {stats?.pendingApprovalCount || 0}
            </div>
            <p className="mt-1 font-medium text-[11px] text-amber-600">
              İskonto / limit eşiği aşan teklifler
            </p>
          </div>
        </div>

        {/* Card 4: Sent / Viewed / Expired */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold text-xs text-slate-600">Müşteride Olanlar</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
                {stats?.sentCount || 0}
              </span>
              {stats?.expiredCount ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-bold text-[10px] text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.expiredCount} Süresi Dolan
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-medium text-[11px] text-slate-500">
              İncelemede & karar bekleyenler
            </p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Status Filter Tabs */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { key: "All", label: "Tüm Teklifler" },
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
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatus(tab.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {statusCounts[tab.key as keyof typeof statusCounts] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Teklif no, başlık veya müşteri adına göre ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* 4. Quotes Data Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <span className="font-semibold text-xs">Teklifler yükleniyor...</span>
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Teklif Bulunamadı</h3>
            <p className="mt-1 text-slate-500 text-xs max-w-sm">
              Bu filtre kriterlerine uygun teklif kaydı bulunamadı. Yeni bir teklif oluşturabilirsiniz.
            </p>
            <PermissionGate permission="Quotes.Create">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Teklif Oluştur</span>
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Teklif No & Revizyon</th>
                  <th className="py-3.5 px-4">Teklif Başlığı & Müşteri</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Tutar & İskonto</th>
                  <th className="py-3.5 px-4">Geçerlilik</th>
                  <th className="py-3.5 px-4">Temsilci</th>
                  <th className="py-3.5 px-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {quotes.map((quote) => {
                  return (
                    <tr
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      {/* 1. Quote Number & Revision Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">
                            {quote.quoteNumber}
                          </span>
                          <span className="rounded-md bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
                            R{quote.revisionNumber}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {quote.itemCount} Kalem
                        </span>
                      </td>

                      {/* 2. Title & Customer */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate group-hover:text-blue-600 transition">
                          {quote.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                          <Building className="h-3 w-3 text-slate-400 flex-none" />
                          <span className="truncate">{quote.customerName}</span>
                        </div>
                      </td>

                      {/* 3. Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <QuoteStatusBadge status={quote.status} />
                      </td>

                      {/* 4. Total Amount & Discount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block">
                          {formatCurrency(quote.totalAmount, quote.currency)}
                        </span>
                        {quote.discountAmount > 0 && (
                          <span className="text-[10px] font-semibold text-rose-600 block">
                            -%{quote.discountRate} İskonto ({formatCurrency(quote.discountAmount, quote.currency)})
                          </span>
                        )}
                      </td>

                      {/* 5. Valid Until */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {quote.validUntil ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(quote.validUntil).toLocaleDateString("tr-TR")}</span>
                          </div>
                        ) : (
                          <span>Süresiz</span>
                        )}
                      </td>

                      {/* 6. Assigned User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {quote.assignedUserName ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {quote.assignedUserName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-700 text-xs">
                              {quote.assignedUserName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Atanmamış</span>
                        )}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedQuoteId(quote.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Detay & İncele"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintQuoteId(quote.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Yazdır / PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const publicUrl = `${window.location.origin}/quotes/view/${quote.publicViewToken}`;
                              navigator.clipboard.writeText(publicUrl);
                              toast.success("Müşteri dijital teklif linki panoya kopyalandı");
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Müşteri Linkini Kopyala"
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
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          onUpdated={() => {
            fetchQuotes();
            fetchStats();
          }}
          onPrint={(qid) => setPrintQuoteId(qid)}
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
          quoteId={printQuoteId}
          onClose={() => setPrintQuoteId(null)}
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
    case "Draft":
      return (
        <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 font-bold text-[10px] text-slate-700">
          Taslak
        </span>
      );
    case "PendingApproval":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-bold text-[10px] text-amber-700">
          <AlertCircle className="h-3 w-3" />
          Onay Bekliyor
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Onaylandı
        </span>
      );
    case "Sent":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-bold text-[10px] text-blue-700">
          <Send className="h-3 w-3" />
          Müşteride
        </span>
      );
    case "Viewed":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-0.5 font-bold text-[10px] text-purple-700">
          <Eye className="h-3 w-3" />
          İncelendi
        </span>
      );
    case "Accepted":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700">
          <Award className="h-3 w-3" />
          Kabul Edildi
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-0.5 font-bold text-[10px] text-rose-700">
          <XCircle className="h-3 w-3" />
          Reddedildi
        </span>
      );
    case "Expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-0.5 font-bold text-[10px] text-red-700">
          <Clock className="h-3 w-3" />
          Süresi Doldu
        </span>
      );
    case "Revised":
      return (
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 font-bold text-[10px] text-slate-500">
          Revize Edildi
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 font-bold text-[10px] text-slate-600">
          {status}
        </span>
      );
  }
}

// ============================================================================
// CREATE QUOTE MODAL WIZARD
// ============================================================================
interface CreateQuoteItemForm {
  productId?: string;
  variantId?: string;
  productName: string;
  sku?: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
  discountRate: number;
  taxRate: number;
  isOptional: boolean;
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
  const [discountType, setDiscountType] = useState<"Percentage" | "Amount">("Percentage");
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
      productName: "",
      quantity: 1,
      unit: "Adet",
      unitPrice: 0,
      unitCost: 0,
      discountRate: 0,
      taxRate: 20,
      isOptional: false,
    },
  ]);

  // Load supporting options
  useEffect(() => {
    if (!activeTenant?.id) return;
    const loadData = async () => {
      try {
        const [cRes, dRes, pRes, tRes] = await Promise.all([
          ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
          ApiClient.getDeals({ pageSize: 100 }, activeTenant.id),
          ApiClient.getProducts({ pageSize: 100 }, activeTenant.id),
          ApiClient.getQuoteTemplates(activeTenant.id),
        ]);

        if (cRes.success && cRes.data?.items) setCustomers(cRes.data.items);
        if (dRes.success && dRes.data?.items) setDeals(dRes.data.items);
        if (pRes.success && pRes.data?.items) setProducts(pRes.data.items);
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
        if (c) setCustomerName(c.name);
      }
      if (d.contactName && !customerName) {
        setCustomerName(d.contactName);
      }
      if (d.currency) setCurrency(d.currency);
      setTitle(`${d.title} Teklifi`);
    }
  };

  // Add Item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        quantity: 1,
        unit: "Adet",
        unitPrice: 0,
        unitCost: 0,
        discountRate: 0,
        taxRate: 20,
        isOptional: false,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof CreateQuoteItemForm, val: any) => {
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
      if (item.isOptional) return;
      const raw = (item.unitPrice || 0) * (item.quantity || 1);
      const itemDisc = item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
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
      if (discountRate > 15) requiresApproval = true;
    } else if (discountType === "Amount" && discountAmount > 0) {
      generalDiscountAmt = discountAmount;
      if (subtotal > 0 && generalDiscountAmt / subtotal > 0.15) {
        requiresApproval = true;
      }
    }

    const grandTotal = Math.max(0, subtotal - generalDiscountAmt + totalTax);

    return {
      subtotal,
      totalItemDiscount,
      generalDiscountAmt,
      totalDiscount: totalItemDiscount + generalDiscountAmt,
      totalTax,
      grandTotal,
      requiresApproval,
    };
  }, [items, discountType, discountRate, discountAmount]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.id) return;
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
      validUntil.setDate(validUntil.getDate() + (parseInt(validDays) || 15));

      const payload = {
        title: title.trim(),
        customerId: customerId || undefined,
        customerName: customerName.trim(),
        dealId: dealId || undefined,
        assignedUserId: profile?.id,
        assignedUserName: profile?.fullName || "Temsilci",
        currency,
        discountType,
        discountRate,
        discountAmount: calculations.generalDiscountAmt,
        validUntil: validUntil.toISOString(),
        termsAndConditions: termsAndConditions.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        deliveryTerms: deliveryTerms.trim() || undefined,
        bankDetails: bankDetails.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((i, idx) => ({
          productId: i.productId || undefined,
          variantId: i.variantId || undefined,
          productName: i.productName.trim(),
          sku: i.sku?.trim(),
          description: i.description?.trim(),
          quantity: i.quantity || 1,
          unit: i.unit || "Adet",
          unitPrice: i.unitPrice || 0,
          unitCost: i.unitCost || 0,
          discountRate: i.discountRate || 0,
          taxRate: i.taxRate ?? 20,
          isOptional: i.isOptional,
          isSelected: true,
          orderIndex: idx,
        })),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Yeni Teklif Hazırla</h2>
              <p className="text-slate-500 text-xs">
                Müşteri, ürün kalemleri, KDV, iskonto ve şartnameleri belirleyin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {/* Section 1: Customer & Deal Linking */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-4">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>1. Müşteri & Fırsat Bilgileri</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Customer select or text */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Müşteri Seçin
                </label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerPick(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
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
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Müşteri Ünvanı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: ABC Holding A.Ş."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Deal Link */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Bağlı Pipeline Fırsatı (Opsiyonel)
                </label>
                <select
                  value={dealId}
                  onChange={(e) => handleDealPick(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Proposal Title */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Teklif Başlığı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yıllık Yazılım ve Altyapı Lisans Teklifi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Currency & Validity */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Para Birimi
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Geçerlilik
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
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
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-600" />
                <span>2. Teklif Kalemleri & Ürünler</span>
              </h3>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 min-w-[200px]">Ürün / Hizmet Adı</th>
                    <th className="py-2.5 px-2 w-20">Miktar</th>
                    <th className="py-2.5 px-2 w-24">Birim</th>
                    <th className="py-2.5 px-2 w-28">Birim Fiyat</th>
                    <th className="py-2.5 px-2 w-20">İskonto %</th>
                    <th className="py-2.5 px-2 w-20">KDV %</th>
                    <th className="py-2.5 px-2 w-28 text-right">Tutar</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item, idx) => {
                    const raw = (item.unitPrice || 0) * (item.quantity || 1);
                    const disc = item.discountRate > 0 ? raw * (item.discountRate / 100) : 0;
                    const afterDisc = Math.max(0, raw - disc);
                    const tax = item.taxRate > 0 ? afterDisc * (item.taxRate / 100) : 0;
                    const total = afterDisc + tax;

                    return (
                      <tr key={idx} className={`hover:bg-slate-50/60 ${item.isOptional ? "opacity-60 bg-slate-50/30" : ""}`}>
                        {/* Product Picker or Free Text */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            {products.length > 0 && (
                              <select
                                value={item.productId || ""}
                                onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none"
                              >
                                <option value="">-- Katalogdan Seç (Opsiyonel) --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({formatCurrency(p.sellingPrice, currency)})
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              required
                              placeholder="Ürün / Hizmet açıklaması..."
                              value={item.productName}
                              onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 font-semibold focus:border-blue-500 focus:outline-none"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isOptional}
                                  onChange={(e) => handleItemChange(idx, "isOptional", e.target.checked)}
                                  className="rounded text-blue-600 focus:ring-0"
                                />
                                <span>Opsiyonel Kalem (Toplama dahil edilmez)</span>
                              </label>
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-right text-slate-900 font-semibold focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Discount Rate */}
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountRate}
                            onChange={(e) => handleItemChange(idx, "discountRate", parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-lg border px-2 py-1 text-xs text-center font-bold focus:outline-none ${
                              item.discountRate > 20
                                ? "border-amber-400 bg-amber-50 text-amber-800"
                                : "border-slate-200 bg-white text-slate-900"
                            }`}
                          />
                        </td>

                        {/* Tax Rate */}
                        <td className="py-2.5 px-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(idx, "taxRate", parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-center text-slate-900 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="0">%0</option>
                            <option value="1">%1</option>
                            <option value="10">%10</option>
                            <option value="20">%20</option>
                          </select>
                        </td>

                        {/* Total Price */}
                        <td className="py-2.5 px-2 text-right whitespace-nowrap font-bold text-slate-900">
                          {formatCurrency(total, currency)}
                        </td>

                        {/* Remove */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="rounded-md p-1 text-slate-300 hover:text-rose-600 disabled:opacity-30 transition"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: General Discount & Approval warning */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
                <h4 className="font-bold text-xs text-slate-700">Genel Teklif İskontosu</h4>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-xl bg-slate-200 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDiscountType("Percentage")}
                      className={`px-3 py-1 rounded-lg transition ${
                        discountType === "Percentage" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Oran (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("Amount")}
                      className={`px-3 py-1 rounded-lg transition ${
                        discountType === "Amount" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Tutar ({currency})
                    </button>
                  </div>

                  {discountType === "Percentage" ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      value={discountRate || ""}
                      onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      placeholder="Tutar"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {calculations.requiresApproval && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-none mt-0.5" />
                  <div className="text-xs">
                    <h5 className="font-bold text-amber-900">Yönetici Onayı Gerekli</h5>
                    <p className="text-amber-700 mt-0.5">
                      Uygulanan iskonto oranı (%15 üzeri) yetki eşiğini aştığı için bu teklif oluşturulduğunda otomatik olarak <b>Yönetici Onayı Bekliyor</b> durumuna alınacaktır.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Calculated Totals Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(calculations.subtotal, currency)}
                </span>
              </div>

              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-medium">
                  <span>Toplam İndirim & İskonto:</span>
                  <span className="font-bold">
                    -{formatCurrency(calculations.totalDiscount, currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>Hesaplanan KDV:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(calculations.totalTax, currency)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Genel Toplam:</span>
                <span className="font-extrabold text-xl text-blue-600">
                  {formatCurrency(calculations.grandTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Terms, Delivery, Bank Details Templates */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>3. Şartlar, Koşullar & Banka Bilgileri</span>
              </h3>

              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Şablon Seç:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 font-semibold focus:outline-none"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Ödeme & Fatura Şartları
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: %50 siparişte peşin, %50 teslimatta 30 gün vadeli."
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Teslimat & Sevkiyat Şartları
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: Sipariş onayından itibaren 10 iş günü içerisinde adrese teslim."
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Banka Hesap & IBAN Bilgileri
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: Garanti BBVA TR12 0006 2000... (ABC Ltd Şti)"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Genel Şartlar & Garanti Koşulları
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: Ürünler 2 yıl resmi garantilidir. Fiyatlarımıza KDV dahildir."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition"
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
  const [activeTab, setActiveTab] = useState<"items" | "terms" | "revisions" | "activities">("items");

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
    if (!activeTenant?.id) return;
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
    if (!activeTenant?.id || !quote) return;
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
    if (!activeTenant?.id || !quote) return;
    setIsActionLoading(true);
    try {
      const res = await ApiClient.convertQuoteToOrder(quote.id, activeTenant.id);
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
    if (!activeTenant?.id || !quote) return;
    setIsActionLoading(true);
    try {
      const res = await ApiClient.approveQuote(
        quote.id,
        { isApproved, approvalNotes: approvalNotes.trim() },
        activeTenant.id
      );
      if (res.success) {
        toast.success(isApproved ? "Teklif onaylandı" : "Teklif onayı reddedildi");
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
    if (!activeTenant?.id || !quote) return;
    setIsActionLoading(true);
    try {
      const res = await ApiClient.createQuoteRevision(
        quote.id,
        { revisionNotes: revisionNotes.trim() },
        activeTenant.id
      );
      if (res.success && res.data) {
        toast.success(`Yeni revizyon (R${quote.revisionNumber + 1}) oluşturuldu`);
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
    if (!activeTenant?.id || !quote) return;
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Teklifi Sil"
        description={`"${quote?.quoteNumber} - ${quote?.title || "Bu teklif"}" kaydı kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <div className="w-full max-w-3xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-sm text-slate-900">
                  {quote?.quoteNumber || "TEK-..."}
                </span>
                <span className="rounded-md bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
                  R{quote?.revisionNumber ?? 0}
                </span>
                {quote && <QuoteStatusBadge status={quote.status} />}
              </div>
              <h2 className="font-bold text-base text-slate-900 leading-tight mt-0.5 truncate max-w-md">
                {quote?.title || "Teklif Detayı"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => quote && onPrint(quote.id)}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Yazdır / PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Yazdır</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!quote) return;
                const publicUrl = `${window.location.origin}/quotes/view/${quote.publicViewToken}`;
                navigator.clipboard.writeText(publicUrl);
                toast.success("Müşteri dijital onay linki kopyalandı");
              }}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition shadow-2xs"
              title="Müşteri Linkini Kopyala"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Link</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Teklifi Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isLoading || !quote ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-xs font-medium">Detaylar yükleniyor...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* 1. Action Alert / Banner based on status */}
            {quote.status === "PendingApproval" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Yönetici İskonto / Limit Onayı Bekliyor
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Bu teklif iskonto eşiğini aştığı için yönetici onayı gerektirir.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsApproveOpen(true)}
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                >
                  Onayla / Değerlendir
                </button>
              </div>
            )}

            {quote.status === "Accepted" && quote.convertedOrderId && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      Teklif Kabul Edildi & Siparişe Dönüştü
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Sipariş No: <b>{quote.convertedOrderNumber || "Aktif Sipariş"}</b>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/${activeTenant?.slug}/orders`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300/60 px-3 py-1.5 rounded-xl transition"
                >
                  <span>Siparişe Git</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* 2. Primary CTA Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              {quote.status !== "Accepted" && quote.status !== "ConvertedToOrder" && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleConvertToOrder}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  <Check className="h-4 w-4" />
                  <span>Kabul Et & Siparişe Dönüştür</span>
                </button>
              )}

              {(quote.status === "Draft" || quote.status === "Approved") && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleSend}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Müşteriye Gönder</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsRevisionOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <History className="h-3.5 w-3.5 text-slate-500" />
                <span>Yeni Revizyon (R{quote.revisionNumber + 1})</span>
              </button>
            </div>

            {/* 3. Core Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Müşteri</span>
                <p className="font-bold text-slate-900 text-xs mt-0.5 truncate">{quote.customerName}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Genel Toplam</span>
                <p className="font-extrabold text-blue-600 text-sm mt-0.5">
                  {formatCurrency(quote.totalAmount, quote.currency)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">İskonto</span>
                <p className="font-bold text-rose-600 text-xs mt-0.5">
                  %{quote.discountRate} ({formatCurrency(quote.discountAmount, quote.currency)})
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Geçerlilik</span>
                <p className="font-bold text-slate-700 text-xs mt-0.5">
                  {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("tr-TR") : "Süresiz"}
                </p>
              </div>
            </div>

            {/* 4. Tab Navigation */}
            <div className="flex border-b border-slate-200">
              {[
                { key: "items", label: `Kalemler (${quote.items.length})` },
                { key: "terms", label: "Şartlar & Banka" },
                { key: "revisions", label: `Revizyonlar (${quote.revisions.length})` },
                { key: "activities", label: `Aktivite Günlüğü (${quote.activities.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 5. Tab Contents */}
            {activeTab === "items" && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Ürün / Hizmet</th>
                        <th className="py-2.5 px-2 text-center">Miktar</th>
                        <th className="py-2.5 px-2 text-right">Birim Fiyat</th>
                        <th className="py-2.5 px-2 text-center">İskonto</th>
                        <th className="py-2.5 px-2 text-center">KDV</th>
                        <th className="py-2.5 px-3 text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {quote.items.map((item) => (
                        <tr key={item.id} className={item.isOptional ? "bg-slate-50/50 opacity-75" : ""}>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{item.productName}</span>
                            {item.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>}
                            {item.isOptional && (
                              <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold ml-1">
                                Opsiyonel
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium">
                            {formatCurrency(item.unitPrice, quote.currency)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-rose-600 font-bold">
                            {item.discountRate > 0 ? `%${item.discountRate}` : "-"}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500">
                            %{item.taxRate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                            {formatCurrency(item.totalPrice, quote.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals Box */}
                <div className="flex justify-end">
                  <div className="w-72 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Ara Toplam:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(quote.subtotal, quote.currency)}</span>
                    </div>
                    {quote.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>İskonto:</span>
                        <span className="font-bold">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>KDV Tutarı:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">Genel Toplam:</span>
                      <span className="font-extrabold text-base text-blue-600">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "terms" && (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-slate-900">Ödeme Şartları</h4>
                  <p className="text-slate-600 whitespace-pre-line">{quote.paymentTerms || "Belirtilmedi"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-slate-900">Teslimat & Sevkiyat Koşulları</h4>
                  <p className="text-slate-600 whitespace-pre-line">{quote.deliveryTerms || "Belirtilmedi"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-slate-900">Banka Hesap & IBAN Bilgileri</h4>
                  <p className="text-slate-600 font-mono whitespace-pre-line">{quote.bankDetails || "Belirtilmedi"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
                  <h4 className="font-bold text-slate-900">Genel Hükümler & Garanti</h4>
                  <p className="text-slate-600 whitespace-pre-line">{quote.termsAndConditions || "Belirtilmedi"}</p>
                </div>
              </div>
            )}

            {activeTab === "revisions" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 mb-2">
                  Bu teklife ait tüm pazarlık ve revizyon tarihçesi:
                </div>
                {quote.revisions.map((rev) => {
                  const isCurrent = rev.id === quote.id;
                  return (
                    <div
                      key={rev.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                        isCurrent
                          ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-blue-600 text-white px-2 py-0.5 font-mono font-bold text-xs">
                          R{rev.revisionNumber}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{rev.quoteNumber}</span>
                          <span className="text-[11px] text-slate-400 block">
                            {new Date(rev.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-xs">
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
                  <div key={act.id} className="flex gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 flex-none mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{act.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{act.description}</p>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Yönetici Teklif Değerlendirmesi</h3>
            <p className="text-xs text-slate-500">
              Teklifi onaylayarak müşteriye gönderilmeye hazır hale getirebilir veya açıklama ekleyerek revizyon isteyebilirsiniz.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Değerlendirme Notu
              </label>
              <textarea
                rows={3}
                placeholder="Örn: %18 iskonto onaylandı veya %10 seviyesine çekilmesini rica ederim."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => handleApprove(false)}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
              >
                Reddet / Revizyon İste
              </button>

              <button
                type="button"
                onClick={() => handleApprove(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Revision Modal */}
      {isRevisionOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Yeni Revizyon Oluştur (R{quote?.revisionNumber ? quote.revisionNumber + 1 : 1})
            </h3>
            <p className="text-xs text-slate-500">
              Mevcut teklif kilitlenecek ve tüm kalemleriyle birlikte yeni bir versiyon oluşturulacaktır.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Revizyon Gerekçesi / Notu
              </label>
              <textarea
                rows={3}
                placeholder="Örn: Müşteri %5 ek iskonto talep etti, 3. kalem çıkarıldı."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRevisionOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleCreateRevision}
                disabled={isActionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
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
    if (!activeTenant?.id) return;
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
    if (!activeTenant?.id || !name.trim()) return;

    try {
      if (editingId) {
        await ApiClient.updateQuoteTemplate(
          editingId,
          { name, termsAndConditions, paymentTerms, deliveryTerms, bankDetails, isDefault },
          activeTenant.id
        );
        toast.success("Şablon güncellendi");
      } else {
        await ApiClient.createQuoteTemplate(
          { name, termsAndConditions, paymentTerms, deliveryTerms, bankDetails, isDefault },
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
    if (!activeTenant?.id) return;
    try {
      await ApiClient.deleteQuoteTemplate(id, activeTenant.id);
      toast.success("Şablon silindi");
      fetchTemplates();
    } catch {
      toast.error("Silinemedi");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Teklif Şart & Banka Şablonları</h3>
              <p className="text-slate-500 text-xs">Tekliflerde tek tıkla kullanılan hazır şartnameler</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Existing Templates list */}
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">{t.name}</span>
                {t.isDefault && (
                  <span className="rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-[9px] font-bold">
                    Varsayılan
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEdit(t)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Form */}
        <form onSubmit={handleSave} className="space-y-3 pt-3 border-t border-slate-200">
          <h4 className="font-bold text-xs text-slate-800">
            {editingId ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}
          </h4>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Şablon Adı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Standart Kurumsal Lisans Şartnamesi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ödeme Şartları</label>
              <textarea
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Teslimat Koşulları</label>
              <textarea
                rows={2}
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Banka & IBAN Bilgileri</label>
            <textarea
              rows={2}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>Varsayılan şablon olarak kullan</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
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
// QUOTE PRINT MODAL
// ============================================================================
function QuotePrintModal({
  quoteId,
  onClose,
}: {
  quoteId: string;
  onClose: () => void;
}) {
  const { activeTenant } = usePermissions();
  const [quote, setQuote] = useState<QuoteDetailDto | null>(null);

  useEffect(() => {
    if (!activeTenant?.id) return;
    ApiClient.getQuoteById(quoteId, activeTenant.id).then((res) => {
      if (res.success && res.data) setQuote(res.data);
    });
  }, [activeTenant?.id, quoteId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none print:p-0">
        {/* Top bar (Hidden when printed) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-sm text-slate-800">Teklif Baskı Önizlemesi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Proposal Document */}
        {quote && (
          <div className="space-y-6 text-slate-800 font-sans">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 className="font-extrabold text-2xl text-blue-700 tracking-tight">
                  {activeTenant?.name || "CRM ŞİRKETİ"}
                </h1>
                <p className="text-xs text-slate-500 mt-1">Resmi Satış & Hizmet Teklifi</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-extrabold text-lg text-slate-900 block">
                  {quote.quoteNumber} (R{quote.revisionNumber})
                </span>
                <span className="text-xs text-slate-500 block">
                  Tarih: {new Date(quote.createdAt).toLocaleDateString("tr-TR")}
                </span>
                <span className="text-xs text-slate-500 block">
                  Geçerlilik: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("tr-TR") : "Süresiz"}
                </span>
              </div>
            </div>

            {/* Client & Company Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  MÜŞTERİ / ALICI:
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 mt-1">{quote.customerName}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{quote.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TEKLİFİ HAZIRLAYAN:
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">{quote.assignedUserName || "Satış Departmanı"}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{activeTenant?.name}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Sıra</th>
                  <th className="py-2.5 px-3">Ürün / Hizmet Tanımı</th>
                  <th className="py-2.5 px-2 text-center">Miktar</th>
                  <th className="py-2.5 px-2 text-right">Birim Fiyat</th>
                  <th className="py-2.5 px-2 text-center">İskonto</th>
                  <th className="py-2.5 px-2 text-center">KDV</th>
                  <th className="py-2.5 px-3 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quote.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold">{item.productName}</td>
                    <td className="py-2.5 px-2 text-center">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 px-2 text-right">{formatCurrency(item.unitPrice, quote.currency)}</td>
                    <td className="py-2.5 px-2 text-center">{item.discountRate > 0 ? `%${item.discountRate}` : "-"}</td>
                    <td className="py-2.5 px-2 text-center">%{item.taxRate}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(item.totalPrice, quote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatCurrency(quote.subtotal, quote.currency)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Toplam İskonto:</span>
                    <span className="font-semibold">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>KDV Tutarı:</span>
                  <span className="font-semibold">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>GENEL TOPLAM:</span>
                  <span className="text-blue-700">{formatCurrency(quote.totalAmount, quote.currency)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="pt-4 border-t border-slate-200 text-xs space-y-3">
              {quote.paymentTerms && (
                <p><b>Ödeme Koşulları:</b> {quote.paymentTerms}</p>
              )}
              {quote.deliveryTerms && (
                <p><b>Teslimat Şartları:</b> {quote.deliveryTerms}</p>
              )}
              {quote.bankDetails && (
                <p className="font-mono"><b>Banka Bilgileri:</b> {quote.bankDetails}</p>
              )}
            </div>

            {/* Stamp / Signature Lines */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div>
                <p className="font-bold text-slate-700">Teklifi Veren Firma Kaşe / İmza</p>
                <div className="h-16 mt-2 border-b border-slate-300 border-dashed"></div>
              </div>
              <div>
                <p className="font-bold text-slate-700">Teklifi Onaylayan Müşteri Kaşe / İmza</p>
                <div className="h-16 mt-2 border-b border-slate-300 border-dashed"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
