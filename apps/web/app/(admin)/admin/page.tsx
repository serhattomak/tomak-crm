"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Plus,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface AdminStats {
  activeTenants: number;
  industryDistribution: { industry: string; count: number }[];
  suspendedTenants: number;
  totalMembers: number;
  totalTemplates: number;
  totalTenants: number;
}

interface TenantItem {
  createdAt: string;
  enabledModuleCount: number;
  id: string;
  industry: string;
  industryTemplateName?: string;
  isActive: boolean;
  memberCount: number;
  name: string;
  slug: string;
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

        if (statsRes?.data) {
          setStats(statsRes.data);
        }
        if (tenantsRes?.data) {
          setRecentTenants(tenantsRes.data.slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <PageContainer className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-2xl text-zinc-900 tracking-tight md:text-3xl">
              Merkezi Yönetim Konsolu
            </h1>
            <span className="rounded-md border border-blue-200/60 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-bold text-blue-600 dark:text-blue-400 text-xs">
              Super Admin
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Tüm firmaların lisans, sektör şablonu ve aktif modül durumlarını tek
            merkezden denetleyin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white text-xs shadow-sm transition hover:bg-blue-600 active:scale-95"
            href="/admin/tenants?create=true"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Firma Kaydet</span>
          </Link>
          <Link
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 font-semibold text-zinc-700 text-xs shadow-2xs transition hover:bg-zinc-50"
            href="/admin/templates"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Sektör Şablonları</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tenants */}
        <div className="rounded-2xl border border-border bg-muted/50 p-5 shadow-2xs transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              Kayıtlı Firma
            </span>
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/60 p-2 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-zinc-900">
              {loading ? "-" : (stats?.totalTenants ?? 0)}
            </span>
            <span className="font-medium text-blue-600 dark:text-blue-400 text-xs">Tenant</span>
          </div>
        </div>

        {/* Active Companies */}
        <div className="rounded-2xl border border-border bg-muted/50 p-5 shadow-2xs transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              Aktif Abonelik
            </span>
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-emerald-700 dark:text-emerald-300">
              {loading ? "-" : (stats?.activeTenants ?? 0)}
            </span>
            <span className="text-muted-foreground text-xs">
              / {stats?.suspendedTenants ?? 0} askıda
            </span>
          </div>
        </div>

        {/* Total Members */}
        <div className="rounded-2xl border border-border bg-muted/50 p-5 shadow-2xs transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              Kullanıcı Havuzu
            </span>
            <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-950/60 p-2 text-purple-600 dark:text-purple-400">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-zinc-900">
              {loading ? "-" : (stats?.totalMembers ?? 0)}
            </span>
            <span className="font-medium text-purple-600 dark:text-purple-400 text-xs">
              Toplam Üye
            </span>
          </div>
        </div>

        {/* Sektör Şablonları */}
        <div className="rounded-2xl border border-border bg-muted/50 p-5 shadow-2xs transition-all hover:border-zinc-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              Sektör Şablonu
            </span>
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-extrabold text-3xl text-amber-700 dark:text-amber-400">
              {loading ? "-" : (stats?.totalTemplates ?? 0)}
            </span>
            <span className="text-muted-foreground text-xs">Hazır Dikey</span>
          </div>
        </div>
      </div>

      {/* Main Row: Recent Tenants & Industry Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Tenants Table (2 Columns) */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between border-border border-b pb-4">
            <div>
              <h2 className="font-bold text-base text-zinc-900">
                Son Eklenen Firmalar
              </h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Sisteme kayıtlı işletmeler ve modül durumları
              </p>
            </div>
            <Link
              className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-xs hover:text-blue-700"
              href="/admin/tenants"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-2 divide-y divide-zinc-100">
            {recentTenants.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                {loading ? "Yükleniyor..." : "Henüz kayıtlı firma bulunamadı."}
              </div>
            ) : (
              recentTenants.map((tenant) => (
                <div
                  className="flex items-center justify-between py-3.5"
                  key={tenant.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {tenant.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          className="truncate font-semibold text-zinc-900 text-sm hover:text-blue-600 dark:hover:text-blue-400"
                          href={`/admin/tenants/${tenant.id}`}
                        >
                          {tenant.name}
                        </Link>
                        {tenant.isActive ? (
                          <span className="rounded-full border border-emerald-200/60 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-bold text-3xs text-emerald-700 dark:text-emerald-300">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full border border-rose-200/60 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 font-bold text-3xs text-rose-700 dark:text-rose-300">
                            Askıda
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-2 text-muted-foreground text-xs">
                        <span>slug: {tenant.slug}</span>
                        <span>•</span>
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {tenant.industryTemplateName ??
                            tenant.industry ??
                            "Genel"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="font-semibold text-zinc-700 text-xs">
                        {tenant.enabledModuleCount} Modül
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        {tenant.memberCount} Üye
                      </p>
                    </div>
                    <Link
                      className="rounded-xl border border-border bg-muted p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                      href={`/admin/tenants/${tenant.id}`}
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
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          <h2 className="font-bold text-base text-zinc-900">
            Sektör Dağılımı
          </h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Firmaların sektörel şablon dağılımı
          </p>

          <div className="mt-6 space-y-4">
            {stats?.industryDistribution &&
            stats.industryDistribution.length > 0 ? (
              stats.industryDistribution.map((item) => {
                const percentage =
                  stats.totalTenants > 0
                    ? Math.round((item.count / stats.totalTenants) * 100)
                    : 0;
                return (
                  <div className="space-y-1.5" key={item.industry}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-700 capitalize">
                        {item.industry}
                      </span>
                      <span className="text-muted-foreground">
                        {item.count} firma ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-250"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-muted-foreground text-xs">
                {loading ? "Yükleniyor..." : "Veri bulunamadı."}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/60 p-4 text-zinc-700 dark:text-zinc-300 text-xs">
            <div className="mb-1 flex items-center gap-2 font-bold text-blue-700">
              <Shield className="h-4 w-4" />
              <span>Modüler Satış Prensibi</span>
            </div>
            <p className="text-2xs text-zinc-600 leading-relaxed">
              Her firma için aktif modülleri ve özel terminolojiyi Firma Detay
              sayfasından anlık değiştirebilirsiniz. Değişiklikler Redis
              üzerinden sıfır gecikmeyle yansır.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
