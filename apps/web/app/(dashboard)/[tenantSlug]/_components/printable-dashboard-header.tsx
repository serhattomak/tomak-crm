"use client";

import type { DashboardTab, DateRange } from "../widgets/dashboard-types";

interface PrintableDashboardHeaderProps {
  activeTab: DashboardTab;
  dateRange: DateRange;
  dateRangeLabel: string;
  tabLabel: string;
  tenantName: string;
  tenantSlug: string;
  userName: string;
}

export function PrintableDashboardHeader({
  activeTab,
  dateRangeLabel,
  tabLabel,
  tenantName,
  tenantSlug,
  userName,
}: PrintableDashboardHeaderProps) {
  return (
    <div className="mb-8 hidden border-border border-b-2 pb-5 print:block">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-lg text-primary-foreground">
              {(tenantName || tenantSlug || "C").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-2xl text-foreground tracking-tight">
                {tenantName || tenantSlug.toUpperCase()}
              </h1>
              <p className="font-medium text-muted-foreground text-xs">
                CRM Pano Yönetici & Performans Raporu
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 font-medium text-muted-foreground text-xs">
            <div>
              Pano Sekmesi:{" "}
              <strong className="font-semibold text-foreground">
                {tabLabel || activeTab}
              </strong>
            </div>
            <div>
              Dönem:{" "}
              <strong className="font-semibold text-foreground">
                {dateRangeLabel}
              </strong>
            </div>
          </div>
        </div>

        <div className="text-right text-muted-foreground text-xs">
          <div className="font-semibold text-foreground">Rapor Tarihi</div>
          <div>
            {new Date().toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="mt-1 text-2xs text-muted-foreground">
            Hazırlayan: {userName || "Yetkili Kullanıcı"}
          </div>
          <div className="mt-2 inline-block rounded-md bg-muted px-2 py-0.5 font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
            Gizli & Kurum İçi
          </div>
        </div>
      </div>
    </div>
  );
}
