"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { NumberInput } from "@workspace/ui/components/number-input";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import {
  AlertCircle,
  CheckCircle2,
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
import { useParams } from "next/navigation";
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
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
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
          <span className="font-medium text-[11px] text-zinc-400">{trend}</span>
        ) : null}
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "Issued" || status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 text-xs dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Resmileşti
      </span>
    );
  }
  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 text-xs dark:bg-blue-950/50 dark:text-blue-300">
        <CheckCircle2 className="h-3 w-3" /> Ödendi
      </span>
    );
  }
  if (status === "PartiallyPaid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 text-xs dark:bg-amber-950/50 dark:text-amber-300">
        <Clock className="h-3 w-3" /> Kısmi Ödendi
      </span>
    );
  }
  if (status === "Cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700 text-xs dark:bg-rose-950/50 dark:text-rose-300">
        <AlertCircle className="h-3 w-3" /> İptal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      <Clock className="h-3 w-3" /> Taslak
    </span>
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
    <tr
      className="cursor-pointer border-zinc-100 border-b transition-colors hover:bg-zinc-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
      onClick={handleSelect}
    >
      <td className="py-3.5 pr-3 pl-4">
        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {invoice.invoiceNumber}
        </div>
        <div className="font-medium text-[11px] text-zinc-400">
          {invoice.profile} •{" "}
          {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${
            isSales
              ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {isSales ? "Satış" : "Alış"}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
          {invoice.cariTitle}
        </div>
        {invoice.cariTaxNumber ? (
          <div className="text-[11px] text-zinc-400">
            VKN/TCKN: {invoice.cariTaxNumber}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3.5 text-right">
        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {invoice.grandTotal.toLocaleString("tr-TR", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}{" "}
          {invoice.currency}
        </div>
        <div className="text-[11px] text-zinc-400">
          KDV:{" "}
          {invoice.taxTotal.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
          })}{" "}
          {invoice.currency}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <InvoiceStatusBadge status={invoice.status} />
      </td>
      <td className="py-3.5 pr-4 pl-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <a
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
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
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
              onClick={handleCancel}
              title="Faturayı İptal Et"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="relative flex-1">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
        <input
          className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/60 py-2 pr-3 pl-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200 dark:focus:bg-zinc-800"
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
      <tr>
        <td className="py-8 text-center text-zinc-400" colSpan={6}>
          Faturalar yükleniyor...
        </td>
      </tr>
    );
  }

  if (invoices.length === 0) {
    return (
      <tr>
        <td className="py-12 text-center text-zinc-400" colSpan={6}>
          <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Henüz kayıtlı fatura bulunmuyor.
        </td>
      </tr>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-zinc-900 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Fatura Önizleme & Detay
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={onPrint}
              type="button"
            >
              <Printer className="h-3.5 w-3.5" /> Yazdır
            </button>
            <button
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !invoice ? (
            <div className="py-12 text-center text-zinc-400">Yükleniyor...</div>
          ) : (
            <div className="space-y-6 text-zinc-800 dark:text-zinc-200">
              <div className="flex items-start justify-between border-zinc-200 border-b pb-6 dark:border-zinc-800">
                <div>
                  <span className="font-extrabold text-violet-600 text-xl tracking-tight dark:text-violet-400">
                    {invoice.type === "Sales"
                      ? "SATIŞ FATURASI"
                      : "ALIŞ FATURASI"}
                  </span>
                  <div className="mt-1 font-bold font-mono text-base text-zinc-900 dark:text-zinc-100">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Profil: {invoice.profile}
                  </div>
                </div>
                <div className="space-y-1 text-right text-xs">
                  <div>
                    <span className="text-zinc-400">Düzenleme:</span>{" "}
                    <span className="font-semibold">
                      {new Date(invoice.issueDate).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  {invoice.dueDate ? (
                    <div>
                      <span className="text-zinc-400">Vade:</span>{" "}
                      <span className="font-semibold">
                        {new Date(invoice.dueDate as string).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </div>
                  ) : null}
                  <div>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-800/40">
                <div>
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider">
                    Müşteri / Cari
                  </span>
                  <div className="mt-1 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {invoice.cariTitle}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {invoice.cariAddress || "Adres belirtilmemiş"}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {invoice.cariCity} / {invoice.cariDistrict}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    VKN/TCKN: {invoice.cariTaxNumber || "—"} •{" "}
                    {invoice.cariTaxOffice || "—"} VD.
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-semibold text-zinc-400 uppercase tracking-wider">
                    Ödeme Koşulları
                  </span>
                  <div className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
                    {invoice.paymentTerms || "Standart Cari Hesaba Mahsuben"}
                  </div>
                  {invoice.notes ? (
                    <div className="mt-2 text-zinc-400 italic">
                      &quot;{invoice.notes}&quot;
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-zinc-200 border-b font-semibold text-zinc-400 dark:border-zinc-800">
                      <th className="py-2">Ürün / Hizmet</th>
                      <th className="py-2 text-right">Miktar</th>
                      <th className="py-2 text-right">Birim Fiyat</th>
                      <th className="py-2 text-right">KDV %</th>
                      <th className="py-2 text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {item.productName}
                          </div>
                          {item.sku ? (
                            <div className="font-mono text-[10px] text-zinc-400">
                              {item.sku}
                            </div>
                          ) : null}
                          {item.withholdingRate ? (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              Tevkifat: {item.withholdingRate}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {item.unitPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          {invoice.currency}
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          %{item.taxRate}
                        </td>
                        <td className="py-2.5 text-right font-bold font-mono">
                          {item.totalPrice.toLocaleString("tr-TR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          {invoice.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-zinc-200 border-t pt-4 dark:border-zinc-800">
                <div className="w-64 space-y-1.5 text-right text-xs">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Ara Toplam:</span>
                    <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                      {invoice.subtotal.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {invoice.currency}
                    </span>
                  </div>
                  {invoice.discountTotal > 0 ? (
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>İndirim:</span>
                      <span className="font-medium font-mono text-rose-600 dark:text-rose-400">
                        -
                        {invoice.discountTotal.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {invoice.currency}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Hesaplanan KDV:</span>
                    <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                      {invoice.taxTotal.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {invoice.currency}
                    </span>
                  </div>
                  {invoice.withholdingTotal > 0 ? (
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>KDV Tevkifatı:</span>
                      <span className="font-medium font-mono text-amber-600 dark:text-amber-400">
                        -
                        {invoice.withholdingTotal.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {invoice.currency}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-zinc-200 border-t pt-2 font-bold text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                    <span>Genel Toplam:</span>
                    <span className="font-mono text-violet-600 dark:text-violet-400">
                      {invoice.grandTotal.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {invoice.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function InvoicesPage() {
  const params = useParams();
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
    window.print();
  }, []);

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
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              Faturalar & e-Fatura
            </h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-semibold text-violet-700 text-xs dark:bg-violet-950/60 dark:text-violet-300">
              {totalCount} Adet
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Satış ve alış faturaları, KDV tevkifatı dökümü ve cari hesap
            entegrasyonu.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-sm text-white shadow-xs transition-all hover:bg-violet-700 active:scale-95 dark:hover:bg-violet-500"
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
          colorClass="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
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
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-zinc-200/80 border-b bg-zinc-50/80 font-semibold text-[11px] text-zinc-500 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <th className="py-3 pr-3 pl-4">Fatura No & Tarih</th>
                <th className="px-3 py-3">Tür</th>
                <th className="px-3 py-3">Cari Hesap (Ünvan)</th>
                <th className="px-3 py-3 text-right">Tutar & KDV</th>
                <th className="px-3 py-3">Durum</th>
                <th className="py-3 pr-4 pl-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <InvoiceTableBody
                invoices={invoices}
                isLoading={isLoading}
                onCancel={handleCancelInvoice}
                onIssue={handleIssueInvoice}
                onSelect={handleSelectInvoice}
              />
            </tbody>
          </table>
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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
      <input
        className="flex-2 rounded-lg border border-zinc-200 bg-white p-1.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
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
          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-zinc-200 border-b p-4 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Fatura Düzenle
          </h3>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
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
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 text-xs hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
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
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              id="inv-notes-input"
              onChange={handleNotesChange}
              placeholder="Fatura notları veya banka IBAN bilgileri..."
              rows={2}
              value={notes}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-zinc-200 border-t p-4 dark:border-zinc-800">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 disabled:opacity-50 dark:hover:bg-violet-500"
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "Kaydediliyor..." : "Faturayı Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
