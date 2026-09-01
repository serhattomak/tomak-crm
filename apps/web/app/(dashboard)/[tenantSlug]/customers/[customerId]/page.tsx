"use client";

import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  DollarSign,
  Edit,
  Edit2,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Pin,
  PinOff,
  Plus,
  Send,
  TrendingUp,
  User,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { PhoneInput } from "@/components/phone-input";
import { QuickAddSalesRepModal } from "@/components/quick-add-sales-rep-modal";
import {
  type AddCustomerActivityRequest,
  type AddCustomerContactRequest,
  ApiClient,
  type CustomerDetailDto,
  type CustomerNoteDto,
  type EmployeeDto,
  type UpdateCustomerRequest,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const customerId = (params?.customerId as string) || "";
  const { activeTenant } = usePermissions();

  const [customer, setCustomer] = useState<CustomerDetailDto | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "contacts" | "timeline" | "deals" | "notes" | "finance"
  >("overview");

  // Modals & Submissions
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
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
      const [custRes, empRes] = await Promise.all([
        ApiClient.getCustomerById(customerId, activeTenant.id),
        ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
      ]);

      if (custRes.success && custRes.data) {
        setCustomer(custRes.data);
      } else {
        showToast("Müşteri bulunamadı.");
        router.push(`/${tenantSlug}/customers`);
      }

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
    } catch {
      showToast("Müşteri bilgileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, customerId, tenantSlug, router]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!(activeTenant && customerId)) {
        return;
      }
      try {
        const [custRes, empRes] = await Promise.all([
          ApiClient.getCustomerById(customerId, activeTenant.id),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
        ]);

        if (!ignore) {
          if (custRes.success && custRes.data) {
            setCustomer(custRes.data);
          } else {
            showToast("Müşteri bulunamadı.");
            router.push(`/${tenantSlug}/customers`);
          }

          if (empRes.success && empRes.data) {
            setEmployees(empRes.data.items);
          }
        }
      } catch {
        if (!ignore) {
          showToast("Müşteri bilgileri yüklenirken hata oluştu.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      ignore = true;
    };
  }, [activeTenant, customerId, tenantSlug, router]);

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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
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

  const tabs = [
    { id: "overview", label: "Genel Bakış" },
    { id: "contacts", label: `Yetkililer (${customer.contacts.length})` },
    {
      id: "timeline",
      label: `Aktivite Geçmişi (${customer.activities.length})`,
    },
    { id: "deals", label: `Satış Fırsatları (${customer.dealsCount})` },
    { id: "notes", label: `Notlar (${customer.notes.length})` },
    { id: "finance", label: "Finans & Siparişler" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Lead":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Passive":
        return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
      case "Churned":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Enterprise":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "SME":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "Call":
        return (
          <PhoneCall className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        );
      case "Meeting":
        return (
          <Video className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        );
      case "Email":
        return (
          <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        );
      case "DealCreated":
        return (
          <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        );
      case "StatusChange":
        return (
          <TrendingUp className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
        );
      default:
        return (
          <FileText className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
        );
    }
  };

  // Sort notes: pinned notes first
  const sortedNotes = [...customer.notes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return 0;
    }
    return a.isPinned ? -1 : 1;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col justify-between gap-4 border-zinc-100 border-b pb-4 sm:flex-row sm:items-center dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            href={`/${tenantSlug}/customers`}
            title="Müşteri Listesine Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold text-base shadow-xs ${
                customer.type === "Company"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
              }`}
            >
              {customer.type === "Company" ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl text-zinc-900 tracking-tight sm:text-2xl dark:text-zinc-100">
                  {customer.name}
                </h1>
                <span
                  className={`rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getStatusBadge(
                    customer.status
                  )}`}
                >
                  {customer.status}
                </span>
                <span
                  className={`rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getTierBadge(
                    customer.tier
                  )}`}
                >
                  {customer.tier}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {customer.type === "Company"
                    ? "Kurumsal Şirket"
                    : "Bireysel Müşteri"}
                </span>
                {customer.industry && (
                  <>
                    <span>•</span>
                    <span>{customer.industry}</span>
                  </>
                )}
                {customer.city && (
                  <>
                    <span>•</span>
                    <span>
                      {customer.city}, {customer.country || "TR"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={() => setIsEditModalOpen(true)}
            type="button"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Düzenle</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98]"
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
                    className="truncate text-violet-600 hover:underline dark:text-violet-400"
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
                    className="truncate text-violet-600 hover:underline dark:text-violet-400"
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 font-bold text-white text-xs">
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
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "overview"
                      | "contacts"
                      | "timeline"
                      | "deals"
                      | "notes"
                      | "finance"
                  )
                }
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Toplam Ciro
                  </span>
                  <div className="mt-1 font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Aktif Fırsatlar
                  </span>
                  <div className="mt-1 font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    {customer.dealsCount} Anlaşma
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Kayıtlı Yetkili
                  </span>
                  <div className="mt-1 font-bold text-xl text-zinc-900 dark:text-zinc-100">
                    {customer.contacts.length} Kişi
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Kayıtlı Şirket Yetkilileri
                </h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 active:scale-95"
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
                            <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-bold text-[9px] text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
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

          {/* TAB 3: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  İletişim & Aktivite Zaman Tüneli
                </h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 active:scale-95"
                  onClick={() => setIsAddActivityModalOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Aktivite Kaydet</span>
                </button>
              </div>

              {customer.activities.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 border-dashed bg-white p-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                  Henüz kaydedilmiş aktivite yok.
                </div>
              ) : (
                <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {customer.activities.map((act) => (
                    <div
                      className="relative flex items-start gap-3 text-xs"
                      key={act.id}
                    >
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-2xs ring-2 ring-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-zinc-800">
                        {getActivityIcon(act.activityType)}
                      </div>

                      <div className="flex-1 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {act.title}
                          </span>
                          <span className="font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            {new Date(act.performedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600 leading-relaxed dark:text-zinc-300">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DEALS */}
          {activeTab === "deals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteriyle Yürütülen Fırsatlar
                </h4>
                <Link
                  className="flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 active:scale-95"
                  href={`/${tenantSlug}/pipelines`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Fırsat Başlat</span>
                </Link>
              </div>

              <div className="space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <Briefcase className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Aktif Pipeline Fırsatları
                </h5>
                <p className="mx-auto max-w-sm text-[11px] text-zinc-500 dark:text-zinc-400">
                  Bu müşteriye ait toplam {customer.dealsCount} adet anlaşma
                  kaydedilmiştir.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: NOTES (With Pin / Unpin & Edit Support) */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Add Note Card */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <h4 className="mb-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Özel Müşteri Notu Ekle
                </h4>
                <form onSubmit={handleAddNote}>
                  <textarea
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
                    onChange={(e) => setQuickNoteContent(e.target.value)}
                    placeholder="Müşteri hakkında ekip içi notlarınızı buraya yazın..."
                    rows={3}
                    value={quickNoteContent}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <input
                        checked={quickNotePinned}
                        className="rounded text-violet-600 focus:ring-violet-500"
                        onChange={(e) => setQuickNotePinned(e.target.checked)}
                        type="checkbox"
                      />
                      <Pin className="h-3 w-3 text-amber-500" />
                      <span>Üste İğnele</span>
                    </label>

                    <button
                      className="flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-violet-700 active:scale-95 disabled:opacity-50"
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
                            className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 font-semibold text-[11px] text-white hover:bg-violet-700"
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

          {/* TAB 6: FINANCE */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/90 dark:bg-zinc-900/90">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Müşteri Finansal Özeti
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Toplam Faturalanan
                    </span>
                    <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Ödenen Tutar
                    </span>
                    <div className="mt-1 font-bold text-emerald-600 text-lg dark:text-emerald-400">
                      ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                    <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                      Açık Bakiye
                    </span>
                    <div className="mt-1 font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      ₺0,00
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

      {/* Add Activity Modal (With Past / Manual Date-Time Support) */}
      {isAddActivityModalOpen && (
        <AddActivityModal
          customerId={customer.id}
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
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              Telefon (Doğrulama & Maske)
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
              className="rounded text-violet-600 focus:ring-violet-500"
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
              className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50"
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customerId: string;
}) {
  const [formData, setFormData] = useState<AddCustomerActivityRequest>({
    activityType: "Call",
    description: "",
    title: "",
  });

  // Custom date and time entry support (e.g. yesterday, today, custom date)
  const [customDate, setCustomDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const setShortcutDate = (type: "today" | "yesterday") => {
    const d = new Date();
    if (type === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    setCustomDate(d.toISOString().split("T")[0]!);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const combinedDateTime = `${customDate}T${customTime}:00Z`;
      const payload = {
        ...formData,
        performedAt: combinedDateTime,
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
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Aktivite / İletişim Kaydet
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Gerçekleşen görüşme, arama veya toplantıyı işleyin
            </p>
          </div>
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
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Aktivite Türü
            </label>
            <select
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, activityType: e.target.value })
              }
              value={formData.activityType}
            >
              <option value="Call">Telefon Görüşmesi</option>
              <option value="Meeting">Toplantı & Demo</option>
              <option value="Email">E-Posta İletişimi</option>
              <option value="Note">Bilgi / Not</option>
            </select>
          </div>

          {/* Date & Time Picker with Quick Date Pills */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                Görüşme Tarihi ve Saati
              </label>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  onClick={() => setShortcutDate("today")}
                  type="button"
                >
                  Bugün
                </button>
                <button
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  onClick={() => setShortcutDate("yesterday")}
                  type="button"
                >
                  Dün
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setCustomDate(e.target.value)}
                required
                type="date"
                value={customDate}
              />
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) => setCustomTime(e.target.value)}
                required
                type="time"
                value={customTime}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Başlık *
            </label>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Örn: Fiyat teklifi ve lisanslama üzerine görüşüldü"
              required
              type="text"
              value={formData.title}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Detaylar & Sonuç
            </label>
            <textarea
              className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Görüşülen konular ve bir sonraki aksiyon adımları..."
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
              className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-violet-700 active:scale-95 disabled:opacity-50"
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
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customer,
  employees: initialEmployees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customer: CustomerDetailDto;
  employees: EmployeeDto[];
}) {
  const [employeesList, setEmployeesList] =
    useState<EmployeeDto[]>(initialEmployees);
  const [isAddSalesRepOpen, setIsAddSalesRepOpen] = useState(false);

  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    addressLine: customer.addressLine || "",
    assignedEmployeeId: customer.assignedEmployeeId || "",
    city: customer.city || "",
    email: customer.email || "",
    industry: customer.industry || "",
    name: customer.name,
    phone: customer.phone || "",
    status: customer.status,
    taxNumber: customer.taxNumber || "",
    taxOffice: customer.taxOffice || "",
    tier: customer.tier,
    type: customer.type,
    website: customer.website || "",
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanData: UpdateCustomerRequest = {
        addressLine: formData.addressLine?.trim() || undefined,
        assignedEmployeeId: formData.assignedEmployeeId
          ? formData.assignedEmployeeId
          : undefined,
        city: formData.city?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        name: formData.name.trim(),
        phone: formData.phone?.trim() || undefined,
        status: formData.status,
        taxNumber: formData.taxNumber?.trim() || undefined,
        taxOffice: formData.taxOffice?.trim() || undefined,
        tier: formData.tier,
        type: formData.type,
        website: formData.website?.trim() || undefined,
      };

      const res = await ApiClient.updateCustomer(
        customer.id,
        cleanData,
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
    <>
      <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
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

          <form
            className="flex-1 space-y-3.5 overflow-y-auto pr-1 text-xs"
            onSubmit={handleSubmit}
          >
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Müşteri / Şirket Adı *
              </label>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                type="text"
                value={formData.name}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  E-Posta
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Statü
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  value={formData.status}
                >
                  <option value="Lead">Potansiyel (Lead)</option>
                  <option value="Active">Aktif</option>
                  <option value="Passive">Pasif</option>
                  <option value="Churned">Kaybedildi</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Segment / Seviye
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, tier: e.target.value })
                  }
                  value={formData.tier}
                >
                  <option value="Standard">Standart</option>
                  <option value="VIP">VIP</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="SME">KOBİ (SME)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Sorumlu Satış Temsilcisi
              </label>
              <SalesRepPicker
                employees={employeesList}
                onAddNew={() => setIsAddSalesRepOpen(true)}
                onChange={(empId) =>
                  setFormData({
                    ...formData,
                    assignedEmployeeId: empId,
                  })
                }
                placeholder="Temsilci arayın veya seçin..."
                value={formData.assignedEmployeeId}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Şehir
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  type="text"
                  value={formData.city}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Web Sitesi
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://..."
                  type="url"
                  value={formData.website}
                />
              </div>
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
                className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-violet-700 active:scale-95 disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Add Sales Rep Modal */}
      {isAddSalesRepOpen && (
        <QuickAddSalesRepModal
          isOpen={isAddSalesRepOpen}
          onClose={() => setIsAddSalesRepOpen(false)}
          onSuccess={(newEmp) => {
            setEmployeesList((prev) => [...prev, newEmp]);
            setFormData((prev) => ({ ...prev, assignedEmployeeId: newEmp.id }));
          }}
          tenantId={tenantId}
        />
      )}
    </>
  );
}
