"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Repeat2,
  Search,
  ShieldCheck,
  Trash2,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type WebhookDeliveryDto,
  type WebhookEndpointDto,
} from "@/lib/api-client";

const WEBHOOK_EVENTS: string[] = [
  "Order.Created",
  "Order.StatusChanged",
  "Quote.Accepted",
  "Quote.Sent",
  "Ticket.Created",
  "Ticket.SlaBreached",
  "Deal.StageChanged",
  "Webhook.Inbound",
];

const PAGE_SIZE = 20;

function truncateUrl(url: string, maxLength = 38): string {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength)}…`;
}

function formatDateTr(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "-";
  }
  return `${d.toLocaleDateString("tr-TR")} ${d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getDeliveryStatusBadge(status: string) {
  if (status === "Success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        Success
      </span>
    );
  }
  if (status === "Failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
        <XCircle className="h-3 w-3 text-rose-600" />
        Failed
      </span>
    );
  }
  if (status === "Retrying") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="h-3 w-3 text-amber-600" />
        Retrying
      </span>
    );
  }
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
      {status}
    </span>
  );
}

function getEventBadge(event: string) {
  return (
    <span
      className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
      key={event}
    >
      {event}
    </span>
  );
}

function payloadPreview(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return "-";
  }
  if (typeof payload === "string") {
    return payload.length > 80 ? `${payload.slice(0, 80)}…` : payload;
  }
  try {
    const s = JSON.stringify(payload);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return String(payload).slice(0, 80);
  }
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function WebhooksPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";

  const [activeTab, setActiveTab] = useState<"endpoints" | "deliveries">(
    "endpoints"
  );

  // Endpoints state
  const [endpoints, setEndpoints] = useState<WebhookEndpointDto[]>([]);
  const [endpointsTotal, setEndpointsTotal] = useState<number>(0);
  const [endpointPage, setEndpointPage] = useState<number>(1);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState<boolean>(true);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce<string>(search, 400);
  const [eventFilter, setEventFilter] = useState<string>("");
  const [isActiveFilter, setIsActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Deliveries state
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[]>([]);
  const [deliveriesTotal, setDeliveriesTotal] = useState<number>(0);
  const [deliveriesPage, setDeliveriesPage] = useState<number>(1);
  const [isLoadingDeliveries, setIsLoadingDeliveries] =
    useState<boolean>(false);
  const [deliveryEndpointFilter, setDeliveryEndpointFilter] =
    useState<string>("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("");
  const [deliveryEventFilter, setDeliveryEventFilter] = useState<string>("");

  // Actions state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<WebhookDeliveryDto | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [kpiActiveTotal, setKpiActiveTotal] = useState<number>(0);

  // Reset pagination when filters change
  useEffect(() => {
    setEndpointPage(1);
  }, [debouncedSearch, eventFilter, isActiveFilter]);

  useEffect(() => {
    setDeliveriesPage(1);
  }, [deliveryEndpointFilter, deliveryStatusFilter, deliveryEventFilter]);

  const loadEndpoints = useCallback(async (): Promise<void> => {
    if (!tenantSlug) {
      return;
    }
    setIsLoadingEndpoints(true);
    setEndpointsError(null);
    try {
      const res = await ApiClient.getWebhookEndpoints(
        {
          event: eventFilter || undefined,
          isActive:
            isActiveFilter === "all" ? undefined : isActiveFilter === "active",
          page: endpointPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setEndpoints(res.data.items || []);
        setEndpointsTotal(res.data.totalCount ?? 0);
      } else {
        setEndpointsError(res.message || "Endpoint listesi alınamadı.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
      setEndpointsError(message);
      toast.error("Webhook endpointleri yüklenirken hata oluştu.");
    } finally {
      setIsLoadingEndpoints(false);
    }
  }, [tenantSlug, debouncedSearch, eventFilter, isActiveFilter, endpointPage]);

  const loadDeliveries = useCallback(async (): Promise<void> => {
    if (!tenantSlug) {
      return;
    }
    setIsLoadingDeliveries(true);
    try {
      const res = await ApiClient.getWebhookDeliveries(
        {
          endpointId: deliveryEndpointFilter || undefined,
          eventType: deliveryEventFilter || undefined,
          page: deliveriesPage,
          pageSize: PAGE_SIZE,
          status: deliveryStatusFilter || undefined,
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setDeliveries(res.data.items || []);
        setDeliveriesTotal(res.data.totalCount ?? 0);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Teslimatlar yüklenemedi.";
      toast.error(message);
    } finally {
      setIsLoadingDeliveries(false);
    }
  }, [
    tenantSlug,
    deliveryEndpointFilter,
    deliveryStatusFilter,
    deliveryEventFilter,
    deliveriesPage,
  ]);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const loadKpiActive = useCallback(async (): Promise<void> => {
    if (!tenantSlug) {
      return;
    }
    try {
      const res = await ApiClient.getWebhookEndpoints(
        { isActive: true, pageSize: 1 },
        tenantSlug
      );
      if (res.success && res.data) {
        setKpiActiveTotal(res.data.totalCount ?? 0);
      }
    } catch {
      // silent KPI failure
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadKpiActive();
  }, [loadKpiActive]);

  // KPI derivations
  const totalEndpointsDisplay = endpointsTotal;
  const displayActiveCount = kpiActiveTotal;
  const successDeliveries = deliveries.filter(
    (d) => d.status === "Success"
  ).length;
  const failedDeliveries = deliveries.filter(
    (d) => d.status === "Failed"
  ).length;
  const successRate =
    deliveries.length > 0
      ? Math.round((successDeliveries / deliveries.length) * 100)
      : deliveriesTotal > 0 && successDeliveries === 0
        ? 0
        : 0;
  // When deliveries paginated, successRate based on current page; also compute from total if available and empty page fallback
  const displaySuccessRate = deliveries.length > 0 ? successRate : 0;

  const handleToggle = async (
    ep: WebhookEndpointDto,
    e: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = !ep.isActive;
    // optimistic
    setEndpoints((prev) =>
      prev.map((item) =>
        item.id === ep.id ? { ...item, isActive: newStatus } : item
      )
    );
    try {
      const res = await ApiClient.toggleWebhookEndpoint(
        ep.id,
        newStatus,
        tenantSlug
      );
      if (res.success) {
        toast.success(
          newStatus ? "Endpoint aktifleştirildi." : "Endpoint pasife alındı."
        );
        // refresh KPI active count
        await loadKpiActive();
      } else {
        // rollback
        setEndpoints((prev) =>
          prev.map((item) =>
            item.id === ep.id ? { ...item, isActive: ep.isActive } : item
          )
        );
        toast.error(res.message || "Durum güncellenemedi.");
      }
    } catch (error: unknown) {
      setEndpoints((prev) =>
        prev.map((item) =>
          item.id === ep.id ? { ...item, isActive: ep.isActive } : item
        )
      );
      const message =
        error instanceof Error ? error.message : "Bağlantı hatası.";
      toast.error(message);
    }
  };

  const handleDelete = async (
    id: string,
    name: string,
    e: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `"${name}" webhook endpointini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );
    if (!confirmed) {
      return;
    }
    try {
      const res = await ApiClient.deleteWebhookEndpoint(id, tenantSlug);
      if (res.success) {
        toast.success("Endpoint silindi.");
        setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
        setEndpointsTotal((prev) => Math.max(0, prev - 1));
        await loadKpiActive();
      } else {
        toast.error(res.message || "Silme işlemi başarısız.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Silme sırasında hata oluştu.";
      toast.error(message);
    }
  };

  const handleCopyUrl = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("URL panoya kopyalandı.");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Kopyalama başarısız.");
    }
  };

  const handleTestSend = async (ep: WebhookEndpointDto): Promise<void> => {
    setTestingId(ep.id);
    try {
      const res = await ApiClient.testWebhookEndpoint(
        ep.id,
        {
          isSimulation: true,
          mockEventType: ep.events[0] || "Order.Created",
          mockPayload: {
            event: ep.events[0] || "Order.Created",
            test: true,
            timestamp: new Date().toISOString(),
          },
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setTestResult(res.data);
        const sig = res.data.hmacSignature
          ? ` • Sig: ${res.data.hmacSignature.slice(0, 16)}…`
          : "";
        toast.success(
          `Test gönderildi — ${res.data.status} (${res.data.responseCode ?? "-"} )${sig}`
        );
        await loadDeliveries();
      } else {
        toast.error(res.message || "Test gönderimi başarısız.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Test sırasında hata oluştu.";
      toast.error(message);
    } finally {
      setTestingId(null);
    }
  };

  const handleRetry = async (delivery: WebhookDeliveryDto): Promise<void> => {
    setRetryingId(delivery.id);
    try {
      const res = await ApiClient.retryWebhookDelivery(delivery.id, tenantSlug);
      if (res.success && res.data) {
        toast.success("Yeniden deneme tetiklendi.");
        setDeliveries((prev) =>
          prev.map((d) => (d.id === delivery.id && res.data ? res.data : d))
        );
        await loadDeliveries();
      } else {
        toast.error(res.message || "Yeniden deneme başarısız.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Yeniden deneme sırasında hata oluştu.";
      toast.error(message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleCopySignature = async (sig: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sig);
      toast.success("İmza kopyalandı.");
    } catch {
      toast.error("Kopyalama başarısız.");
    }
  };

  const endpointsTotalPages = Math.max(
    1,
    Math.ceil(endpointsTotal / PAGE_SIZE)
  );
  const deliveriesTotalPages = Math.max(
    1,
    Math.ceil(deliveriesTotal / PAGE_SIZE)
  );

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-zinc-200 border-b pb-6 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
                Webhook & Entegrasyonlar
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  HMAC-SHA256
                </span>
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Tenant bazlı endpoint yönetimi, olay seçimi, HMAC imzalama ve
                teslimat günlüğü.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-sm text-white shadow-sm transition-all duration-150 hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            href={`/${tenantSlug}/webhooks/new`}
          >
            <Link2 className="h-4 w-4" />
            <span>Yeni Endpoint</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards - Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-sm transition-all duration-150 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="mb-2 flex items-center justify-between font-medium text-[11px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
            <span>Aktif Endpoint</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {displayActiveCount}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              / {totalEndpointsDisplay} toplam
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            <span>Aktif / pasif ayrımı tenant izolasyonlu</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-sm transition-all duration-150 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="mb-2 flex items-center justify-between font-medium text-[11px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
            <span>Toplam Teslimat</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              <Link2 className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {deliveriesTotal}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              deneme
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {failedDeliveries > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                {failedDeliveries} başarısız •{" "}
              </span>
            ) : null}
            <span>Sayfadaki {deliveries.length} kayıt üzerinden</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-sm transition-all duration-150 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="mb-2 flex items-center justify-between font-medium text-[11px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
            <span>Başarı Oranı</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              %{displaySuccessRate}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              success / total
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span
              className={
                displaySuccessRate >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : displaySuccessRate >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              }
            >
              {displaySuccessRate >= 90
                ? "Yüksek güvenilirlik"
                : displaySuccessRate >= 70
                  ? "İzleme önerilir"
                  : "Müdahale gerekiyor"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-xs backdrop-blur-sm md:flex-row md:items-center md:justify-between dark:border-zinc-800/90 dark:bg-zinc-900/90">
        <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
          <button
            className={`rounded-lg px-3.5 py-1.5 font-medium text-sm transition-all duration-150 ${
              activeTab === "endpoints"
                ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
            onClick={() => setActiveTab("endpoints")}
            type="button"
          >
            Endpointler ({endpointsTotal})
          </button>
          <button
            className={`rounded-lg px-3.5 py-1.5 font-medium text-sm transition-all duration-150 ${
              activeTab === "deliveries"
                ? "bg-white font-semibold text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
            onClick={() => setActiveTab("deliveries")}
            type="button"
          >
            Teslimatlar ({deliveriesTotal})
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="hidden sm:inline">Tenant:</span>
          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            {tenantSlug || "-"}
          </span>
          <button
            className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onClick={() => {
              if (activeTab === "endpoints") {
                loadEndpoints();
              } else {
                loadDeliveries();
              }
            }}
            title="Yenile"
            type="button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoadingEndpoints || isLoadingDeliveries ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Endpoints Tab */}
      {activeTab === "endpoints" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-xs backdrop-blur-sm md:flex-row md:items-center md:justify-between dark:border-zinc-800/90 dark:bg-zinc-900/90">
            <div className="flex flex-1 flex-col gap-2.5 md:flex-row md:items-center">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2 pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="İsim veya URL ara..."
                  type="text"
                  value={search}
                />
              </div>

              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                onChange={(e) => setEventFilter(e.target.value)}
                value={eventFilter}
              >
                <option value="">Tüm Olaylar</option>
                {WEBHOOK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                onChange={(e) =>
                  setIsActiveFilter(
                    e.target.value as "all" | "active" | "inactive"
                  )
                }
                value={isActiveFilter}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Sadece Aktif</option>
                <option value="inactive">Sadece Pasif</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="hidden sm:inline">
                Sayfa {endpointPage} / {endpointsTotalPages} • Toplam{" "}
                {endpointsTotal}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  disabled={endpointPage <= 1 || isLoadingEndpoints}
                  onClick={() => setEndpointPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Önceki
                </button>
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  disabled={
                    endpointPage >= endpointsTotalPages || isLoadingEndpoints
                  }
                  onClick={() =>
                    setEndpointPage((p) => Math.min(endpointsTotalPages, p + 1))
                  }
                  type="button"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-xs backdrop-blur-sm dark:border-zinc-800/90 dark:bg-zinc-900/90">
            {isLoadingEndpoints ? (
              <div className="flex h-48 items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-900 dark:text-zinc-100" />
                <span>Endpointler yükleniyor...</span>
              </div>
            ) : endpointsError ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="mt-3 font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  Yükleme hatası
                </p>
                <p className="mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
                  {endpointsError}
                </p>
                <button
                  className="mt-4 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  onClick={loadEndpoints}
                  type="button"
                >
                  Yeniden Dene
                </button>
              </div>
            ) : endpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  <Webhook className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Henüz endpoint yok
                </h3>
                <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                  İlk webhook endpointinizi oluşturun. Olayları seçin, URL
                  girin, HMAC imzasıyla güvenli teslimatlar alın.
                </p>
                <Link
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-sm text-white shadow-sm transition-all duration-150 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                  href={`/${tenantSlug}/webhooks/new`}
                >
                  <Link2 className="h-4 w-4" />
                  Endpoint Oluştur
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Webhook endpoint listesi — isim, URL, olaylar, durum ve
                    aksiyonlar
                  </caption>
                  <thead className="border-zinc-200 border-b bg-zinc-50/70 font-medium text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">İsim</th>
                      <th className="px-4 py-3 font-semibold">URL</th>
                      <th className="px-4 py-3 font-semibold">Olaylar</th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Durum
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Aksiyonlar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {endpoints.map((ep) => (
                      <tr
                        className="transition-colors duration-150 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                        key={ep.id}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {ep.name}
                          </div>
                          {ep.description ? (
                            <div className="line-clamp-1 max-w-[260px] text-xs text-zinc-500 dark:text-zinc-400">
                              {ep.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              className="max-w-[260px] truncate font-mono text-xs text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                              href={ep.url}
                              rel="noopener"
                              target="_blank"
                              title={ep.url}
                            >
                              {truncateUrl(ep.url)}
                            </a>
                            <button
                              className="rounded p-1 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              onClick={() => handleCopyUrl(ep.url)}
                              title="URL kopyala"
                              type="button"
                            >
                              {copiedUrl === ep.url ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <a
                              className="rounded p-1 text-zinc-400 transition-colors duration-150 hover:text-zinc-700 dark:hover:text-zinc-200"
                              href={ep.url}
                              rel="noopener"
                              target="_blank"
                              title="Linki aç"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[280px] flex-wrap gap-1">
                            {ep.events.length === 0 ? (
                              <span className="text-xs text-zinc-400">—</span>
                            ) : (
                              ep.events.map((ev) => getEventBadge(ev))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            aria-label={
                              ep.isActive ? "Pasife al" : "Aktifleştir"
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                              ep.isActive
                                ? "bg-emerald-500"
                                : "bg-zinc-300 dark:bg-zinc-700"
                            }`}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                              handleToggle(ep, e)
                            }
                            type="button"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-150 ease-in-out ${
                                ep.isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-xs text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              disabled={testingId === ep.id}
                              onClick={() => handleTestSend(ep)}
                              title="Test gönder"
                              type="button"
                            >
                              {testingId === ep.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              <span>Test</span>
                            </button>
                            <Link
                              className="inline-flex rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                              href={`/${tenantSlug}/webhooks/${ep.id}`}
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                              onClick={(
                                e: React.MouseEvent<HTMLButtonElement>
                              ) => handleDelete(ep.id, ep.name, e)}
                              title="Sil"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination footer copy for mobile */}
          {!isLoadingEndpoints && endpoints.length > 0 && (
            <div className="flex items-center justify-between text-xs text-zinc-500 md:hidden dark:text-zinc-400">
              <span>
                Toplam {endpointsTotal} • Sayfa {endpointPage} /{" "}
                {endpointsTotalPages}
              </span>
              <span className="font-mono text-[11px]">
                pageSize {PAGE_SIZE}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Deliveries Tab */}
      {activeTab === "deliveries" && (
        <div className="space-y-4">
          {/* Deliveries Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-xs backdrop-blur-sm md:flex-row md:items-center md:justify-between dark:border-zinc-800/90 dark:bg-zinc-900/90">
            <div className="flex flex-1 flex-col gap-2.5 md:flex-row md:items-center">
              <select
                className="min-w-[180px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                onChange={(e) => setDeliveryEndpointFilter(e.target.value)}
                value={deliveryEndpointFilter}
              >
                <option value="">Tüm Endpointler</option>
                {endpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                value={deliveryStatusFilter}
              >
                <option value="">Tüm Durumlar</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Retrying">Retrying</option>
              </select>

              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                onChange={(e) => setDeliveryEventFilter(e.target.value)}
                value={deliveryEventFilter}
              >
                <option value="">Tüm Olay Tipleri</option>
                {WEBHOOK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="hidden sm:inline">
                Sayfa {deliveriesPage} / {deliveriesTotalPages} • Toplam{" "}
                {deliveriesTotal}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  disabled={deliveriesPage <= 1 || isLoadingDeliveries}
                  onClick={() => setDeliveriesPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Önceki
                </button>
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  disabled={
                    deliveriesPage >= deliveriesTotalPages ||
                    isLoadingDeliveries
                  }
                  onClick={() =>
                    setDeliveriesPage((p) =>
                      Math.min(deliveriesTotalPages, p + 1)
                    )
                  }
                  type="button"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-xs backdrop-blur-sm dark:border-zinc-800/90 dark:bg-zinc-900/90">
            {isLoadingDeliveries ? (
              <div className="flex h-48 items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-900 dark:text-zinc-100" />
                <span>Teslimatlar yükleniyor...</span>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Teslimat kaydı yok
                </h3>
                <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                  Seçili filtrelerle eşleşen teslimat bulunamadı. Endpoint
                  oluşturup bir test gönderimi deneyin veya filtreleri
                  temizleyin.
                </p>
                <button
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  onClick={() => {
                    setDeliveryEndpointFilter("");
                    setDeliveryStatusFilter("");
                    setDeliveryEventFilter("");
                  }}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Webhook teslimat günlüğü — endpoint, olay, durum, deneme
                    sayısı ve yanıt
                  </caption>
                  <thead className="border-zinc-200 border-b bg-zinc-50/70 font-medium text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-3 font-semibold">Endpoint</th>
                      <th className="px-3 py-3 font-semibold">Olay</th>
                      <th className="px-3 py-3 font-semibold">Payload</th>
                      <th className="px-3 py-3 font-semibold">Durum</th>
                      <th className="px-3 py-3 text-center font-semibold">
                        Deneme
                      </th>
                      <th className="px-3 py-3 text-center font-semibold">
                        Kod
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">
                        Süre
                      </th>
                      <th className="px-3 py-3 font-semibold">Tarih</th>
                      <th className="px-3 py-3 font-semibold">
                        Sonraki Deneme
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">
                        Aksiyon
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {deliveries.map((d) => (
                      <tr
                        className="transition-colors duration-150 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                        key={d.id}
                      >
                        <td className="px-3 py-3">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {d.endpointName || d.endpointId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                            {d.eventType}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-3 py-3">
                          <span
                            className="block truncate font-mono text-xs text-zinc-600 dark:text-zinc-400"
                            title={
                              typeof d.payload === "string"
                                ? d.payload
                                : JSON.stringify(d.payload)
                            }
                          >
                            {payloadPreview(d.payload)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {getDeliveryStatusBadge(d.status)}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {d.attemptCount}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {d.responseCode === null ||
                          d.responseCode === undefined ? (
                            <span className="text-xs text-zinc-400">—</span>
                          ) : (
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                                d.responseCode >= 200 && d.responseCode < 300
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              }`}
                            >
                              {d.responseCode}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {d.durationMs === null || d.durationMs === undefined
                            ? "—"
                            : `${d.durationMs} ms`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTr(d.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTr(d.nextRetryAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {(d.status === "Failed" ||
                            d.status === "Retrying") && (
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-xs text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              disabled={retryingId === d.id}
                              onClick={() => handleRetry(d)}
                              type="button"
                            >
                              {retryingId === d.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Repeat2 className="h-3.5 w-3.5" />
                              )}
                              Yeniden Dene
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {testResult && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setTestResult(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-5 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Test Gönderimi Sonucu
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Dry-run • HMAC imzalı istek simüle edildi
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-full p-1.5 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {getDeliveryStatusBadge(testResult.status)}
                {testResult.responseCode && (
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    HTTP {testResult.responseCode}
                  </span>
                )}
                {testResult.durationMs !== null && (
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {testResult.durationMs} ms
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="mb-1 font-medium text-xs text-zinc-500 dark:text-zinc-400">
                  X-Webhook-Signature
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {testResult.hmacSignature || "—"}
                  </code>
                  {testResult.hmacSignature && (
                    <button
                      className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      onClick={() =>
                        handleCopySignature(testResult.hmacSignature || "")
                      }
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {testResult.headers && (
                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    X-Webhook-Timestamp:{" "}
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {testResult.headers["X-Webhook-Timestamp"] ||
                        testResult.headers["x-webhook-timestamp"] ||
                        "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Event Type
                </div>
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {testResult.eventType}
                </div>
              </div>

              {testResult.responseBody && (
                <div className="space-y-1">
                  <div className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                    Response Body
                  </div>
                  <pre className="max-h-32 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    {testResult.responseBody.slice(0, 800)}
                  </pre>
                </div>
              )}

              <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Dry-run modunda gerçek teslimat yazılmaz, sadece imza ve akış
                doğrulanır.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-2 font-medium text-sm text-white transition-colors duration-150 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                onClick={() => setTestResult(null)}
                type="button"
              >
                Kapat
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
