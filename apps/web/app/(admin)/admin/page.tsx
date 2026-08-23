"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Activity,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalMembers: number;
  totalTemplates: number;
  industryDistribution: { industry: string; count: number }[];
}

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  industry: string;
  industryTemplateName?: string;
  isActive: boolean;
  memberCount: number;
  enabledModuleCount: number;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsRes, tenantsRes] = await Promise.all([
          apiClient.get<AdminStats>("/api/admin/stats").catch(() => null),
          apiClient.get<TenantItem[]>("/api/admin/tenants").catch(() => null),
        ]);

        if (statsRes?.data) setStats(statsRes.data);
        if (tenantsRes?.data) setRecentTenants(tenantsRes.data.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight">
              Merkezi Yönetim Konsolu
            </h1>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 border border-blue-200/60">
              Super Admin
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Tüm firmaların lisans, sektör şablonu ve aktif modül durumlarını tek merkezden denetleyin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/tenants?create=true"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Firma Kaydet</span>
          </Link>
          <Link
            href="/admin/templates"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Sektör Şablonları</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tenants */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kayıtlı Firma
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-slate-900">
              {loading ? "-" : stats?.totalTenants ?? 0}
            </span>
            <span className="text-xs text-blue-600 font-medium">Tenant</span>
          </div>
        </div>

        {/* Active Companies */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aktif Abonelik
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-emerald-600">
              {loading ? "-" : stats?.activeTenants ?? 0}
            </span>
            <span className="text-xs text-slate-500">
              / {stats?.suspendedTenants ?? 0} askıda
            </span>
          </div>
        </div>

        {/* Total Members */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kullanıcı Havuzu
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 border border-purple-100">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-slate-900">
              {loading ? "-" : stats?.totalMembers ?? 0}
            </span>
            <span className="text-xs text-purple-600 font-medium">Toplam Üye</span>
          </div>
        </div>

        {/* Sektör Şablonları */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sektör Şablonu
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-100">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-amber-600">
              {loading ? "-" : stats?.totalTemplates ?? 0}
            </span>
            <span className="text-xs text-slate-500">Hazır Dikey</span>
          </div>
        </div>
      </div>

      {/* Main Row: Recent Tenants & Industry Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Tenants Table (2 Columns) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-base text-slate-900">Son Eklenen Firmalar</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sisteme kayıtlı işletmeler ve modül durumları</p>
            </div>
            <Link
              href="/admin/tenants"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {recentTenants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {loading ? "Yükleniyor..." : "Henüz kayıtlı firma bulunamadı."}
              </div>
            ) : (
              recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 font-bold text-blue-600 text-xs">
                      {tenant.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="truncate font-semibold text-sm text-slate-900 hover:text-blue-600"
                        >
                          {tenant.name}
                        </Link>
                        {tenant.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
                            Askıda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>slug: {tenant.slug}</span>
                        <span>•</span>
                        <span className="text-amber-600 font-medium">
                          {tenant.industryTemplateName ?? tenant.industry ?? "Genel"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-slate-700">
                        {tenant.enabledModuleCount} Modül
                      </p>
                      <p className="text-[11px] text-slate-400">{tenant.memberCount} Üye</p>
                    </div>
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                      title="Yönet"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Industry Distribution Widget (1 Column) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <h2 className="font-bold text-base text-slate-900">Sektör Dağılımı</h2>
          <p className="text-xs text-slate-500 mt-0.5">Firmaların sektörel şablon dağılımı</p>

          <div className="mt-6 space-y-4">
            {stats?.industryDistribution && stats.industryDistribution.length > 0 ? (
              stats.industryDistribution.map((item) => {
                const percentage = stats.totalTenants > 0 ? Math.round((item.count / stats.totalTenants) * 100) : 0;
                return (
                  <div key={item.industry} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 capitalize">{item.industry}</span>
                      <span className="text-slate-500">
                        {item.count} firma ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                {loading ? "Yükleniyor..." : "Veri bulunamadı."}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-blue-700 mb-1">
              <Shield className="h-4 w-4" />
              <span>Modüler Satış Prensibi</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Her firma için aktif modülleri ve özel terminolojiyi Firma Detay sayfasından anlık değiştirebilirsiniz. Değişiklikler Redis üzerinden sıfır gecikmeyle yansır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
