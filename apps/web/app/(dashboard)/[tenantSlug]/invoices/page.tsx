"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Clock,
  FileText,
  Layers,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type CariAccountDto,
  type CreateInvoiceItemPayload,
  type CreateInvoicePayload,
  type InvoiceDetailDto,
  type InvoiceListDto,
} from "@/lib/api-client";
import {
  InvoiceDocument,
  InvoiceStatusBadge,
} from "./_components/invoice-document";

// --- Subcomponents ---

interface KpiCardProps {
  colorClass: string;
  icon: React.ElementType;
  label: string;
  trend?: string;
  value: string;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  colorClass,
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs text-muted-foreground">
          {label}
        </span>
        <div className={`rounded-xl p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        {trend ? (
          <span className="font-medium text-2xs text-muted-foreground">
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  invoice: InvoiceListDto;
  onCancel: (id: string) => void;
  onIssue: (id: string) => void;
  onSelect: (id: string) => void;
}

function InvoiceRow({ invoice, onSelect, onIssue, onCancel }: InvoiceRowProps) {
  const handleSelect = useCallback(() => {
    onSelect(invoice.id);
  }, [invoice.id, onSelect]);

  const handleIssue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onIssue(invoice.id);
    },
    [invoice.id, onIssue]
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancel(invoice.id);
    },
    [invoice.id, onCancel]
  );

  const isSales = invoice.type === "Sales";

  return (
    <TableRow
      className="cursor-pointer border-border transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
      onClick={handleSelect}
    >
      <TableCell className="py-3.5 pr-3 pl-4">
        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {invoice.invoiceNumber}
        </div>
        <div className="font-medium text-2xs text-muted-foreground">
          {invoice.profile} •{" "}
          {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
        </div>
      </TableCell>
      <TableCell className="px-3 py-3.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${
            isSales
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              : "bg-amber-50 text-amber-700 dark:text-amber-400 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {isSales ? "Satış" : "Alış"}
        </span>
      </TableCell>
      <TableCell className="px-3 py-3.5">
        <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
          {invoice.cariTitle}
        </div>
        {invoice.cariTaxNumber ? (
          <div className="text-2xs text-muted-foreground">
            VKN/TCKN: {invoice.cariTaxNumber}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="px-3 py-3.5 text-right">
        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {invoice.grandTotal.toLocaleString("tr-TR", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}{" "}
          {invoice.currency}
        </div>
        <div className="text-2xs text-muted-foreground">
          KDV:{" "}
          {invoice.taxTotal.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
          })}{" "}
          {invoice.currency}
        </div>
      </TableCell>
      <TableCell className="px-3 py-3.5">
        <InvoiceStatusBadge status={invoice.status} />
      </TableCell>
      <TableCell className="py-3.5 pr-4 pl-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <a
            className="rounded-lg border border-border bg-zinc-50 px-2 py-1 font-mono text-2xs text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300"
            download
            href={`/api/invoicing/invoices/${invoice.id}/download-ubl`}
            onClick={(e) => e.stopPropagation()}
            title="GİB UBL-TR 2.1 XML İndir"
          >
            XML
          </a>
          {invoice.status === "Draft" ? (
            <button
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 text-xs shadow-2xs hover:bg-emerald-100 active:scale-95 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900"
              onClick={handleIssue}
              title="Resmileştir ve Cari Bakiyeye İşle"
              type="button"
            >
              Onayla
            </button>
          ) : null}
          {invoice.status === "Cancelled" ? null : (
            <button
              className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
              onClick={handleCancel}
              title="Faturayı İptal Et"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface FilterBarProps {
  onSearchChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onTypeFilterChange: (val: string) => void;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
}

function FilterBar({
  searchQuery,
  typeFilter,
  statusFilter,
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
}: FilterBarProps) {
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const handleTypeSelect = useCallback(
    (val: string) => {
      onTypeFilterChange(val);
    },
    [onTypeFilterChange]
  );

  const handleStatusSelect = useCallback(
    (val: string) => {
      onStatusFilterChange(val);
    },
    [onStatusFilterChange]
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-xl border border-border bg-zinc-50/60 py-2 pr-3 pl-9 text-sm text-zinc-800 placeholder:text-muted-foreground focus:border-ring focus:bg-white focus:outline-none dark:bg-zinc-800/40 dark:text-zinc-200 dark:focus:bg-zinc-800"
          onChange={handleSearchInput}
          placeholder="Fatura No veya Müşteri Ara..."
          type="text"
          value={searchQuery}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SelectField
          onChange={handleTypeSelect}
          options={[
            { label: "Tüm Türler", value: "All" },
            { label: "Satış Faturaları", value: "Sales" },
            { label: "Alış Faturaları", value: "Purchase" },
            { label: "Satış İadeleri", value: "SalesReturn" },
            { label: "Alış İadeleri", value: "PurchaseReturn" },
          ]}
          placeholder="Tüm Türler"
          value={typeFilter}
        />

        <SelectField
          onChange={handleStatusSelect}
          options={[
            { label: "Tüm Durumlar", value: "All" },
            { label: "Taslaklar", value: "Draft" },
            { label: "Resmileşenler", value: "Issued" },
            { label: "Ödenenler", value: "Paid" },
            { label: "İptal Edilenler", value: "Cancelled" },
          ]}
          placeholder="Tüm Durumlar"
          value={statusFilter}
        />
      </div>
    </div>
  );
}

interface TableContentProps {
  invoices: InvoiceListDto[];
  isLoading: boolean;
  onCancel: (id: string) => void;
  onIssue: (id: string) => void;
  onSelect: (id: string) => void;
}

function InvoiceTableBody({
  isLoading,
  invoices,
  onSelect,
  onIssue,
  onCancel,
}: TableContentProps) {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell
          className="py-8 text-center text-muted-foreground"
          colSpan={6}
        >
          Faturalar yükleniyor...
        </TableCell>
      </TableRow>
    );
  }

  if (invoices.length === 0) {
    return (
      <TableRow>
        <TableCell
          className="py-12 text-center text-muted-foreground"
          colSpan={6}
        >
          <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Henüz kayıtlı fatura bulunmuyor.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {invoices.map((inv) => (
        <InvoiceRow
          invoice={inv}
          key={inv.id}
          onCancel={onCancel}
          onIssue={onIssue}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// --- Invoice Detail Drawer Component ---

interface DetailDrawerProps {
  invoice: InvoiceDetailDto | null;
  isLoading: boolean;
  onClose: () => void;
  onPrint: () => void;
}

function InvoiceDetailDrawer({
  invoice,
  isLoading,
  onClose,
  onPrint,
}: DetailDrawerProps) {
  if (!(invoice || isLoading)) {
    return null;
  }

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <SheetContent
        aria-describedby={undefined}
        className="data-[side=right]:w-full max-w-2xl data-[side=right]:sm:max-w-2xl print:hidden"
        side="right"
      >
        <div className="flex items-center justify-between border-border border-b p-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary " />
            <SheetTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Fatura Önizleme & Detay
            </SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={onPrint}
              type="button"
            >
              <Printer className="h-3.5 w-3.5" /> Yazdır
            </button>
            <SheetClose asChild>
              <button
                aria-label="Kapat"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !invoice ? (
            <div className="py-12 text-center text-muted-foreground">
              Yükleniyor...
            </div>
          ) : (
            <InvoiceDocument invoice={invoice} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Main Page Component ---

export default function InvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params.tenantSlug as string) || "";

  const [invoices, setInvoices] = useState<InvoiceListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Drawer & Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceDetailDto | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Cari accounts for dropdown
  const [cariList, setCariList] = useState<CariAccountDto[]>([]);

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    if (!tenantSlug) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await ApiClient.getInvoices(tenantSlug, {
        page: 1,
        pageSize: 50,
        search: searchQuery || undefined,
        status: statusFilter === "All" ? undefined : statusFilter,
        type: typeFilter === "All" ? undefined : typeFilter,
      });
      if (res.success && res.data) {
        setInvoices(res.data.items);
        setTotalCount(res.data.totalCount);
        setTotalSales(res.data.totalSales);
        setTotalPurchase(res.data.totalPurchase);
        setTotalTax(res.data.totalTax);
        setPendingBalance(res.data.pendingBalance);
      }
    } catch {
      toast.error("Faturalar yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Load Cari List for Modal
  useEffect(() => {
    if (!tenantSlug) {
      return;
    }
    ApiClient.getCariAccounts(tenantSlug, { pageSize: 100 })
      .then((res) => {
        if (res.success && res.data) {
          setCariList(res.data.items);
        }
      })
      .catch(() => {
        /* ignore error */
      });
  }, [tenantSlug]);

  // Load Single Invoice Detail
  const handleSelectInvoice = useCallback(
    async (id: string) => {
      setSelectedInvoiceId(id);
      setIsDetailLoading(true);
      try {
        const res = await ApiClient.getInvoiceDetail(id, tenantSlug);
        if (res.success && res.data) {
          setSelectedInvoice(res.data);
        }
      } catch {
        toast.error("Fatura detayları yüklenemedi.");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [tenantSlug]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedInvoiceId(null);
    setSelectedInvoice(null);
  }, []);

  const handleIssueInvoice = useCallback(
    async (id: string) => {
      try {
        const res = await ApiClient.issueInvoice(id, tenantSlug);
        if (res.success) {
          toast.success("Fatura resmileştirildi ve cari hesaba işlendi!");
          loadInvoices();
          if (selectedInvoiceId === id) {
            handleSelectInvoice(id);
          }
        }
      } catch {
        toast.error("Fatura resmileştirilemedi.");
      }
    },
    [tenantSlug, loadInvoices, selectedInvoiceId, handleSelectInvoice]
  );

  const handleCancelInvoice = useCallback(
    async (id: string) => {
      try {
        const res = await ApiClient.cancelInvoice(id, tenantSlug);
        if (res.success) {
          toast.success("Fatura iptal edildi.");
          loadInvoices();
          if (selectedInvoiceId === id) {
            handleSelectInvoice(id);
          }
        }
      } catch {
        toast.error("Fatura iptal edilemedi.");
      }
    },
    [tenantSlug, loadInvoices, selectedInvoiceId, handleSelectInvoice]
  );

  const handlePrint = useCallback(() => {
    if (!selectedInvoiceId) {
      return;
    }
    router.push(`/${tenantSlug}/invoices/${selectedInvoiceId}/print`);
  }, [router, selectedInvoiceId, tenantSlug]);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateModalOpen(false);
    loadInvoices();
  }, [loadInvoices]);

  return (
    <PageContainer className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Faturalar & e-Fatura
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/60 dark:text-blue-300">
              {totalCount} Adet
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Satış ve alış faturaları, KDV tevkifatı dökümü ve cari hesap
            entegrasyonu.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 font-semibold text-sm text-background shadow-xs transition-all hover:bg-foreground/90 active:scale-95 dark:hover:bg-blue-500"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Yeni Fatura Kes
          </button>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          icon={Receipt}
          label="Toplam Satış Cirosu"
          value={`${totalSales.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          icon={Layers}
          label="Toplam Alış / Gider"
          value={`${totalPurchase.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          icon={FileText}
          label="Hesaplanan KDV"
          value={`${totalTax.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
        <KpiCard
          colorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          icon={Clock}
          label="Açık / Bekleyen Bakiye"
          value={`${pendingBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`}
        />
      </div>

      {/* 3. Filters & Search Bar */}
      <FilterBar
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onTypeFilterChange={setTypeFilter}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
      />

      {/* 4. Invoices Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table className="font-sans">
            <TableHeader>
              <TableRow className="border-border bg-zinc-50/80 font-semibold text-2xs text-muted-foreground uppercase tracking-wider dark:bg-zinc-800/50">
                <TableHead className="py-3 pr-3 pl-4 h-auto">
                  Fatura No & Tarih
                </TableHead>
                <TableHead className="px-3 py-3 h-auto">Tür</TableHead>
                <TableHead className="px-3 py-3 h-auto">
                  Cari Hesap (Ünvan)
                </TableHead>
                <TableHead className="px-3 py-3 text-right h-auto">
                  Tutar & KDV
                </TableHead>
                <TableHead className="px-3 py-3 h-auto">Durum</TableHead>
                <TableHead className="py-3 pr-4 pl-3 text-right h-auto">
                  Aksiyon
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <InvoiceTableBody
                invoices={invoices}
                isLoading={isLoading}
                onCancel={handleCancelInvoice}
                onIssue={handleIssueInvoice}
                onSelect={handleSelectInvoice}
              />
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 5. Invoice Detail Drawer */}
      {selectedInvoiceId ? (
        <InvoiceDetailDrawer
          invoice={selectedInvoice}
          isLoading={isDetailLoading}
          onClose={handleCloseDetail}
          onPrint={handlePrint}
        />
      ) : null}

      {/* 6. Create Invoice Modal */}
      {isCreateModalOpen ? (
        <CreateInvoiceModal
          cariList={cariList}
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
          tenantSlug={tenantSlug}
        />
      ) : null}
    </PageContainer>
  );
}

// --- Create Invoice Modal Component ---

interface FormItem extends CreateInvoiceItemPayload {
  rowId: string;
}

interface InvoiceItemRowProps {
  canRemove: boolean;
  item: FormItem;
  onChange: (
    rowId: string,
    field: keyof CreateInvoiceItemPayload,
    val: unknown
  ) => void;
  onRemove: (rowId: string) => void;
}

function InvoiceItemRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: InvoiceItemRowProps) {
  const handleName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(item.rowId, "productName", e.target.value);
    },
    [item.rowId, onChange]
  );

  const handleQty = useCallback(
    (val: number) => {
      onChange(item.rowId, "quantity", val);
    },
    [item.rowId, onChange]
  );

  const handlePrice = useCallback(
    (val: number) => {
      onChange(item.rowId, "unitPrice", val);
    },
    [item.rowId, onChange]
  );

  const handleTax = useCallback(
    (val: string) => {
      onChange(item.rowId, "taxRate", Number(val));
    },
    [item.rowId, onChange]
  );

  const handleRemove = useCallback(() => {
    onRemove(item.rowId);
  }, [item.rowId, onRemove]);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
      <input
        className="flex-2 rounded-lg border border-border bg-card p-1.5 text-xs text-zinc-800 dark:text-zinc-200"
        onChange={handleName}
        placeholder="Ürün / Hizmet Açıklaması *"
        type="text"
        value={item.productName}
      />
      <NumberInput
        className="w-24"
        min={1}
        onChange={handleQty}
        showStepper
        value={item.quantity}
      />
      <NumberInput
        className="w-32"
        min={0}
        onChange={handlePrice}
        precision={2}
        prefix="₺"
        value={item.unitPrice}
      />
      <SelectField
        className="w-24"
        onChange={handleTax}
        options={[
          { label: "%20", value: "20" },
          { label: "%10", value: "10" },
          { label: "%1", value: "1" },
          { label: "%0", value: "0" },
        ]}
        value={String(item.taxRate)}
      />
      {canRemove ? (
        <button
          aria-label="Kaldır"
          className="p-1.5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
          onClick={handleRemove}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

interface CreateInvoiceModalProps {
  cariList: CariAccountDto[];
  onClose: () => void;
  onSuccess: () => void;
  tenantSlug: string;
}

function CreateInvoiceModal({
  tenantSlug,
  cariList,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [cariAccountId, setCariAccountId] = useState(cariList[0]?.id || "");
  const [type, setType] = useState("Sales");
  const [profile, setProfile] = useState("TICARIFATURA");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([
    {
      discountRate: 0,
      productName: "",
      quantity: 1,
      rowId: "item-0",
      taxRate: 20,
      unit: "Adet",
      unitPrice: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCariChange = useCallback((val: string) => {
    setCariAccountId(val);
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    setType(val);
  }, []);

  const handleProfileChange = useCallback((val: string) => {
    setProfile(val);
  }, []);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    []
  );

  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        discountRate: 0,
        productName: "",
        quantity: 1,
        rowId: `item-${Date.now()}-${Math.random()}`,
        taxRate: 20,
        unit: "Adet",
        unitPrice: 0,
      },
    ]);
  }, []);

  const handleRemoveItem = useCallback((rowId: string) => {
    setItems((prev) => prev.filter((i) => i.rowId !== rowId));
  }, []);

  const handleItemFieldChange = useCallback(
    (rowId: string, field: keyof CreateInvoiceItemPayload, val: unknown) => {
      setItems((prev) =>
        prev.map((item) =>
          item.rowId === rowId ? { ...item, [field]: val } : item
        )
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!cariAccountId) {
      toast.error("Lütfen bir cari hesap seçin.");
      return;
    }
    if (items.some((i) => !i.productName.trim() || i.unitPrice <= 0)) {
      toast.error(
        "Lütfen tüm kalemler için geçerli ürün adı ve birim fiyat girin."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateInvoicePayload = {
        cariAccountId,
        currency: "TRY",
        exchangeRate: 1,
        issueDate: new Date().toISOString(),
        items: items.map((i) => ({
          discountRate: i.discountRate,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          sku: i.sku,
          taxRate: i.taxRate,
          unit: i.unit,
          unitPrice: i.unitPrice,
          withholdingRate: i.withholdingRate,
        })),
        notes,
        profile,
        series: "FTR",
        type,
      };

      const res = await ApiClient.createInvoice(payload, tenantSlug);
      if (res.success) {
        toast.success("Fatura taslağı başarıyla oluşturuldu!");
        onSuccess();
      }
    } catch {
      toast.error("Fatura oluşturulurken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [cariAccountId, type, profile, notes, items, tenantSlug, onSuccess]);

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
        className="max-h-[90vh] w-full gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b p-4">
          <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Fatura Düzenle
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="inv-cari-select"
              >
                Cari Hesap *
              </label>
              <Combobox
                emptyMessage="Cari bulunamadı."
                onChange={handleCariChange}
                options={cariList.map((c) => ({
                  description: c.code,
                  label: c.title,
                  value: c.id,
                }))}
                searchPlaceholder="Cari ara..."
                value={cariAccountId}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="inv-type-select"
              >
                Fatura Türü
              </label>
              <SelectField
                onChange={handleTypeChange}
                options={[
                  { label: "Satış Faturası", value: "Sales" },
                  { label: "Alış Faturası", value: "Purchase" },
                ]}
                value={type}
              />
            </div>

            <div>
              <label
                className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
                htmlFor="inv-profile-select"
              >
                Fatura Profili
              </label>
              <SelectField
                onChange={handleProfileChange}
                options={[
                  { label: "Ticari Fatura", value: "TICARIFATURA" },
                  { label: "Temel Fatura", value: "TEMELFATURA" },
                  { label: "e-Arşiv Fatura", value: "EARSIVFATURA" },
                ]}
                value={profile}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Fatura Kalemleri
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 text-xs hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                onClick={handleAddItem}
                type="button"
              >
                <Plus className="h-3.5 w-3.5" /> Kalem Ekle
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <InvoiceItemRow
                  canRemove={items.length > 1}
                  item={item}
                  key={item.rowId}
                  onChange={handleItemFieldChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          </div>

          <div>
            <label
              className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300"
              htmlFor="inv-notes-input"
            >
              Notlar
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-zinc-50 p-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="inv-notes-input"
              onChange={handleNotesChange}
              placeholder="Fatura notları veya banka IBAN bilgileri..."
              rows={2}
              value={notes}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-border border-t p-4">
          <button
            className="rounded-xl border border-border px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="rounded-xl bg-foreground px-4 py-2 font-semibold text-background text-xs shadow-xs hover:bg-foreground/90 disabled:opacity-50 dark:hover:bg-blue-500"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Kaydediliyor..." : "Faturayı Oluştur"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
