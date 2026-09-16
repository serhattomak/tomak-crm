"use client";

import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CreateDealPayload,
  type CustomerListDto,
  type EmailMessageDto,
  type PipelineDto,
  type TenantUserDto,
} from "@/lib/api-client";

export interface ConvertToLeadModalProps {
  isOpen: boolean;
  message: EmailMessageDto | null;
  onClose: () => void;
  onSuccess?: (dealId: string) => void;
  tenantSlug: string;
}

interface ParsedSender {
  company: string;
  email: string;
  name: string;
}

const SENDER_REGEX = /^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/;

function parseSender(fromAddress: string): ParsedSender {
  const clean = fromAddress.trim();
  const match = clean.match(SENDER_REGEX);
  const name = match?.[1]?.trim() || match?.[2]?.trim() || clean;
  const email = match?.[2]?.trim() || clean;
  const domain = email.includes("@") ? email.split("@")[1] : "";
  const domainName = domain ? domain.split(".")[0] : "";
  const company =
    domainName &&
    domainName !== "gmail" &&
    domainName !== "hotmail" &&
    domainName !== "yahoo"
      ? domainName.charAt(0).toUpperCase() + domainName.slice(1)
      : name;

  return { company, email, name };
}

function buildDealPayload(
  message: EmailMessageDto,
  customerId: string | null,
  fields: {
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    dealCurrency: string;
    dealNote: string;
    dealPriority: string;
    dealTitle: string;
    dealValue: number;
    selectedPipelineId: string;
    selectedStageId: string;
    selectedUserId: string;
  }
): CreateDealPayload {
  return {
    assignedUserId: fields.selectedUserId || undefined,
    contactEmail: fields.customerEmail.trim() || undefined,
    contactName: fields.customerName.trim() || undefined,
    contactPhone: fields.customerPhone.trim() || undefined,
    currency: fields.dealCurrency,
    customerId: customerId || undefined,
    initialNote: fields.dealNote.trim() || undefined,
    pipelineId: fields.selectedPipelineId,
    priority: fields.dealPriority,
    source: "Email",
    sourceReferenceId: message.id,
    stageId: fields.selectedStageId || undefined,
    title: fields.dealTitle.trim(),
    value: fields.dealValue,
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  TRY: "₺",
  USD: "$",
};

function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? "₺";
}

interface DealSuccessCardProps {
  onClose: () => void;
  tenantSlug: string;
}

function DealSuccessCard({
  onClose,
  tenantSlug,
}: DealSuccessCardProps): React.ReactElement {
  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-semibold text-emerald-900 text-sm dark:text-emerald-200">
          Fırsat Başarıyla Oluşturuldu!
        </h3>
        <p className="mt-1 text-emerald-700 text-xs dark:text-emerald-300">
          E-posta içeriği satış boru hattınıza Lead olarak eklendi.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Link
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white text-xs shadow-sm hover:bg-emerald-800"
          href={`/${tenantSlug}/pipelines`}
          onClick={onClose}
        >
          <span>Satış Hattına Git</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Button onClick={onClose} size="sm" variant="outline">
          Kapat
        </Button>
      </div>
    </div>
  );
}

interface CustomerMatchSectionProps {
  customerEmail: string;
  customerMode: "new" | "existing";
  customerName: string;
  customerPhone: string;
  existingCustomers: CustomerListDto[];
  onCustomerEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCustomerNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCustomerPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectCustomer: (id: string) => void;
  onSetModeExisting: () => void;
  onSetModeNew: () => void;
  selectedCustomerId: string;
}

function CustomerMatchSection({
  customerEmail,
  customerMode,
  customerName,
  customerPhone,
  existingCustomers,
  onCustomerEmailChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onSelectCustomer,
  onSetModeExisting,
  onSetModeNew,
  selectedCustomerId,
}: CustomerMatchSectionProps): React.ReactElement {
  const showExistingPicker =
    customerMode === "existing" && existingCustomers.length > 0;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-zinc-50/50 p-3 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
          Müşteri Eşleştirme
        </span>
        <div className="flex items-center gap-1">
          <button
            className={`rounded-lg px-2.5 py-1 font-medium text-xs transition ${
              customerMode === "new"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
            onClick={onSetModeNew}
            type="button"
          >
            Yeni Müşteri
          </button>
          {existingCustomers.length > 0 ? (
            <button
              className={`rounded-lg px-2.5 py-1 font-medium text-xs transition ${
                customerMode === "existing"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
              onClick={onSetModeExisting}
              type="button"
            >
              Mevcut Müşteri ({existingCustomers.length})
            </button>
          ) : null}
        </div>
      </div>

      {showExistingPicker ? (
        <div className="space-y-1 pt-1">
          <Label className="font-medium text-xs">Mevcut Müşteri Seçin</Label>
          <Combobox
            emptyMessage="Müşteri bulunamadı."
            onChange={onSelectCustomer}
            options={existingCustomers.map((cust) => ({
              description: cust.email || "E-posta yok",
              label: cust.name,
              value: cust.id,
            }))}
            placeholder="Müşteri seçin"
            searchPlaceholder="Müşteri ara..."
            value={selectedCustomerId}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
          <div>
            <Label className="font-medium text-xs">Firma / Müşteri Adı *</Label>
            <Input
              className="h-8 text-xs"
              onChange={onCustomerNameChange}
              placeholder="Örn: ABC A.Ş."
              value={customerName}
            />
          </div>
          <div>
            <Label className="font-medium text-xs">E-posta</Label>
            <Input
              className="h-8 text-xs"
              onChange={onCustomerEmailChange}
              placeholder="iletisim@firma.com"
              type="email"
              value={customerEmail}
            />
          </div>
          <div>
            <Label className="font-medium text-xs">Telefon</Label>
            <Input
              className="h-8 text-xs"
              onChange={onCustomerPhoneChange}
              placeholder="+90 (5XX) XXX XX XX"
              value={customerPhone}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ConvertToLeadModal({
  isOpen,
  message,
  onClose,
  onSuccess,
  tenantSlug,
}: ConvertToLeadModalProps): React.ReactElement | null {
  const [customerMode, setCustomerMode] = useState<"new" | "existing">("new");
  const [existingCustomers, setExistingCustomers] = useState<CustomerListDto[]>(
    []
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [dealTitle, setDealTitle] = useState<string>("");
  const [dealValue, setDealValue] = useState<number>(0);
  const [dealCurrency, setDealCurrency] = useState<string>("TRY");
  const [dealPriority, setDealPriority] = useState<string>("Medium");
  const [dealNote, setDealNote] = useState<string>("");

  const [pipelines, setPipelines] = useState<PipelineDto[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [users, setUsers] = useState<TenantUserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdDealId, setCreatedDealId] = useState<string | null>(null);

  const handleCustomerNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomerName(e.target.value);
    },
    []
  );

  const handleCustomerEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomerEmail(e.target.value);
    },
    []
  );

  const handleCustomerPhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomerPhone(e.target.value);
    },
    []
  );

  const handleDealTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDealTitle(e.target.value);
    },
    []
  );

  const handleDealValueChange = useCallback((val: number) => {
    setDealValue(Number.isNaN(val) ? 0 : val);
  }, []);

  const handleDealNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDealNote(e.target.value);
    },
    []
  );

  const handleSetModeNew = useCallback(() => {
    setCustomerMode("new");
  }, []);

  const handleSetModeExisting = useCallback(() => {
    setCustomerMode("existing");
  }, []);

  const applyLoadedData = useCallback(
    (
      custItems?: CustomerListDto[],
      pipeItems?: PipelineDto[],
      userItems?: TenantUserDto[]
    ) => {
      if (custItems && custItems.length > 0) {
        setExistingCustomers(custItems);
        const [firstCust] = custItems;
        if (firstCust) {
          setSelectedCustomerId(firstCust.id);
          setCustomerMode("existing");
        }
      } else {
        setCustomerMode("new");
      }

      if (pipeItems && pipeItems.length > 0) {
        setPipelines(pipeItems);
        const [firstPipe] = pipeItems;
        if (firstPipe) {
          setSelectedPipelineId(firstPipe.id);
          if (firstPipe.stages && firstPipe.stages.length > 0) {
            const [firstStage] = firstPipe.stages;
            if (firstStage) {
              setSelectedStageId(firstStage.id);
            }
          }
        }
      }

      if (userItems) {
        setUsers(userItems);
      }
    },
    []
  );

  useEffect(() => {
    if (!(isOpen && message)) {
      return;
    }

    const parsed = parseSender(message.fromAddress);
    setCustomerName(parsed.company || parsed.name);
    setCustomerEmail(parsed.email);
    setCustomerPhone("");
    setDealTitle(message.subject || `Yeni Fırsat - ${parsed.name}`);
    setDealValue(0);
    setDealCurrency("TRY");
    setDealPriority("Medium");
    setDealNote(message.textBody?.slice(0, 300) || "");
    setCreatedDealId(null);

    let isMounted = true;
    setIsLoadingMeta(true);

    Promise.all([
      ApiClient.getCustomers(tenantSlug, { search: parsed.email }),
      ApiClient.getPipelines(tenantSlug),
      ApiClient.getTenantUsers(tenantSlug),
    ])
      .then(([custRes, pipeRes, userRes]) => {
        if (!isMounted) {
          return;
        }
        applyLoadedData(
          custRes.success ? custRes.data?.items : undefined,
          pipeRes.success ? pipeRes.data : undefined,
          userRes.success ? userRes.data : undefined
        );
      })
      .catch(() => {
        // non-blocking: meta veriler yüklenemezse form yine açılır
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMeta(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, message, tenantSlug, applyLoadedData]);

  const handlePipelineChange = useCallback(
    (pipelineId: string) => {
      setSelectedPipelineId(pipelineId);
      const pipe = pipelines.find((p) => p.id === pipelineId);
      if (pipe?.stages && pipe.stages.length > 0) {
        const [firstStage] = pipe.stages;
        if (firstStage) {
          setSelectedStageId(firstStage.id);
        }
      }
    },
    [pipelines]
  );

  const resolveTargetCustomerId = useCallback(async (): Promise<
    string | null
  > => {
    if (customerMode === "existing") {
      return selectedCustomerId || null;
    }

    if (!customerName.trim()) {
      toast.error("Lütfen müşteri adını girin.");
      return null;
    }

    const createCustRes = await ApiClient.createCustomer(
      {
        email: customerEmail.trim() || undefined,
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        status: "Lead",
        tier: "Standard",
        type: "Company",
      },
      tenantSlug
    );

    if (!(createCustRes.success && createCustRes.data)) {
      toast.error(createCustRes.message || "Müşteri kartı oluşturulamadı.");
      return null;
    }

    return createCustRes.data;
  }, [
    customerMode,
    selectedCustomerId,
    customerName,
    customerEmail,
    customerPhone,
    tenantSlug,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!message) {
      return;
    }

    if (!dealTitle.trim()) {
      toast.error("Lütfen fırsat başlığı girin.");
      return;
    }

    if (!selectedPipelineId) {
      toast.error("Lütfen bir satış hattı (pipeline) seçin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCustomerId = await resolveTargetCustomerId();
      if (!finalCustomerId && customerMode === "new") {
        setIsSubmitting(false);
        return;
      }

      const parsedValue = dealValue || 0;
      const payload = buildDealPayload(message, finalCustomerId, {
        customerEmail,
        customerName,
        customerPhone,
        dealCurrency,
        dealNote,
        dealPriority,
        dealTitle,
        dealValue: parsedValue,
        selectedPipelineId,
        selectedStageId,
        selectedUserId,
      });
      const dealRes = await ApiClient.createDeal(payload, tenantSlug);

      if (dealRes.success && dealRes.data) {
        setCreatedDealId(dealRes.data);
        toast.success("Fırsat başarıyla oluşturuldu!");
        onSuccess?.(dealRes.data);
      } else {
        toast.error(dealRes.message || "Fırsat oluşturulamadı.");
      }
    } catch {
      toast.error("Fırsat oluşturulurken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    message,
    dealTitle,
    selectedPipelineId,
    resolveTargetCustomerId,
    customerMode,
    dealValue,
    selectedUserId,
    customerEmail,
    customerName,
    customerPhone,
    dealCurrency,
    dealNote,
    dealPriority,
    selectedStageId,
    tenantSlug,
    onSuccess,
  ]);

  if (!(isOpen && message)) {
    return null;
  }

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId);

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
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b bg-zinc-50/75 px-5 py-4 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                E-postadan Fırsat & Müşteri Oluştur
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                İleti içeriğini tek tıkla CRM satış boru hattına dönüştürün
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {/* Content */}
        <div className="custom-scrollbar max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {isLoadingMeta ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Müşteri ve satış hattı verileri taranıyor...
            </div>
          ) : null}

          {createdDealId ? (
            <DealSuccessCard onClose={onClose} tenantSlug={tenantSlug} />
          ) : (
            <>
              {/* Customer Mode Selection */}
              <CustomerMatchSection
                customerEmail={customerEmail}
                customerMode={customerMode}
                customerName={customerName}
                customerPhone={customerPhone}
                existingCustomers={existingCustomers}
                onCustomerEmailChange={handleCustomerEmailChange}
                onCustomerNameChange={handleCustomerNameChange}
                onCustomerPhoneChange={handleCustomerPhoneChange}
                onSelectCustomer={setSelectedCustomerId}
                onSetModeExisting={handleSetModeExisting}
                onSetModeNew={handleSetModeNew}
                selectedCustomerId={selectedCustomerId}
              />

              {/* Deal Details */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-medium text-xs">
                    Fırsat Başlığı *
                  </Label>
                  <Input
                    className="h-9 font-medium text-xs"
                    onChange={handleDealTitleChange}
                    placeholder="Örn: Yıllık Lisans Teklifi Talebi"
                    value={dealTitle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="font-medium text-xs">Tahmini Tutar</Label>
                    <NumberInput
                      min={0}
                      onChange={handleDealValueChange}
                      placeholder="0.00"
                      precision={2}
                      showStepper={false}
                      suffix={<span>{getCurrencySymbol(dealCurrency)}</span>}
                      value={dealValue}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-medium text-xs">Para Birimi</Label>
                    <SelectField
                      onChange={setDealCurrency}
                      options={[
                        { label: "TRY (₺)", value: "TRY" },
                        { label: "USD ($)", value: "USD" },
                        { label: "EUR (€)", value: "EUR" },
                      ]}
                      placeholder="TRY"
                      value={dealCurrency}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-medium text-xs">Öncelik</Label>
                    <SelectField
                      onChange={setDealPriority}
                      options={[
                        { label: "Düşük", value: "Low" },
                        { label: "Orta", value: "Medium" },
                        { label: "Yüksek", value: "High" },
                        { label: "Acil", value: "Urgent" },
                      ]}
                      placeholder="Orta"
                      value={dealPriority}
                    />
                  </div>
                </div>

                {/* Pipeline & Stage */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="font-medium text-xs">
                      Satış Hattı (Pipeline)
                    </Label>
                    <Combobox
                      emptyMessage="Satış hattı bulunamadı."
                      onChange={handlePipelineChange}
                      options={pipelines.map((p) => ({
                        label: p.name,
                        value: p.id,
                      }))}
                      placeholder="Satış Hattı Seçin"
                      searchPlaceholder="Satış hattı ara..."
                      value={selectedPipelineId}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="font-medium text-xs">Aşama (Stage)</Label>
                    <Combobox
                      emptyMessage="Aşama bulunamadı."
                      onChange={setSelectedStageId}
                      options={(currentPipeline?.stages ?? []).map((s) => ({
                        label: s.name,
                        value: s.id,
                      }))}
                      placeholder="Aşama Seçin"
                      searchPlaceholder="Aşama ara..."
                      value={selectedStageId}
                    />
                  </div>
                </div>

                {/* Assigned User */}
                <div className="space-y-1">
                  <Label className="font-medium text-xs">
                    Sorumlu Temsilci
                  </Label>
                  <Combobox
                    clearable
                    emptyMessage="Temsilci bulunamadı."
                    onChange={setSelectedUserId}
                    options={[
                      { label: "Atanmamış", value: "unassigned" },
                      ...users.map((u) => ({
                        description: u.email ?? undefined,
                        label: u.fullName || u.email || "İsimsiz",
                        value: u.id,
                      })),
                    ]}
                    placeholder="Temsilci ata (Opsiyonel)"
                    searchPlaceholder="Temsilci ara..."
                    value={selectedUserId}
                  />
                </div>

                {/* Deal Note / Excerpt */}
                <div className="space-y-1">
                  <Label className="font-medium text-xs">
                    Fırsat Notu / E-posta Özeti
                  </Label>
                  <Textarea
                    className="h-20 text-xs"
                    onChange={handleDealNoteChange}
                    placeholder="E-postadan alınan detaylar..."
                    value={dealNote}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {createdDealId ? null : (
          <div className="flex items-center justify-end gap-2.5 border-border border-t bg-zinc-50/75 px-5 py-3.5 dark:bg-zinc-900/50">
            <button
              className="rounded-xl border border-border bg-card px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-medium text-white text-xs shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              disabled={isSubmitting || !dealTitle.trim()}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Fırsatı Oluştur</span>
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
