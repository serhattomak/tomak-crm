"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import { TimePicker } from "@workspace/ui/components/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { QuickAddSalesRepModal } from "@/components/quick-add-sales-rep-modal";
import {
  type AddCustomerActivityRequest,
  type AddCustomerContactRequest,
  ApiClient,
  type CustomerDetailDto,
  type CustomerNoteDto,
  type DealSummaryDto,
  type EmployeeDto,
  type OrderListDto,
  type QuoteSummaryDto,
  type TicketListDto,
  type UpdateCustomerRequest,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type CustomerTab =
  | "overview"
  | "contacts"
  | "timeline"
  | "deals"
  | "quotes"
  | "orders"
  | "tickets"
  | "notes"
  | "finance";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const customerId = (params?.customerId as string) || "";
  const { activeTenant } = usePermissions();

  const [customer, setCustomer] = useState<CustomerDetailDto | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [deals, setDeals] = useState<DealSummaryDto[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummaryDto[]>([]);
  const [orders, setOrders] = useState<OrderListDto[]>([]);
  const [tickets, setTickets] = useState<TicketListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");

  // Modals & Submissions
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [activityModalType, setActivityModalType] = useState<string>("Call");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("All");
  const [activitySearch, setActivitySearch] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Note inline state
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNotePinned, setQuickNotePinned] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!(activeTenant && customerId)) {
      return;
    }
    try {
      const [custRes, empRes, dealsRes, quotesRes, ordersRes, ticketsRes] =
        await Promise.allSettled([
          ApiClient.getCustomerById(customerId, activeTenant.id),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
          ApiClient.getDeals({ customerId }, activeTenant.id),
          ApiClient.getQuotes({ customerId }, activeTenant.id),
          ApiClient.getOrders({ customerId }, activeTenant.id),
          ApiClient.getTickets({ customerId }, activeTenant.id),
        ]);

      if (
        custRes.status === "fulfilled" &&
        custRes.value.success &&
        custRes.value.data
      ) {
        setCustomer(custRes.value.data);
      } else {
        showToast("Müşteri bulunamadı.");
        router.push(`/${tenantSlug}/customers`);
      }

      if (
        empRes.status === "fulfilled" &&
        empRes.value.success &&
        empRes.value.data
      ) {
        setEmployees(empRes.value.data.items);
      }

      if (
        dealsRes.status === "fulfilled" &&
        dealsRes.value.success &&
        dealsRes.value.data?.items
      ) {
        setDeals(dealsRes.value.data.items);
      }

      if (
        quotesRes.status === "fulfilled" &&
        quotesRes.value.success &&
        quotesRes.value.data?.items
      ) {
        setQuotes(quotesRes.value.data.items);
      }

      if (
        ordersRes.status === "fulfilled" &&
        ordersRes.value.success &&
        ordersRes.value.data?.items
      ) {
        setOrders(ordersRes.value.data.items);
      }

      if (
        ticketsRes.status === "fulfilled" &&
        ticketsRes.value.success &&
        ticketsRes.value.data?.items
      ) {
        setTickets(ticketsRes.value.data.items);
      }
    } catch {
      showToast("Müşteri bilgileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, customerId, tenantSlug, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && customer && quickNoteContent.trim())) {
      return;
    }

    setSubmittingNote(true);
    try {
      const res = await ApiClient.addCustomerNote(
        customer.id,
        {
          content: quickNoteContent.trim(),
          isPinned: quickNotePinned,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("Not başarıyla eklendi.");
        setQuickNoteContent("");
        setQuickNotePinned(false);
        loadData();
      }
    } catch {
      showToast("Not eklenirken hata oluştu.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleTogglePinNote = (note: CustomerNoteDto) => {
    if (!customer) {
      return;
    }
    const updatedNotes = customer.notes.map((n) =>
      n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
    );
    setCustomer({ ...customer, notes: updatedNotes });
    showToast(note.isPinned ? "İğne kaldırıldı." : "Not üste sabitlendi.");
  };

  const handleSaveEditNote = (noteId: string) => {
    if (!(customer && editingNoteContent.trim())) {
      return;
    }
    const updatedNotes = customer.notes.map((n) =>
      n.id === noteId ? { ...n, content: editingNoteContent.trim() } : n
    );
    setCustomer({ ...customer, notes: updatedNotes });
    setEditingNoteId(null);
    setEditingNoteContent("");
    showToast("Not güncellendi.");
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!(activeTenant && customer)) {
      return;
    }
    if (!confirm("Bu yetkili kişiyi silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const res = await ApiClient.deleteCustomerContact(
        customer.id,
        contactId,
        activeTenant.id
      );
      if (res.success) {
        showToast("Yetkili kişi silindi.");
        loadData();
      }
    } catch {
      showToast("Yetkili silinirken hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
            Müşteri detayları yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const tabs: { id: CustomerTab; label: string }[] = [
    { id: "overview", label: "Genel Bakış" },
    { id: "deals", label: `Fırsatlar (${deals.length})` },
    { id: "quotes", label: `Teklifler (${quotes.length})` },
    { id: "orders", label: `Siparişler (${orders.length})` },
    { id: "tickets", label: `Destek (${tickets.length})` },
    { id: "contacts", label: `Yetkililer (${customer.contacts.length})` },
    {
      id: "timeline",
      label: `Aktivite Geçmişi (${customer.activities.length})`,
    },
    { id: "notes", label: `Notlar (${customer.notes.length})` },
    { id: "finance", label: "Finans & Bakiye" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Lead":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Churned":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Standard":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Enterprise":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
    }
  };

  const sortedNotes = [...customer.notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalOrdersAmount = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0
  );
  const totalPaidAmount = orders
    .filter((o) => o.paymentStatus === "Paid")
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalPendingAmount = Math.max(0, totalOrdersAmount - totalPaidAmount);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fade-in fixed top-5 right-5 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:bg-white dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-2xs transition-all hover:bg-zinc-50 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
            href={`/${tenantSlug}/customers`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
                {customer.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(
                  customer.status
                )}`}
              >
                {customer.status}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 font-bold text-[10px] ${getTierBadge(
                  customer.tier
                )}`}
              >
                {customer.tier}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {customer.type === "Company"
                ? "Kurumsal Müşteri"
                : "Bireysel Müşteri"}{" "}
              • {customer.industry || "Sektör Belirtilmemiş"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setIsEditModalOpen(true)}
            type="button"
          >
            <Edit2 className="h-3.5 w-3.5 text-zinc-500" />
            <span>Düzenle</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
            onClick={() => setIsAddActivityModalOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>Aktivite Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. Main 360 View: Left Sidebar + Tabbed Canvas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Quick Info Cards */}
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
            <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              Temel İletişim Bilgileri
            </h3>
            <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
              {customer.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <a
                    className="truncate text-blue-600 hover:underline dark:text-blue-400"
                    href={`mailto:${customer.email}`}
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <a
                    className="truncate text-blue-600 hover:underline dark:text-blue-400"
                    href={customer.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {customer.website}
                  </a>
                </div>
              )}
              {customer.addressLine && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <span>
                    {customer.addressLine}, {customer.city}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Sales Rep Card */}
          <div className="space-y-2.5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
            <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              Sorumlu Satış Temsilcisi
            </h3>
            {customer.assignedEmployeeName ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-2xs">
                  {customer.assignedEmployeeName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    {customer.assignedEmployeeName}
                  </div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Hesap & Portföy Yöneticisi
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                Bu müşteriye henüz temsilci atanmadı.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tabbed Content Canvas */}
        <div className="space-y-4 lg:col-span-2">
          {/* Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
            {tabs.map((tab) => (
              <button
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold text-xs transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Toplam Ciro
                  </span>
                  <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    ₺
                    {(
                      customer.totalRevenue || totalOrdersAmount
                    ).toLocaleString("tr-TR")}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Fırsatlar
                  </span>
                  <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {deals.length} Adet
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Teklifler
                  </span>
                  <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {quotes.length} Adet
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Destek Talepleri
                  </span>
                  <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {tickets.length} Talep
                  </div>
                </div>
              </div>

              {/* Recent Activities Snapshot */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Son Müşteri Aktiviteleri
                  </h4>
                  <button
                    className="font-bold text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                    onClick={() => setActiveTab("timeline")}
                    type="button"
                  >
                    Tümünü Gör →
                  </button>
                </div>
                {customer.activities.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Henüz aktivite kaydı bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customer.activities.slice(0, 3).map((act) => (
                      <div
                        className="flex items-center justify-between rounded-xl bg-zinc-50/80 p-3 text-xs dark:bg-zinc-800/50"
                        key={act.id}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {act.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(act.performedAt).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEALS */}
          {activeTab === "deals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteri Satış Fırsatları & Huniler
                </h4>
                <Link
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                  href={`/${tenantSlug}/pipelines?create=true`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Fırsat</span>
                </Link>
              </div>

              {deals.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Bu müşteriye ait aktif fırsat bulunamadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {deals.map((deal) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition hover:border-zinc-300 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
                      key={deal.id}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {deal.title}
                          </span>
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {deal.stageName}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                          <span>
                            Sorumlu: {deal.assignedUserName || "Atanmadı"}
                          </span>
                          <span>Durum: {deal.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          ₺{(deal.value || 0).toLocaleString("tr-TR")}
                        </div>
                        <Link
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          href={`/${tenantSlug}/pipelines?dealId=${deal.id}`}
                        >
                          <span>İncele</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUOTES */}
          {activeTab === "quotes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteri Teklif Geçmişi
                </h4>
                <Link
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                  href={`/${tenantSlug}/quotes`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Teklif Hazırla</span>
                </Link>
              </div>

              {quotes.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Bu müşteriye henüz teklif oluşturulmadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {quotes.map((quote) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition hover:border-zinc-300 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
                      key={quote.id}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {quote.quoteNumber} - {quote.title}
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {quote.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                          <span>Revizyon: v{quote.revisionNumber}</span>
                          <span>
                            Tarih:{" "}
                            {new Date(quote.createdAt).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          ₺{(quote.totalAmount || 0).toLocaleString("tr-TR")}
                        </div>
                        <Link
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          href={`/${tenantSlug}/quotes`}
                        >
                          <span>Görüntüle</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteri Siparişleri & Satışlar
                </h4>
                <Link
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                  href={`/${tenantSlug}/orders`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Sipariş</span>
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Bu müşteriye ait kayıtlı sipariş bulunamadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((order) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition hover:border-zinc-300 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
                      key={order.id}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {order.orderNumber}
                          </span>
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-semibold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {order.status}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${
                              order.paymentStatus === "Paid"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {order.paymentStatus === "Paid"
                              ? "Ödendi"
                              : "Beklemede"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                          <span>{order.itemsCount} Kalem Ürün</span>
                          <span>
                            Tarih:{" "}
                            {new Date(order.createdAt).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          ₺{(order.totalAmount || 0).toLocaleString("tr-TR")}
                        </div>
                        <Link
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          href={`/${tenantSlug}/orders/${order.id}`}
                        >
                          <span>Detay</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TICKETS */}
          {activeTab === "tickets" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Destek & Helpdesk Talepleri
                </h4>
                <Link
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                  href={`/${tenantSlug}/tickets`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Destek Talebi Aç</span>
                </Link>
              </div>

              {tickets.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Bu müşteriye ait destek talebi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tickets.map((ticket) => (
                    <div
                      className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition hover:border-zinc-300 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
                      key={ticket.id}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {ticket.ticketNumber}: {ticket.subject}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${
                              ticket.priority === "Urgent"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : ticket.priority === "High"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {ticket.priority}
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {ticket.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                          <span>Kategori: {ticket.category}</span>
                          <span>Mesaj: {ticket.messageCount}</span>
                          {ticket.isSlaBreached && (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              SLA İhlali
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Link
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 font-semibold text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          href={`/${tenantSlug}/tickets/${ticket.id}`}
                        >
                          <span>Talep Detayı</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Kayıtlı Şirket Yetkilileri
                </h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                  onClick={() => setIsAddContactModalOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yetkili Ekle</span>
                </button>
              </div>

              {customer.contacts.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Henüz yetkili kişi kaydedilmedi.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {customer.contacts.map((contact) => (
                    <div
                      className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                      key={contact.id}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {contact.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              {contact.title || "Yetkili"}
                            </div>
                          </div>
                          {contact.isPrimary && (
                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-bold text-[9px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              Birincil
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end border-zinc-100 border-t pt-2 dark:border-zinc-800">
                        <button
                          className="text-[11px] text-rose-600 hover:underline dark:text-rose-400"
                          onClick={() => handleDeleteContact(contact.id)}
                          type="button"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMELINE & TOUCHPOINTS */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {/* 1. Quick Touchpoint Actions Bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  className="group flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/80 hover:shadow-xs active:scale-[0.98] dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                  onClick={() => {
                    setActivityModalType("Call");
                    setIsAddActivityModalOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs transition group-hover:scale-105">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-emerald-900 text-xs dark:text-emerald-200">
                      Telefon Görüşmesi
                    </span>
                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                      Arama kaydı ekle
                    </span>
                  </div>
                </button>

                <button
                  className="group flex items-center gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-3.5 text-left transition-all hover:border-violet-300 hover:bg-violet-50/80 hover:shadow-xs active:scale-[0.98] dark:border-violet-900/60 dark:bg-violet-950/20 dark:hover:bg-violet-950/40"
                  onClick={() => {
                    setActivityModalType("Meeting");
                    setIsAddActivityModalOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-2xs transition group-hover:scale-105">
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-violet-900 text-xs dark:text-violet-200">
                      Toplantı / Ziyaret
                    </span>
                    <span className="text-[10px] text-violet-700/80 dark:text-violet-400">
                      Görüşme notu ekle
                    </span>
                  </div>
                </button>

                <button
                  className="group flex items-center gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 text-left transition-all hover:border-blue-300 hover:bg-blue-50/80 hover:shadow-xs active:scale-[0.98] dark:border-blue-900/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
                  onClick={() => {
                    setActivityModalType("Email");
                    setIsAddActivityModalOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs transition group-hover:scale-105">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-blue-900 text-xs dark:text-blue-200">
                      E-Posta İletişimi
                    </span>
                    <span className="text-[10px] text-blue-700/80 dark:text-blue-400">
                      Yazışma kaydı düş
                    </span>
                  </div>
                </button>

                <button
                  className="group flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 text-left transition-all hover:border-amber-300 hover:bg-amber-50/80 hover:shadow-xs active:scale-[0.98] dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                  onClick={() => {
                    setActivityModalType("Note");
                    setIsAddActivityModalOpen(true);
                  }}
                  type="button"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-2xs transition group-hover:scale-105">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-amber-900 text-xs dark:text-amber-200">
                      Önemli Not
                    </span>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-400">
                      Müşteri notu ekle
                    </span>
                  </div>
                </button>
              </div>

              {/* 2. Filters & Search Bar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
                {/* Search Input */}
                <div className="max-w-xs flex-1">
                  <Input
                    leftIcon={<Search />}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Aktivitelerde ara..."
                    value={activitySearch}
                  />
                </div>

                {/* Filter Pills */}
                <div className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    {
                      count: customer.activities.length,
                      key: "All",
                      label: "Tümü",
                    },
                    {
                      count: customer.activities.filter(
                        (a) => a.activityType === "Call"
                      ).length,
                      key: "Call",
                      label: "Aramalar",
                    },
                    {
                      count: customer.activities.filter(
                        (a) => a.activityType === "Meeting"
                      ).length,
                      key: "Meeting",
                      label: "Toplantılar",
                    },
                    {
                      count: customer.activities.filter(
                        (a) => a.activityType === "Email"
                      ).length,
                      key: "Email",
                      label: "E-Postalar",
                    },
                    {
                      count: customer.activities.filter(
                        (a) => a.activityType === "Note"
                      ).length,
                      key: "Note",
                      label: "Notlar",
                    },
                    {
                      count: customer.activities.filter(
                        (a) =>
                          a.activityType !== "Call" &&
                          a.activityType !== "Meeting" &&
                          a.activityType !== "Email" &&
                          a.activityType !== "Note"
                      ).length,
                      key: "System",
                      label: "Sistem",
                    },
                  ].map((tab) => {
                    const isSelected = activityTypeFilter === tab.key;
                    return (
                      <button
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 font-semibold text-xs transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        }`}
                        key={tab.key}
                        onClick={() => setActivityTypeFilter(tab.key)}
                        type="button"
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 font-bold text-[10px] ${
                            isSelected
                              ? "bg-blue-700/80 text-white"
                              : "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Connected Vertical Timeline */}
              {(() => {
                const filtered = customer.activities.filter((act) => {
                  if (activityTypeFilter !== "All") {
                    if (activityTypeFilter === "System") {
                      if (
                        act.activityType === "Call" ||
                        act.activityType === "Meeting" ||
                        act.activityType === "Email" ||
                        act.activityType === "Note"
                      ) {
                        return false;
                      }
                    } else if (act.activityType !== activityTypeFilter) {
                      return false;
                    }
                  }
                  if (activitySearch.trim()) {
                    const q = activitySearch.toLowerCase();
                    const matchTitle = act.title.toLowerCase().includes(q);
                    const matchDesc = act.description
                      ?.toLowerCase()
                      .includes(q);
                    if (!(matchTitle || matchDesc)) {
                      return false;
                    }
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 border-dashed bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <h4 className="mt-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        Aktivite Bulunamadı
                      </h4>
                      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                        {activitySearch || activityTypeFilter !== "All"
                          ? "Arama veya filtre kriterlerinize uygun aktivite bulunamadı."
                          : "Bu müşteriye ait henüz bir etkileşim kaydı girilmedi."}
                      </p>
                      <button
                        className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                        onClick={() => {
                          setActivityModalType("Call");
                          setIsAddActivityModalOpen(true);
                        }}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        <span>İlk Aktiviteyi Kaydet</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="relative pl-6 before:absolute before:top-3 before:bottom-3 before:left-[17px] before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    <div className="space-y-6">
                      {filtered.map((activity) => {
                        const isCall = activity.activityType === "Call";
                        const isMeeting = activity.activityType === "Meeting";
                        const isEmail = activity.activityType === "Email";
                        const isNote = activity.activityType === "Note";

                        const nodeBg = isCall
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : isMeeting
                            ? "bg-violet-500 text-white shadow-violet-500/20"
                            : isEmail
                              ? "bg-blue-500 text-white shadow-blue-500/20"
                              : isNote
                                ? "bg-amber-500 text-white shadow-amber-500/20"
                                : "bg-zinc-500 text-white shadow-zinc-500/20";

                        const badgeColor = isCall
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : isMeeting
                            ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800"
                            : isEmail
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                              : isNote
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                : "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700";

                        const badgeLabel = isCall
                          ? "Telefon Araması"
                          : isMeeting
                            ? "Toplantı"
                            : isEmail
                              ? "E-Posta"
                              : isNote
                                ? "Not"
                                : activity.activityType || "Sistem";

                        const dateObj = new Date(activity.performedAt);
                        const isToday =
                          new Date().toDateString() === dateObj.toDateString();

                        return (
                          <div
                            className="relative flex items-start gap-4"
                            key={activity.id}
                          >
                            {/* Timeline Node Icon */}
                            <div
                              className={`relative -left-6 z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-md ring-4 ring-white dark:ring-zinc-950 ${nodeBg}`}
                            >
                              {isCall ? (
                                <PhoneCall className="h-3.5 w-3.5" />
                              ) : isMeeting ? (
                                <Video className="h-3.5 w-3.5" />
                              ) : isEmail ? (
                                <Mail className="h-3.5 w-3.5" />
                              ) : isNote ? (
                                <FileText className="h-3.5 w-3.5" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                            </div>

                            {/* Timeline Content Card */}
                            <div className="-ml-3 flex-1 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-bold text-[10px] ${badgeColor}`}
                                  >
                                    {badgeLabel}
                                  </span>
                                  <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                    {activity.title}
                                  </h5>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {isToday
                                      ? `Bugün ${dateObj.toLocaleTimeString(
                                          "tr-TR",
                                          {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )}`
                                      : dateObj.toLocaleString("tr-TR", {
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                  </span>
                                </div>
                              </div>

                              {activity.description && (
                                <p className="mt-2 text-xs text-zinc-600 leading-relaxed dark:text-zinc-300">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 8: NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Add Note Card */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <h4 className="mb-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Özel Müşteri Notu Ekle
                </h4>
                <form onSubmit={handleAddNote}>
                  <textarea
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
                    onChange={(e) => setQuickNoteContent(e.target.value)}
                    placeholder="Müşteri hakkında ekip içi notlarınızı buraya yazın..."
                    rows={3}
                    value={quickNoteContent}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <input
                        checked={quickNotePinned}
                        className="rounded text-blue-600 focus:ring-blue-500"
                        onChange={(e) => setQuickNotePinned(e.target.checked)}
                        type="checkbox"
                      />
                      <Pin className="h-3 w-3 text-amber-500" />
                      <span>Üste İğnele</span>
                    </label>

                    <button
                      className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                      disabled={!quickNoteContent.trim() || submittingNote}
                      type="submit"
                    >
                      <Send className="h-3 w-3" />
                      <span>
                        {submittingNote ? "Kaydediliyor..." : "Notu Kaydet"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes List with Pin Highlight & In-Place Editing */}
              {customer.notes.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Henüz not eklenmedi.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedNotes.map((note) => (
                    <div
                      className={`group relative rounded-xl border p-4 text-xs transition-all ${
                        note.isPinned
                          ? "border-amber-200 bg-amber-50/40 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20"
                          : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      }`}
                      key={note.id}
                    >
                      <div className="mb-2 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                        <div className="flex items-center gap-2">
                          {note.isPinned && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 font-bold text-[9px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Pin className="h-2.5 w-2.5" />
                              İğneli Not
                            </span>
                          )}
                          <span className="font-medium">
                            {new Date(note.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            onClick={() => handleTogglePinNote(note)}
                            title={
                              note.isPinned ? "İğneyi Kaldır" : "Üste İğnele"
                            }
                            type="button"
                          >
                            {note.isPinned ? (
                              <PinOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteContent(note.content);
                            }}
                            title="Notu Düzenle"
                            type="button"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                            rows={3}
                            value={editingNoteContent}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="rounded-lg px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              onClick={() => setEditingNoteId(null)}
                              type="button"
                            >
                              İptal
                            </button>
                            <button
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 font-semibold text-[11px] text-white hover:bg-blue-700"
                              onClick={() => handleSaveEditNote(note.id)}
                              type="button"
                            >
                              <Check className="h-3 w-3" />
                              <span>Kaydet</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-zinc-800 leading-relaxed dark:text-zinc-200">
                          {note.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: FINANCE */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/90 dark:bg-zinc-900/90">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteri Finansal Özeti & Bakiye
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Toplam Sipariş Tutarı
                    </span>
                    <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      ₺
                      {totalOrdersAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Tahsil Edilen (Ödenen)
                    </span>
                    <div className="mt-1 font-bold text-emerald-600 text-lg dark:text-emerald-400">
                      ₺
                      {totalPaidAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Bekleyen Bakiye
                    </span>
                    <div
                      className={`mt-1 font-bold text-lg ${
                        totalPendingAmount > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      ₺
                      {totalPendingAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <AddContactModal
          customerId={customer.id}
          isOpen={isAddContactModalOpen}
          onClose={() => setIsAddContactModalOpen(false)}
          onSuccess={() => {
            showToast("Yetkili kişi başarıyla eklendi.");
            setIsAddContactModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Add Activity Modal */}
      {isAddActivityModalOpen && (
        <AddActivityModal
          customerId={customer.id}
          initialType={activityModalType}
          isOpen={isAddActivityModalOpen}
          onClose={() => setIsAddActivityModalOpen(false)}
          onSuccess={() => {
            showToast("Aktivite başarıyla kaydedildi.");
            setIsAddActivityModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <EditCustomerModal
          customer={customer}
          employees={employees}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            showToast("Müşteri bilgileri güncellendi.");
            setIsEditModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}
    </div>
  );
}

function AddContactModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customerId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customerId: string;
}) {
  const [formData, setFormData] = useState<AddCustomerContactRequest>({
    department: "",
    email: "",
    firstName: "",
    isPrimary: false,
    lastName: "",
    mobile: "",
    notes: "",
    phone: "",
    title: "",
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(formData.firstName.trim() && formData.lastName.trim())) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.addCustomerContact(
        customerId,
        formData,
        tenantId
      );
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Yetkili / İlgili Kişi Ekle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Ad *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
                type="text"
                value={formData.firstName}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Soyad *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
                type="text"
                value={formData.lastName}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Ünvan / Pozisyon
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Örn: Satın Alma Müdürü"
              type="text"
              value={formData.title}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              E-Posta
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="yetkili@sirket.com"
              type="email"
              value={formData.email}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Telefon
            </label>
            <PhoneInput
              onChange={(val) => setFormData({ ...formData, phone: val })}
              placeholder="+90 (5XX) XXX XX XX"
              value={formData.phone || ""}
            />
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 pt-1 text-zinc-700 dark:text-zinc-300">
            <input
              checked={formData.isPrimary}
              className="rounded text-blue-600 focus:ring-blue-500"
              onChange={(e) =>
                setFormData({ ...formData, isPrimary: e.target.checked })
              }
              type="checkbox"
            />
            <span className="font-semibold">
              Bu şirketin birincil yetkilisi olarak ayarla
            </span>
          </label>

          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Yetkiliyi Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddActivityModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customerId,
  initialType = "Call",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customerId: string;
  initialType?: string;
}) {
  const [formData, setFormData] = useState({
    activityDate: new Date().toISOString().split("T")[0],
    activityTime: "14:00",
    description: "",
    subject: "",
    type: initialType || "Call",
  });

  useEffect(() => {
    if (initialType) {
      setFormData((prev) => ({ ...prev, type: initialType }));
    }
  }, [initialType]);

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const combinedDateTime = new Date(
        `${formData.activityDate}T${formData.activityTime}:00`
      ).toISOString();

      const payload: AddCustomerActivityRequest = {
        activityType: formData.type,
        description: formData.description.trim() || undefined,
        performedAt: combinedDateTime,
        title: formData.subject.trim(),
      };

      const res = await ApiClient.addCustomerActivity(
        customerId,
        payload,
        tenantId
      );
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Yeni Müşteri Aktivitesi Ekle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-1" required>
              Aktivite Türü
            </Label>
            <Select
              onValueChange={(val) => setFormData({ ...formData, type: val })}
              value={formData.type}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Call">Telefon Araması</SelectItem>
                <SelectItem value="Meeting">Toplantı / Görüşme</SelectItem>
                <SelectItem value="Email">E-Posta İletişimi</SelectItem>
                <SelectItem value="Note">Not / Bilgilendirme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1" required>
              Konu / Başlık
            </Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Örn: Yıllık Sözleşme Yenileme Görüşmesi"
              required
              value={formData.subject}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1" required>
                Tarih
              </Label>
              <DatePicker
                onChange={(val) =>
                  setFormData({ ...formData, activityDate: val })
                }
                placeholder="Tarih seçin"
                value={formData.activityDate}
              />
            </div>
            <div>
              <Label className="mb-1" required>
                Saat
              </Label>
              <TimePicker
                onChange={(val) =>
                  setFormData({ ...formData, activityTime: val })
                }
                value={formData.activityTime}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Açıklama & Detaylar
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Görüşülen maddeler ve kararlar..."
              rows={3}
              value={formData.description}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Aktiviteyi Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCustomerModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  employees,
}: {
  customer: CustomerDetailDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  employees: EmployeeDto[];
}) {
  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    addressLine: customer.addressLine || "",
    assignedEmployeeId: customer.assignedEmployeeId || undefined,
    city: customer.city || "",
    country: customer.country || "",
    email: customer.email || "",
    industry: customer.industry || "",
    name: customer.name || "",
    phone: customer.phone || "",
    postalCode: customer.postalCode || "",
    state: customer.state || "",
    status: customer.status || "Active",
    tags: customer.tags || [],
    taxNumber: customer.taxNumber || "",
    taxOffice: customer.taxOffice || "",
    tier: customer.tier || "Standard",
    type: customer.type || "Company",
    website: customer.website || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.updateCustomer(
        customer.id,
        formData,
        tenantId
      );
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Müşteri Bilgilerini Düzenle
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Müşteri Adı *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              type="text"
              value={formData.name || ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1">Müşteri Türü</Label>
              <Select
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                value={formData.type}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company">Kurumsal Şirket</SelectItem>
                  <SelectItem value="Individual">Bireysel Müşteri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Segment (Tier)</Label>
              <Select
                onValueChange={(val) => setFormData({ ...formData, tier: val })}
                value={formData.tier}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1">E-Posta</Label>
              <Input
                leftIcon={<Mail />}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                type="email"
                value={formData.email || ""}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Telefon
              </label>
              <PhoneInput
                onChange={(val) => setFormData({ ...formData, phone: val })}
                value={formData.phone || ""}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Sorumlu Satış Temsilcisi
            </label>
            <SalesRepPicker
              employees={employees}
              onAddNew={() => setIsQuickAddOpen(true)}
              onChange={(empId) =>
                setFormData({
                  ...formData,
                  assignedEmployeeId: empId || undefined,
                })
              }
              value={formData.assignedEmployeeId}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3.5 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>

        <QuickAddSalesRepModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSuccess={(emp) => {
            setFormData({ ...formData, assignedEmployeeId: emp.id });
            setIsQuickAddOpen(false);
          }}
          tenantId={tenantId}
        />
      </div>
    </div>
  );
}
