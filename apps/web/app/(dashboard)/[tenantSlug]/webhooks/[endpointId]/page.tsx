"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Globe,
  RefreshCw,
  Save,
  Send,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiClient, type WebhookDeliveryDto } from "@/lib/api-client";

const WEBHOOK_EVENTS: readonly string[] = [
  "Order.Created",
  "Order.StatusChanged",
  "Quote.Created",
  "Quote.Sent",
  "Quote.Accepted",
  "Quote.RevisionRequested",
  "Ticket.Created",
  "Ticket.SlaBreached",
  "Deal.StageChanged",
  "Customer.Created",
  "Webhook.Inbound",
] as const;

type TestResult = WebhookDeliveryDto | null;

function isHttpsUrl(value: string): boolean {
  if (!value.trim()) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDate(value: string): string {
  try {
    const d = new Date(value);
    return `${d.toLocaleDateString("tr-TR")} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return value;
  }
}

function getStatusBadge(status: string) {
  if (status === "Success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-[11px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        Başarılı
      </span>
    );
  }
  if (status === "Retrying") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-[11px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <RefreshCw className="h-3 w-3 text-amber-600" />
        Yeniden Deneniyor
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-[11px] text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
      <XCircle className="h-3 w-3 text-red-600" />
      Başarısız
    </span>
  );
}

export default function WebhookBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const endpointId = (params?.endpointId as string) || "";
  const isNew = endpointId === "new";

  const [isLoading, setIsLoading] = useState<boolean>(!isNew);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [name, setName] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [secretMasked, setSecretMasked] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<boolean>(false);

  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] =
    useState<boolean>(false);

  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testPayloadText, setTestPayloadText] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult>(null);

  const [hasAttemptedSave, setHasAttemptedSave] = useState<boolean>(false);

  const urlIsValid = useMemo(() => isHttpsUrl(url), [url]);
  const nameIsValid = useMemo(
    () => name.trim().length > 0 && name.trim().length <= 255,
    [name]
  );
  const eventsIsValid = useMemo(() => events.length > 0, [events]);
  const descriptionIsValid = useMemo(
    () => description.length <= 1000,
    [description]
  );
  const isFormValid =
    nameIsValid && urlIsValid && eventsIsValid && descriptionIsValid;

  const hmacExampleTimestamp = useMemo(
    () => String(Math.floor(Date.now() / 1000)),
    []
  );
  const hmacExamplePayload = useMemo(() => {
    const sample: Record<string, unknown> = {
      event: events[0] ?? "Order.Created",
      test: true,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(sample, null, 2);
  }, [events]);

  const hmacExampleSignature =
    "sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

  const loadDeliveries = useCallback(async (): Promise<void> => {
    if (isNew || !endpointId) {
      return;
    }
    setIsLoadingDeliveries(true);
    try {
      const res = await ApiClient.getWebhookDeliveries(
        { endpointId, page: 1, pageSize: 10 },
        tenantSlug
      );
      if (res.success && res.data) {
        setDeliveries(res.data.items ?? []);
      }
    } catch {
      // silently ignore deliveries load error, show empty state
    } finally {
      setIsLoadingDeliveries(false);
    }
  }, [endpointId, isNew, tenantSlug]);

  useEffect(() => {
    if (isNew) {
      setIsLoading(false);
      // default select first event to help UX, but still require explicit? keep empty for validation demonstration
      // initialize test payload
      setTestPayloadText(
        JSON.stringify({ event: WEBHOOK_EVENTS[0], test: true }, null, 2)
      );
      return;
    }
    if (!endpointId) {
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    ApiClient.getWebhookById(endpointId, tenantSlug)
      .then((res) => {
        if (!isMounted) {
          return;
        }
        if (res.success && res.data) {
          const data = res.data;
          setName(data.name ?? "");
          setUrl(data.url ?? "");
          setDescription(data.description ?? "");
          setEvents(data.events ?? []);
          setIsActive(data.isActive ?? true);
          setSecretMasked(
            data.secretMasked ??
              (data.secret ? `****${data.secret.slice(-4)}` : null)
          );
          // secret is never returned on details except masked; secretOnce stays null
          setTestPayloadText(
            JSON.stringify(
              { event: data.events?.[0] ?? "Order.Created", test: true },
              null,
              2
            )
          );
        } else {
          toast.error("Webhook bulunamadı.");
          router.push(`/${tenantSlug}/webhooks`);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error("Webhook yüklenirken hata oluştu.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [endpointId, isNew, tenantSlug, router]);

  useEffect(() => {
    if (!isNew && endpointId) {
      void loadDeliveries();
    }
  }, [isNew, endpointId, loadDeliveries]);

  const toggleEvent = (eventName: string): void => {
    setEvents((prev) =>
      prev.includes(eventName)
        ? prev.filter((e) => e !== eventName)
        : [...prev, eventName]
    );
  };

  const handleSelectAll = (): void => {
    setEvents([...WEBHOOK_EVENTS]);
  };

  const handleSelectNone = (): void => {
    setEvents([]);
  };

  const handleCopySecret = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Kopyalandı");
    } catch {
      toast.error("Kopyalama başarısız oldu.");
    }
  };

  const handleSave = async (): Promise<void> => {
    setHasAttemptedSave(true);
    if (!name.trim()) {
      toast.error("Lütfen webhook adı giriniz.");
      return;
    }
    if (!isHttpsUrl(url)) {
      toast.error("URL https:// ile başlamalıdır.");
      return;
    }
    if (events.length === 0) {
      toast.error("En az bir olay seçmelisiniz.");
      return;
    }
    if (description.length > 1000) {
      toast.error("Açıklama en fazla 1000 karakter olabilir.");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const res = await ApiClient.createWebhookEndpoint(
          {
            description: description.trim() || undefined,
            events,
            isActive,
            name: name.trim(),
            url: url.trim(),
          },
          tenantSlug
        );
        if (res.success && res.data) {
          const createdSecret: string | null =
            (res.data.secret as string | undefined) ?? null;
          if (createdSecret) {
            setSecretOnce(createdSecret);
            setSecretMasked(null);
            setShowSecret(true);
          }
          toast.success("Webhook başarıyla oluşturuldu!");
          // keep user on page to show secret once, but update deliveries if needed
          // navigate to detail id while preserving secretOnce in state via replace is not possible without losing state,
          // so we stay on current page and offer navigation to detail
          // optionally push to new id after a short delay if secret was not returned
          if (createdSecret) {
            // store id for test-send reference if user continues
            // we keep endpointId as "new" but show a banner with link
            // to keep test-send working we could push with secret in history state - but simplest: replace and keep secret via sessionStorage
            try {
              window.sessionStorage.setItem(
                `webhook-secret-${res.data.id}`,
                createdSecret
              );
            } catch {
              // ignore storage errors
            }
            // give user time to copy, then suggest navigation
            toast.info(
              "Teslimatlar için listeden oluşturulan webhook'a geçebilirsiniz.",
              {
                duration: 4000,
              }
            );
          } else {
            router.push(`/${tenantSlug}/webhooks/${res.data.id}`);
          }
        } else {
          toast.error(res.message || "Webhook oluşturulamadı.");
        }
      } else {
        const res = await ApiClient.updateWebhookEndpoint(
          endpointId,
          {
            description: description.trim() || undefined,
            events,
            isActive,
            name: name.trim(),
            url: url.trim(),
          },
          tenantSlug
        );
        if (res.success) {
          toast.success("Webhook güncellendi!");
          // refresh masked secret if returned
          if (res.data?.secretMasked) {
            setSecretMasked(res.data.secretMasked);
          }
          // refresh deliveries
          void loadDeliveries();
        } else {
          toast.error(res.message || "Güncellenemedi.");
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bir hata meydana geldi.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenTestModal = (): void => {
    if (isNew) {
      toast.info("Test gönderebilmek için önce webhook'u kaydetmelisiniz.");
      return;
    }
    const defaultPayload = JSON.stringify(
      { event: events[0] ?? "Order.Created", test: true },
      null,
      2
    );
    setTestPayloadText(defaultPayload);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleTestSend = async (): Promise<void> => {
    if (isNew) {
      toast.error("Önce webhook'u kaydedin.");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(testPayloadText) as Record<string, unknown>;
    } catch {
      toast.error("Geçersiz JSON payload.");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await ApiClient.testWebhookEndpoint(
        endpointId,
        {
          isSimulation: true,
          mockEventType: events[0] ?? "Order.Created",
          mockPayload: parsed,
          payload: parsed,
        },
        tenantSlug
      );
      if (res.success && res.data) {
        setTestResult(res.data);
        toast.success("Test gönderildi — sonuç aşağıda.");
      } else {
        toast.error(res.message || "Test gönderimi başarısız oldu.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Test hatası.";
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  // check for secret stored via sessionStorage after redirect from create
  useEffect(() => {
    if (!isNew && endpointId) {
      try {
        const stored = window.sessionStorage.getItem(
          `webhook-secret-${endpointId}`
        );
        if (stored) {
          setSecretOnce(stored);
          setShowSecret(true);
          window.sessionStorage.removeItem(`webhook-secret-${endpointId}`);
        }
      } catch {
        // ignore
      }
    }
  }, [endpointId, isNew]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="space-y-3 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100" />
          <p className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
            Webhook hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-4 border-zinc-200 border-b pb-5 md:flex-row md:items-center md:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            onClick={() => router.push(`/${tenantSlug}/webhooks`)}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                className="border-transparent border-b bg-transparent px-1 py-0.5 font-bold text-xl text-zinc-900 tracking-tight hover:border-zinc-300 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-zinc-100"
                onChange={(e) => setName(e.target.value)}
                placeholder="Webhook adı..."
                type="text"
                value={name}
              />
              <span
                className={`rounded-full px-2 py-0.5 font-semibold text-xs ${
                  isNew
                    ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    : isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {isNew ? "Yeni" : isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <input
              className="mt-0.5 w-full border-transparent border-b bg-transparent px-1 py-0.5 text-xs text-zinc-500 hover:border-zinc-200 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:text-zinc-400 dark:focus:border-zinc-100"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama ekleyin (isteğe bağlı)..."
              type="text"
              value={description}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            <span className="px-2 font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              {isActive ? "Aktif" : "Pasif"}
            </span>
            <button
              aria-label="isActive toggle"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-out ${
                isActive
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              onClick={() => setIsActive((prev: boolean) => !prev)}
              type="button"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-150 ease-out dark:bg-zinc-900 ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!isNew && (
            <button
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 font-medium text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              onClick={handleOpenTestModal}
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Test Gönder</span>
            </button>
          )}

          <button
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={isSaving || (hasAttemptedSave && !isFormValid)}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isNew ? "Webhook'u Oluştur" : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </div>

      {isNew && secretOnce && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 text-xs dark:text-amber-200">
                Gizli anahtar bir kez gösterilir, kaydedin
              </p>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                Bu secret sadece oluşturma anında gösterilir. Güvenli bir yerde
                saklayın. Sayfadan ayrılırsanız tekrar görüntülenemez.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Main Form - spans 2 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Endpoint Details */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-zinc-900 p-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Uç Nokta Bilgileri
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Temel bağlantı ve tanımlayıcı ayarlar
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block font-semibold text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="webhook-name"
                >
                  İsim <span className="text-red-600">*</span>
                </label>
                <input
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
                    hasAttemptedSave && !nameIsValid
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800"
                      : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:border-zinc-100"
                  }`}
                  id="webhook-name"
                  maxLength={255}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Sipariş webhook'u"
                  type="text"
                  value={name}
                />
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    {hasAttemptedSave && !nameIsValid && (
                      <p className="text-[11px] text-red-600 dark:text-red-400">
                        {name.trim().length === 0
                          ? "İsim zorunludur."
                          : "En fazla 255 karakter."}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {name.length}/255
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block font-semibold text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="webhook-url"
                >
                  Hedef URL <span className="text-red-600">*</span>
                </label>
                <input
                  className={`w-full rounded-xl border bg-white px-3 py-2 font-mono text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
                    hasAttemptedSave && !urlIsValid
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800"
                      : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:border-zinc-100"
                  }`}
                  id="webhook-url"
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/hook"
                  type="url"
                  value={url}
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sadece https:// şeması kabul edilir.
                </p>
                {hasAttemptedSave && !urlIsValid && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    URL https:// ile başlamalıdır.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1.5 block font-semibold text-xs text-zinc-700 dark:text-zinc-300"
                  htmlFor="webhook-description"
                >
                  Açıklama
                </label>
                <textarea
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
                    hasAttemptedSave && !descriptionIsValid
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800"
                      : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:border-zinc-100"
                  }`}
                  id="webhook-description"
                  maxLength={1000}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bu webhook ne için kullanılıyor? (isteğe bağlı)"
                  rows={3}
                  value={description}
                />
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    {hasAttemptedSave && !descriptionIsValid && (
                      <p className="text-[11px] text-red-600 dark:text-red-400">
                        En fazla 1000 karakter.
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {description.length}/1000
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Events Selector */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-zinc-900 p-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    Olaylar <span className="text-red-600">*</span>
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    En az bir olay seçin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="rounded-lg border border-zinc-200 px-2.5 py-1 font-medium text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={handleSelectAll}
                  type="button"
                >
                  Tümünü seç
                </button>
                <button
                  className="rounded-lg border border-zinc-200 px-2.5 py-1 font-medium text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={handleSelectNone}
                  type="button"
                >
                  Hiçbiri
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((ev) => {
                const checked = events.includes(ev);
                return (
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                      checked
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/60"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/40"
                    }`}
                    key={ev}
                  >
                    <input
                      checked={checked}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800"
                      onChange={() => toggleEvent(ev)}
                      type="checkbox"
                    />
                    <span className="font-medium font-mono text-xs text-zinc-800 dark:text-zinc-200">
                      {ev}
                    </span>
                  </label>
                );
              })}
            </div>
            {hasAttemptedSave && !eventsIsValid && (
              <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">
                En az bir olay seçmelisiniz.
              </p>
            )}
            <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              Seçili: {events.length} / {WEBHOOK_EVENTS.length} — Webhook sadece
              seçili olaylarda tetiklenir.
            </p>
          </div>
        </div>

        {/* Right: Secret + HMAC + Test */}
        <div className="space-y-6">
          {/* Secret Section */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Gizli Anahtar
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              HMAC imzalama için kullanılır. Sadece oluşturma anında tam değeri
              gösterilir.
            </p>

            <div className="mt-4">
              {secretOnce ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                      Secret (bir kez gösterilir)
                    </span>
                    <button
                      className="rounded-lg border border-zinc-200 p-1 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400"
                      onClick={() => setShowSecret((prev: boolean) => !prev)}
                      type="button"
                    >
                      {showSecret ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                    <code className="block break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">
                      {showSecret
                        ? secretOnce
                        : "••••••••••••••••••••••••••••••••"}
                    </code>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                        onClick={() => {
                          void handleCopySecret(secretOnce);
                        }}
                        type="button"
                      >
                        <Copy className="h-3 w-3" />
                        Kopyala
                      </button>
                      <button
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        onClick={() =>
                          toast.info("Yeniden oluşturma yakında eklenecek.")
                        }
                        type="button"
                      >
                        Yeniden Oluştur
                      </button>
                    </div>
                  </div>
                  <p className="font-medium text-[11px] text-amber-700 dark:text-amber-300">
                    Bir kez gösterilir, kaydedin
                  </p>
                </div>
              ) : secretMasked ? (
                <div className="space-y-2">
                  <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                    Secret (maskelenmiş)
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <code className="flex-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {secretMasked}
                    </code>
                    <button
                      className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                      onClick={() => {
                        void handleCopySecret(secretMasked);
                      }}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    onClick={() =>
                      toast.info("Secret yenileme yakında eklenecek.")
                    }
                    type="button"
                  >
                    Yeniden Oluştur
                  </button>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Güvenlik gereği tam secret tekrar gösterilmez. Yeniden
                    oluşturursanız eski secret geçersiz olur.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 border-dashed bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-800/30">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isNew
                      ? "Oluşturduğunuzda secret burada görünecek."
                      : "Bu uç nokta için secret ayarlı değil veya maskelenmiş."}
                  </p>
                  {!isNew && (
                    <button
                      className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-1 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      onClick={() =>
                        toast.info("Secret yenileme yakında eklenecek.")
                      }
                      type="button"
                    >
                      Yeni Secret Oluştur
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* HMAC Preview */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              HMAC İmzası Önizleme
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Her istekte bu başlıklar gönderilir. Payload = timestamp +
              &quot;.&quot; + JSON.
            </p>
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div>
                <span className="font-mono font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  X-Webhook-Signature
                </span>
                <code className="mt-1 block break-all rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {hmacExampleSignature}
                </code>
              </div>
              <div>
                <span className="font-mono font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  X-Webhook-Timestamp
                </span>
                <code className="mt-1 block rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {hmacExampleTimestamp}
                </code>
              </div>
              <div>
                <span className="font-mono font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  X-Tenant-Id
                </span>
                <code className="mt-1 block rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {tenantSlug || "tenant-id"}
                </code>
              </div>
              <div>
                <span className="font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                  Örnek Payload
                </span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-white px-2.5 py-2 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {hmacExamplePayload}
                </pre>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              İmzayı doğrulamak için: HMAC-SHA256(secret, timestamp +
              &quot;.&quot; + body)
            </p>
          </div>

          {/* Test Send Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Test Gönderimi
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Dry-run modunda gerçek teslimat oluşturmadan simüle eder.
            </p>
            <button
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 font-semibold text-white text-xs hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              disabled={isNew}
              onClick={handleOpenTestModal}
              type="button"
            >
              <Send className="h-3.5 w-3.5" />
              Test Gönder
            </button>
            {isNew && (
              <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Önce kaydedin
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delivery History Mini-Table */}
      {!isNew && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-zinc-100 border-b p-4 dark:border-zinc-800">
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Teslimat Geçmişi
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Son 10 teslimat — durum, deneme sayısı ve yanıt kodu
              </p>
            </div>
            <button
              className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400"
              onClick={() => {
                void loadDeliveries();
              }}
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingDeliveries ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {isLoadingDeliveries ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                Teslimatlar yükleniyor...
              </span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <Send className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Henüz teslimat yok
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Bu uç nokta için henüz bir webhook tetiklenmedi. Test
                gönderimiyle ilk teslimatı oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-zinc-200 bg-zinc-50/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                  <TableRow>
                    <TableHead className="px-4 py-2.5 font-semibold h-auto">Olay</TableHead>
                    <TableHead className="px-4 py-2.5 font-semibold h-auto">Durum</TableHead>
                    <TableHead className="px-4 py-2.5 font-semibold h-auto">Deneme</TableHead>
                    <TableHead className="px-4 py-2.5 font-semibold h-auto">Tarih</TableHead>
                    <TableHead className="px-4 py-2.5 font-semibold h-auto">Yanıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {deliveries.map((d) => (
                    <TableRow
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                      key={d.id}
                    >
                      <TableCell className="px-4 py-3 font-medium font-mono text-zinc-800 dark:text-zinc-200">
                        {d.eventType}
                      </TableCell>
                      <TableCell className="px-4 py-3">{getStatusBadge(d.status)}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {d.attemptCount}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                        {formatDate(d.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {d.responseCode ? (
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono font-semibold text-[11px] ${
                              d.status === "Success"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            }`}
                          >
                            {d.responseCode}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Test-send Simulation Modal */}
      {isTestModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsTestModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full space-y-4 overflow-y-auto gap-0 p-6 sm:max-w-xl"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-zinc-900 p-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Test Gönder (Dry-Run)
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Gerçek Failed teslimatı oluşturmaz, sadece simüle eder
                  </p>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div>
              <label
                className="mb-1.5 block font-semibold text-xs text-zinc-700 dark:text-zinc-300"
                htmlFor="test-payload"
              >
                JSON Payload
              </label>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-xs text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100"
                id="test-payload"
                onChange={(e) => setTestPayloadText(e.target.value)}
                rows={6}
                value={testPayloadText}
              />
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Varsayılan: {"{ event: selected, test: true }"} — dilediğiniz
                JSON ile test edebilirsiniz.
              </p>
            </div>

            {testResult && (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                    Sonuç
                  </span>
                  {getStatusBadge(testResult.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                      Süre
                    </span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {testResult.durationMs ?? "—"} ms
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                      Yanıt Kodu
                    </span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {testResult.responseCode ?? "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                      HMAC
                    </span>
                    <code className="mt-1 block break-all rounded-lg bg-white px-2 py-1 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {testResult.hmacSignature ?? "—"}
                    </code>
                  </div>
                  {testResult.responseBody && (
                    <div className="col-span-2">
                      <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400">
                        Response Body
                      </span>
                      <pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {testResult.responseBody}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                onClick={() => setIsTestModalOpen(false)}
                type="button"
              >
                Kapat
              </button>
              <button
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                disabled={isTesting}
                onClick={() => {
                  void handleTestSend();
                }}
                type="button"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isTesting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile sticky save bar */}
      <div className="sticky bottom-4 flex justify-end lg:hidden">
        <button
          className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 font-semibold text-sm text-white shadow-lg hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={isSaving || (hasAttemptedSave && !isFormValid)}
          onClick={() => {
            void handleSave();
          }}
          type="button"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isNew ? "Oluştur" : "Kaydet"}
        </button>
      </div>
    </PageContainer>
  );
}
