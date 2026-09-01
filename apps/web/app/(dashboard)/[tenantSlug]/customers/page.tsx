/* Hallmark · component: customers-list · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  Globe,
  LayoutGrid,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { PermissionGate } from "@/components/permission-gate";
import { PhoneInput } from "@/components/phone-input";
import { QuickAddSalesRepModal } from "@/components/quick-add-sales-rep-modal";
import {
  ApiClient,
  type CreateCustomerRequest,
  type CustomerListDto,
  type CustomerStatsDto,
  type EmployeeDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function CustomersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [stats, setStats] = useState<CustomerStatsDto | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page] = useState(1);
  const [pageSize] = useState(25);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals & Messages
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("create") === "true"
  );
  const [deletingCustomer, setDeletingCustomer] =
    useState<CustomerListDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    try {
      const [custRes, statsRes, empRes] = await Promise.all([
        ApiClient.getCustomers(activeTenant.id, {
          page,
          pageSize,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          tier: tierFilter || undefined,
          type: typeFilter || undefined,
        }),
        ApiClient.getCustomerStats(activeTenant.id),
        ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
      ]);

      if (custRes.success && custRes.data) {
        setCustomers(custRes.data.items);
        setTotalCount(custRes.data.totalCount);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
    } catch {
      showToast("Müşteri verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    page,
    pageSize,
    search,
    statusFilter,
    typeFilter,
    tierFilter,
  ]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      if (!activeTenant) {
        return;
      }
      try {
        const [custRes, statsRes, empRes] = await Promise.all([
          ApiClient.getCustomers(activeTenant.id, {
            page,
            pageSize,
            search: search.trim() || undefined,
            status: statusFilter || undefined,
            tier: tierFilter || undefined,
            type: typeFilter || undefined,
          }),
          ApiClient.getCustomerStats(activeTenant.id),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
        ]);

        if (!ignore) {
          if (custRes.success && custRes.data) {
            setCustomers(custRes.data.items);
            setTotalCount(custRes.data.totalCount);
          }
          if (statsRes.success && statsRes.data) {
            setStats(statsRes.data);
          }
          if (empRes.success && empRes.data) {
            setEmployees(empRes.data.items);
          }
        }
      } catch {
        if (!ignore) {
          showToast("Müşteri verileri yüklenirken bir hata oluştu.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      ignore = true;
    };
  }, [
    activeTenant,
    page,
    pageSize,
    search,
    statusFilter,
    typeFilter,
    tierFilter,
  ]);

  const handleDelete = async () => {
    if (!(activeTenant && deletingCustomer)) {
      return;
    }
    try {
      const res = await ApiClient.deleteCustomer(
        deletingCustomer.id,
        activeTenant.id
      );
      if (res.success) {
        showToast(`'${deletingCustomer.name}' başarıyla silindi.`);
        setDeletingCustomer(null);
        loadData();
      } else {
        showToast(res.message || "Silme işlemi başarısız.");
      }
    } catch {
      showToast("Silme sırasında hata oluştu.");
    }
  };

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Active":
        return "Aktif Müşteri";
      case "Lead":
        return "Potansiyel (Lead)";
      case "Passive":
        return "Pasif";
      case "Churned":
        return "Kaybedildi";
      default:
        return status;
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="slide-in-from-top-4 fixed top-6 right-6 z-50 flex animate-in items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
              Müşteriler
            </h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-bold text-[11px] text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
              {totalCount} Kayıt
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Kurumsal ve bireysel tüm müşterilerinizi, yetkililerini ve ticari
            geçmişini yönetin.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={() =>
              showToast("Müşteri listesi CSV olarak dışa aktarılıyor...")
            }
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Dışa Aktar</span>
          </button>

          <PermissionGate permission="Customers.Create">
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Müşteri Ekle</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Toplam Müşteri
              </span>
              <div className="mt-1 font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                {stats?.totalCustomers ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>{stats?.companiesCount ?? 0} Şirket</span>
            <span>•</span>
            <span>{stats?.individualsCount ?? 0} Bireysel</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Aktif Müşteriler
              </span>
              <div className="mt-1 font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                {stats?.activeCustomers ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 font-semibold text-[11px] text-emerald-600 dark:border-zinc-800 dark:text-emerald-400">
            <span>
              %
              {stats?.totalCustomers
                ? Math.round(
                    (stats.activeCustomers / stats.totalCustomers) * 100
                  )
                : 0}{" "}
              Aktiflik Oranı
            </span>
          </div>
        </div>

        {/* Leads */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Potansiyel (Lead)
              </span>
              <div className="mt-1 font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                {stats?.leadCustomers ?? 0}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 font-semibold text-[11px] text-blue-600 dark:border-zinc-800 dark:text-blue-400">
            <span>Dönüşüm bekleyen adaylar</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
                Toplam Müşteri Hacmi
              </span>
              <div className="mt-1 font-bold text-2xl text-zinc-900 tracking-tight sm:text-3xl dark:text-zinc-100">
                ₺{(stats?.totalRevenue ?? 0).toLocaleString("tr-TR")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-zinc-100 border-t pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Ort. Müşteri Değeri: ₺
              {(stats?.averageRevenuePerCustomer ?? 0).toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filters & View Switcher Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs md:flex-row md:items-center dark:border-zinc-800/90 dark:bg-zinc-900/90">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <input
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri adı, e-posta, telefon veya şehir ara..."
            type="text"
            value={search}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-700 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            onChange={(e) => setTypeFilter(e.target.value)}
            value={typeFilter}
          >
            <option value="">Tüm Tipler</option>
            <option value="Company">Kurumsal (Şirket)</option>
            <option value="Individual">Bireysel (Şahıs)</option>
          </select>

          {/* Status Filter */}
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-700 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="">Tüm Statüler</option>
            <option value="Active">Aktif</option>
            <option value="Lead">Potansiyel (Lead)</option>
            <option value="Passive">Pasif</option>
            <option value="Churned">Kaybedildi</option>
          </select>

          {/* Tier Filter */}
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-700 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            onChange={(e) => setTierFilter(e.target.value)}
            value={tierFilter}
          >
            <option value="">Tüm Segmentler</option>
            <option value="VIP">VIP</option>
            <option value="Enterprise">Enterprise</option>
            <option value="SME">KOBİ (SME)</option>
            <option value="Standard">Standart</option>
          </select>

          {/* Reset Filters */}
          {(search || statusFilter || typeFilter || tierFilter) && (
            <button
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700 text-xs hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTypeFilter("");
                setTierFilter("");
              }}
              type="button"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Sıfırla</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              onClick={() => setViewMode("table")}
              title="Tablo Görünümü"
              type="button"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              onClick={() => setViewMode("grid")}
              title="Kart Görünümü"
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Customer List (Table or Grid) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <span className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
              Müşteriler yükleniyor...
            </span>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 border-dashed bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Kayıtlı Müşteri Bulunamadı
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Arama kriterlerinize uygun müşteri bulunamadı veya henüz müşteri
            kaydı eklenmedi.
          </p>
          <PermissionGate permission="Customers.Create">
            <button
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98]"
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>İlk Müşteriyi Ekle</span>
            </button>
          </PermissionGate>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-zinc-100 border-b bg-zinc-50/50 font-medium text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                <tr>
                  <th className="py-3.5 pr-4 pl-6">Müşteri / Şirket</th>
                  <th className="px-4 py-3.5">Statü & Segment</th>
                  <th className="px-4 py-3.5">İletişim</th>
                  <th className="px-4 py-3.5">Konum</th>
                  <th className="px-4 py-3.5">Temsilci</th>
                  <th className="px-4 py-3.5 text-right">Toplam Hacim</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {customers.map((c) => (
                  <tr
                    className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    key={c.id}
                  >
                    <td className="py-4 pr-4 pl-6">
                      <Link
                        className="flex items-center gap-3"
                        href={`/${tenantSlug}/customers/${c.id}`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-2xs ${
                            c.type === "Company"
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          }`}
                        >
                          {c.type === "Company" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 dark:hover:text-zinc-100">
                            {c.name}
                          </div>
                          <div className="flex items-center gap-2 font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                            <span>
                              {c.type === "Company" ? "Kurumsal" : "Bireysel"}
                            </span>
                            {c.industry && (
                              <>
                                <span>•</span>
                                <span>{c.industry}</span>
                              </>
                            )}
                            {c.contactsCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{c.contactsCount} Yetkili</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getStatusBadge(
                            c.status
                          )}`}
                        >
                          {getStatusLabel(c.status)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getTierBadge(
                            c.tier
                          )}`}
                        >
                          {c.tier}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                        {c.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                        {c.city ? `${c.city}, ${c.country || "TR"}` : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {c.assignedEmployeeName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 font-bold text-[9px] text-white dark:bg-zinc-100 dark:text-zinc-900">
                            {c.assignedEmployeeName.charAt(0)}
                          </div>
                          <span className="font-medium text-[11px] text-zinc-800 dark:text-zinc-200">
                            {c.assignedEmployeeName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Atanmadı
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        ₺{c.totalRevenue.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {c.dealsCount} Fırsat
                      </div>
                    </td>

                    <td className="py-4 pr-6 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          href={`/${tenantSlug}/customers/${c.id}`}
                          title="Detay Görüntüle"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <PermissionGate permission="Customers.Delete">
                          <button
                            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            onClick={() => setDeletingCustomer(c)}
                            title="Müşteriyi Sil"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <div
              className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700"
              key={c.id}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm shadow-2xs ${
                        c.type === "Company"
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                      }`}
                    >
                      {c.type === "Company" ? (
                        <Building2 className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <Link
                        className="font-bold text-sm text-zinc-900 transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 dark:hover:text-zinc-100"
                        href={`/${tenantSlug}/customers/${c.id}`}
                      >
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {c.industry ||
                          (c.type === "Company"
                            ? "Kurumsal Şirket"
                            : "Bireysel Müşteri")}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-semibold text-[10px] ${getStatusBadge(
                      c.status
                    )}`}
                  >
                    {getStatusLabel(c.status)}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 border-zinc-100 border-t pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>{c.city}, TR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 flex items-center justify-between border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    Toplam Ciro:
                  </span>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    ₺{c.totalRevenue.toLocaleString("tr-TR")}
                  </div>
                </div>

                <Link
                  className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 font-semibold text-white text-xs shadow-2xs transition-all hover:bg-violet-700 active:scale-[0.98]"
                  href={`/${tenantSlug}/customers/${c.id}`}
                >
                  <span>Detay (360°)</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Customer Modal */}
      {isCreateModalOpen && (
        <CreateCustomerModal
          employees={employees}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            showToast("Yeni müşteri başarıyla eklendi.");
            setIsCreateModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-md flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Müşteriyi Sil
            </h3>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed dark:text-zinc-400">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-200">
                {deletingCustomer.name}
              </strong>{" "}
              isimli müşteriyi ve buna bağlı yetkilileri, notları silmek
              istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => setDeletingCustomer(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white text-xs shadow-xs hover:bg-rose-700 active:scale-95"
                onClick={handleDelete}
                type="button"
              >
                Evet, Müşteriyi Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  employees: initialEmployees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  employees: EmployeeDto[];
}) {
  const [employeesList, setEmployeesList] =
    useState<EmployeeDto[]>(initialEmployees);
  const [isAddSalesRepOpen, setIsAddSalesRepOpen] = useState(false);

  const [formData, setFormData] = useState<CreateCustomerRequest>({
    addressLine: "",
    assignedEmployeeId: "",
    city: "",
    email: "",
    industry: "",
    initialContactEmail: "",
    initialContactFirstName: "",
    initialContactLastName: "",
    initialContactPhone: "",
    initialContactTitle: "",
    name: "",
    phone: "",
    status: "Lead",
    taxNumber: "",
    taxOffice: "",
    tier: "Standard",
    type: "Company",
    website: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const cleanData: CreateCustomerRequest = {
        addressLine: formData.addressLine?.trim() || undefined,
        assignedEmployeeId: formData.assignedEmployeeId
          ? formData.assignedEmployeeId
          : undefined,
        city: formData.city?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        initialContactEmail:
          formData.type === "Company"
            ? formData.initialContactEmail?.trim() || undefined
            : undefined,
        initialContactFirstName:
          formData.type === "Company"
            ? formData.initialContactFirstName?.trim() || undefined
            : undefined,
        initialContactLastName:
          formData.type === "Company"
            ? formData.initialContactLastName?.trim() || undefined
            : undefined,
        initialContactPhone:
          formData.type === "Company"
            ? formData.initialContactPhone?.trim() || undefined
            : undefined,
        initialContactTitle:
          formData.type === "Company"
            ? formData.initialContactTitle?.trim() || undefined
            : undefined,
        name: formData.name.trim(),
        phone: formData.phone?.trim() || undefined,
        status: formData.status,
        taxNumber: formData.taxNumber?.trim() || undefined,
        taxOffice: formData.taxOffice?.trim() || undefined,
        tier: formData.tier,
        type: formData.type,
        website: formData.website?.trim() || undefined,
      };

      const res = await ApiClient.createCustomer(cleanData, tenantId);

      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || "Müşteri oluşturulurken bir hata oluştu.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-zinc-100 border-b p-5 dark:border-zinc-800">
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Yeni Müşteri Ekle
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kurumsal şirket veya bireysel şahıs müşterisi oluşturun
              </p>
            </div>

            <button
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form
            className="flex-1 space-y-4 overflow-y-auto p-6 text-xs"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 font-medium text-rose-700 text-xs dark:bg-rose-950/60 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Type Switcher */}
            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                className={`flex-1 rounded-lg py-2 font-semibold text-xs transition-all ${
                  formData.type === "Company"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                }`}
                onClick={() => setFormData({ ...formData, type: "Company" })}
                type="button"
              >
                Kurumsal (Şirket)
              </button>
              <button
                className={`flex-1 rounded-lg py-2 font-semibold text-xs transition-all ${
                  formData.type === "Individual"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 dark:hover:text-zinc-400"
                }`}
                onClick={() => setFormData({ ...formData, type: "Individual" })}
                type="button"
              >
                Bireysel (Şahıs)
              </button>
            </div>

            {/* Core Info */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  {formData.type === "Company"
                    ? "Şirket / Kurum Adı *"
                    : "Müşteri Adı Soyadı *"}
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={
                    formData.type === "Company"
                      ? "Acme Holding A.Ş."
                      : "Ahmet Yılmaz"
                  }
                  required
                  type="text"
                  value={formData.name}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  E-Posta
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="info@acme.com"
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

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Statü
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  value={formData.status}
                >
                  <option value="Lead">Potansiyel (Lead)</option>
                  <option value="Active">Aktif Müşteri</option>
                  <option value="Passive">Pasif</option>
                  <option value="Churned">Kaybedildi</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Segment / Seviye
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Sektör
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="Yazılım / Bilişim"
                  type="text"
                  value={formData.industry}
                />
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
            </div>

            {/* Primary Contact for Companies */}
            {formData.type === "Company" && (
              <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  Birincil Yetkili / İlgili Kişi
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initialContactFirstName: e.target.value,
                      })
                    }
                    placeholder="Yetkili Adı"
                    type="text"
                    value={formData.initialContactFirstName}
                  />
                  <input
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initialContactLastName: e.target.value,
                      })
                    }
                    placeholder="Yetkili Soyadı"
                    type="text"
                    value={formData.initialContactLastName}
                  />
                  <input
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initialContactTitle: e.target.value,
                      })
                    }
                    placeholder="Ünvan (Örn: Satın Alma Md.)"
                    type="text"
                    value={formData.initialContactTitle}
                  />
                  <PhoneInput
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        initialContactPhone: val,
                      })
                    }
                    placeholder="Yetkili Telefon (+90 5XX...)"
                    value={formData.initialContactPhone || ""}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-zinc-100 border-t pt-4 dark:border-zinc-800">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={onClose}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-xl bg-violet-600 px-5 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
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
