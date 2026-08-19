"use client";

import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Pin,
  Plus,
  Send,
  Shield,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type AddCustomerActivityRequest,
  type AddCustomerContactRequest,
  type CustomerDetailDto,
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant || !customerId) return;
    setLoading(true);
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
    loadData();
  }, [loadData]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !customer || !quickNoteContent.trim()) return;

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

  const handleDeleteContact = async (contactId: string) => {
    if (!activeTenant || !customer) return;
    try {
      const res = await ApiClient.deleteCustomerContact(customer.id, contactId, activeTenant.id);
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
      <div className="flex h-96 items-center justify-center rounded-3xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <span className="text-xs text-slate-500 font-medium">Müşteri detayları yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const tabs = [
    { id: "overview", label: "Genel Bakış" },
    { id: "contacts", label: `Yetkililer (${customer.contacts.length})` },
    { id: "timeline", label: `Aktivite Geçmişi (${customer.activities.length})` },
    { id: "deals", label: `Satış Fırsatları (${customer.dealsCount})` },
    { id: "notes", label: `Notlar (${customer.notes.length})` },
    { id: "finance", label: "Finans & Siparişler" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lead":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Passive":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "Churned":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Enterprise":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SME":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <PhoneCall className="h-3.5 w-3.5 text-blue-600" />;
      case "Meeting":
        return <Video className="h-3.5 w-3.5 text-violet-600" />;
      case "Email":
        return <Mail className="h-3.5 w-3.5 text-emerald-600" />;
      case "DealCreated":
        return <DollarSign className="h-3.5 w-3.5 text-amber-600" />;
      case "StatusChange":
        return <TrendingUp className="h-3.5 w-3.5 text-rose-600" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white text-xs shadow-2xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col justify-between gap-4 border-slate-100 border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
            href={`/${tenantSlug}/customers`}
            title="Müşteri Listesine Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold text-base shadow-xs ${
                customer.type === "Company"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-blue-100 text-blue-700"
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
                <h1 className="font-extrabold text-xl text-slate-900 tracking-tight sm:text-2xl">
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
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <span>{customer.type === "Company" ? "Kurumsal Şirket" : "Bireysel Müşteri"}</span>
                {customer.industry && (
                  <>
                    <span>•</span>
                    <span>{customer.industry}</span>
                  </>
                )}
                {customer.city && (
                  <>
                    <span>•</span>
                    <span>{customer.city}, {customer.country || "TR"}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <a
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition-colors"
              href={`tel:${customer.phone}`}
            >
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              <span>Ara</span>
            </a>
          )}

          {customer.email && (
            <a
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition-colors"
              href={`mailto:${customer.email}`}
            >
              <Mail className="h-3.5 w-3.5 text-violet-600" />
              <span>E-Posta</span>
            </a>
          )}

          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs shadow-2xs hover:bg-slate-50 transition-colors"
            onClick={() => setIsAddActivityModalOpen(true)}
            type="button"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Aktivite Ekle</span>
          </button>

          <PermissionGate permission="Customers.Update">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-semibold text-white text-xs shadow-xs hover:bg-slate-800 transition-colors"
              onClick={() => setIsEditModalOpen(true)}
              type="button"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Düzenle</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. Main Content Grid (Left Summary Sidebar + Right Tabbed Panes) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Customer Profile & Details (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card: Key Metrics */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs mb-3">Finans & İş Hacmi</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <span className="text-[11px] text-slate-500 font-medium">Toplam Ciro</span>
                <div className="font-extrabold text-base text-slate-900 mt-1">
                  ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <span className="text-[11px] text-slate-500 font-medium">Fırsatlar</span>
                <div className="font-extrabold text-base text-slate-900 mt-1">
                  {customer.dealsCount} Anlaşma
                </div>
              </div>
            </div>
          </div>

          {/* Card: Contact Info & Address */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs">İletişim & Adres Bilgileri</h3>

            <div className="space-y-3 text-xs">
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Telefon</span>
                    <div className="font-semibold text-slate-900">{customer.phone}</div>
                  </div>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">E-Posta</span>
                    <div className="font-semibold text-slate-900">{customer.email}</div>
                  </div>
                </div>
              )}

              {customer.website && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Web Sitesi</span>
                    <a
                      className="font-semibold text-violet-600 hover:underline block truncate"
                      href={customer.website.startsWith("http") ? customer.website : `https://${customer.website}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {customer.website}
                    </a>
                  </div>
                </div>
              )}

              {(customer.addressLine || customer.city) && (
                <div className="flex items-start gap-3 border-slate-100 border-t pt-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Adres</span>
                    <div className="font-medium text-slate-800 leading-snug">
                      {customer.addressLine && <span>{customer.addressLine}, </span>}
                      <span>{customer.city} {customer.state && `/ ${customer.state}`}</span>
                      {customer.country && <span className="block text-slate-500">{customer.country}</span>}
                    </div>
                  </div>
                </div>
              )}

              {(customer.taxOffice || customer.taxNumber) && (
                <div className="flex items-start gap-3 border-slate-100 border-t pt-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mt-0.5">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Vergi Bilgileri</span>
                    <div className="font-medium text-slate-800">
                      {customer.taxOffice && <div>Daire: {customer.taxOffice}</div>}
                      {customer.taxNumber && <div>No: {customer.taxNumber}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Assigned Representative */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-xs mb-3">Sorumlu Satış Temsilcisi</h3>
            {customer.assignedEmployeeName ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-bold text-sm text-white">
                  {customer.assignedEmployeeName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{customer.assignedEmployeeName}</div>
                  <div className="text-[10px] text-slate-500">Müşteri Yöneticisi</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 border-dashed p-4 text-center text-xs text-slate-500">
                Henüz atanmış bir temsilci yok.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tabbed 360 View (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100/90 p-1">
            {tabs.map((tab) => (
              <button
                className={`rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Note Form */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 mb-2">Hızlı Müşteri Notu Ekle</h4>
                <form onSubmit={handleAddNote}>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setQuickNoteContent(e.target.value)}
                    placeholder="Müşteri görüşmesi veya önemli bir hatırlatıcı notu yazın..."
                    rows={2}
                    value={quickNoteContent}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        checked={quickNotePinned}
                        className="rounded text-violet-600 focus:ring-violet-500"
                        onChange={(e) => setQuickNotePinned(e.target.checked)}
                        type="checkbox"
                      />
                      <Pin className="h-3 w-3" />
                      <span>Üste İğnele</span>
                    </label>

                    <button
                      className="flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-slate-800 disabled:opacity-50"
                      disabled={!quickNoteContent.trim() || submittingNote}
                      type="submit"
                    >
                      <Send className="h-3 w-3" />
                      <span>{submittingNote ? "Kaydediliyor..." : "Notu Kaydet"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Pinned Notes Summary */}
              {customer.notes.filter((n) => n.isPinned).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 text-amber-700">
                    <Pin className="h-3.5 w-3.5" />
                    <span>Önemli / İğnelenmiş Notlar</span>
                  </h4>
                  {customer.notes
                    .filter((n) => n.isPinned)
                    .map((note) => (
                      <div
                        className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-slate-800"
                        key={note.id}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <span className="mt-2 block text-[10px] text-amber-700 font-medium">
                          {new Date(note.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Recent Activity Timeline Preview */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-xs text-slate-900">Son Aktiviteler</h4>
                  <button
                    className="font-semibold text-violet-600 text-xs hover:underline"
                    onClick={() => setActiveTab("timeline")}
                    type="button"
                  >
                    Tümünü Gör →
                  </button>
                </div>

                {customer.activities.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Henüz aktivite kaydı yok.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.activities.slice(0, 4).map((act) => (
                      <div
                        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-xs"
                        key={act.id}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs">
                          {getActivityIcon(act.activityType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{act.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(act.performedAt).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          {act.description && (
                            <p className="mt-0.5 text-slate-600 text-[11px] leading-snug">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTS */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900">Yetkili & Karar Vericiler</h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-slate-800"
                  onClick={() => setIsAddContactModalOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yetkili Ekle</span>
                </button>
              </div>

              {customer.contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 border-dashed bg-white p-10 text-center">
                  <UserPlus className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="font-bold text-xs text-slate-800">Kayıtlı Yetkili Yok</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bu şirkete bağlı satın alma yöneticisi, CTO veya direktör ekleyin.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {customer.contacts.map((contact) => (
                    <div
                      className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300"
                      key={contact.id}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 font-bold text-xs text-violet-700">
                              {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <span>{contact.fullName}</span>
                                {contact.isPrimary && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] text-emerald-800 font-bold">
                                    Ana Yetkili
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{contact.title || "Yetkili"}</div>
                            </div>
                          </div>

                          <button
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1"
                            onClick={() => handleDeleteContact(contact.id)}
                            title="Yetkiliyi Sil"
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-3 space-y-1 text-xs border-slate-100 border-t pt-2 text-slate-600">
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.department && (
                            <div className="text-[10px] text-slate-400">
                              Birim: {contact.department}
                            </div>
                          )}
                        </div>
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
                <h4 className="font-bold text-xs text-slate-900">İletişim & Aktivite Zaman Tüneli</h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-slate-800"
                  onClick={() => setIsAddActivityModalOpen(true)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yeni Aktivite Kaydet</span>
                </button>
              </div>

              {customer.activities.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 border-dashed bg-white p-10 text-center text-xs text-slate-400">
                  Henüz kaydedilmiş aktivite yok.
                </div>
              ) : (
                <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-100">
                  {customer.activities.map((act) => (
                    <div className="relative flex items-start gap-3 text-xs" key={act.id}>
                      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white bg-white shadow-2xs ring-2 ring-slate-100">
                        {getActivityIcon(act.activityType)}
                      </div>

                      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{act.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(act.performedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {act.description && (
                          <p className="mt-1 text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
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
                <h4 className="font-bold text-xs text-slate-900">Müşteriyle Yürütülen Fırsatlar</h4>
                <button
                  className="flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 font-semibold text-white text-xs shadow-xs hover:bg-slate-800"
                  onClick={() => showToast("Yeni satış anlaşması oluşturma modalı açılıyor...")}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Fırsat Başlat</span>
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center space-y-2">
                <Briefcase className="h-8 w-8 text-slate-400 mx-auto" />
                <h5 className="font-bold text-xs text-slate-900">Aktif Pipeline Fırsatları</h5>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Bu müşteriye ait toplam {customer.dealsCount} adet anlaşma kaydedilmiştir.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 mb-2">Özel Müşteri Notu Ekle</h4>
                <form onSubmit={handleAddNote}>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                    onChange={(e) => setQuickNoteContent(e.target.value)}
                    placeholder="Müşteri hakkında ekip içi notlarınızı buraya yazın..."
                    rows={3}
                    value={quickNoteContent}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        checked={quickNotePinned}
                        className="rounded text-violet-600 focus:ring-violet-500"
                        onChange={(e) => setQuickNotePinned(e.target.checked)}
                        type="checkbox"
                      />
                      <Pin className="h-3 w-3" />
                      <span>Üste İğnele</span>
                    </label>

                    <button
                      className="flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-slate-800 disabled:opacity-50"
                      disabled={!quickNoteContent.trim() || submittingNote}
                      type="submit"
                    >
                      <Send className="h-3 w-3" />
                      <span>{submittingNote ? "Kaydediliyor..." : "Notu Kaydet"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {customer.notes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">Henüz not eklenmedi.</div>
              ) : (
                <div className="space-y-3">
                  {customer.notes.map((note) => (
                    <div
                      className={`rounded-2xl border p-4 text-xs transition-all ${
                        note.isPinned
                          ? "border-amber-200 bg-amber-50/40 shadow-xs"
                          : "border-slate-200/80 bg-white"
                      }`}
                      key={note.id}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          {note.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
                          {new Date(note.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINANCE */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4">
                <h4 className="font-bold text-xs text-slate-900">Müşteri Finansal Özeti</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <span className="text-[11px] text-slate-500 font-medium">Toplam Faturalanan</span>
                    <div className="font-extrabold text-lg text-slate-900 mt-1">
                      ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <span className="text-[11px] text-slate-500 font-medium">Ödenen Tutar</span>
                    <div className="font-extrabold text-lg text-emerald-600 mt-1">
                      ₺{customer.totalRevenue.toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <span className="text-[11px] text-slate-500 font-medium">Açık Bakiye</span>
                    <div className="font-extrabold text-lg text-slate-900 mt-1">₺0,00</div>
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
    firstName: "",
    lastName: "",
    title: "",
    department: "",
    email: "",
    phone: "",
    mobile: "",
    isPrimary: false,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    setSubmitting(true);
    try {
      const res = await ApiClient.addCustomerContact(customerId, formData, tenantId);
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-4 mb-4">
          <h3 className="font-bold text-base text-slate-900">Yeni Yetkili / İlgili Kişi Ekle</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Ad *</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                type="text"
                value={formData.firstName}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Soyad *</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                type="text"
                value={formData.lastName}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Ünvan / Pozisyon</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Örn: Satın Alma Müdürü"
              type="text"
              value={formData.title}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">E-Posta</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="yetkili@sirket.com"
              type="email"
              value={formData.email}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Telefon / Cep</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+90 532 ..."
              type="tel"
              value={formData.phone}
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              checked={formData.isPrimary}
              className="rounded text-violet-600 focus:ring-violet-500"
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              type="checkbox"
            />
            <span className="font-semibold text-slate-700">Bu şirketin birincil yetkilisi olarak ayarla</span>
          </label>

          <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-4 mt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
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
    title: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSubmitting(true);
    try {
      const res = await ApiClient.addCustomerActivity(customerId, formData, tenantId);
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-4 mb-4">
          <h3 className="font-bold text-base text-slate-900">Aktivite / İletişim Kaydet</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Aktivite Türü</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              value={formData.activityType}
            >
              <option value="Call">📞 Telefon Görüşmesi</option>
              <option value="Meeting">🤝 Toplantı & Demo</option>
              <option value="Email">✉️ E-Posta İletişimi</option>
              <option value="Note">📝 Bilgi / Not</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Başlık *</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Örn: Fiyat teklifi üzerine görüşüldü"
              required
              type="text"
              value={formData.title}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Detaylar & Sonuç</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Görüşülen konular ve sonraki adımlar..."
              rows={3}
              value={formData.description}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-4 mt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
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
  employees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  customer: CustomerDetailDto;
  employees: EmployeeDto[];
}) {
  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    type: customer.type,
    name: customer.name,
    email: customer.email || "",
    phone: customer.phone || "",
    website: customer.website || "",
    status: customer.status,
    tier: customer.tier,
    industry: customer.industry || "",
    taxOffice: customer.taxOffice || "",
    taxNumber: customer.taxNumber || "",
    city: customer.city || "",
    addressLine: customer.addressLine || "",
    assignedEmployeeId: customer.assignedEmployeeId || "",
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanData: UpdateCustomerRequest = {
        type: formData.type,
        name: formData.name.trim(),
        status: formData.status,
        tier: formData.tier,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        website: formData.website?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        taxOffice: formData.taxOffice?.trim() || undefined,
        taxNumber: formData.taxNumber?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        addressLine: formData.addressLine?.trim() || undefined,
        assignedEmployeeId: formData.assignedEmployeeId ? formData.assignedEmployeeId : undefined,
      };

      const res = await ApiClient.updateCustomer(customer.id, cleanData, tenantId);
      if (res.success) {
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-4 mb-4">
          <h3 className="font-bold text-base text-slate-900">Müşteri Bilgilerini Düzenle</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex-1 overflow-y-auto space-y-3 text-xs" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Müşteri / Şirket Adı *</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              type="text"
              value={formData.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Statü</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                value={formData.status}
              >
                <option value="Active">Aktif</option>
                <option value="Lead">Potansiyel (Lead)</option>
                <option value="Passive">Pasif</option>
                <option value="Churned">Kaybedildi</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Segment / Tier</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                value={formData.tier}
              >
                <option value="Standard">Standart</option>
                <option value="VIP">VIP</option>
                <option value="Enterprise">Enterprise</option>
                <option value="SME">KOBİ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Telefon</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                type="tel"
                value={formData.phone}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">E-Posta</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                type="email"
                value={formData.email}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Sorumlu Temsilci</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
              value={formData.assignedEmployeeId}
            >
              <option value="">Temsilci Seçin (Opsiyonel)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-slate-100 border-t pt-4 mt-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Güncelleniyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
