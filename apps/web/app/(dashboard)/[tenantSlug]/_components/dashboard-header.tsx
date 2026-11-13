"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { SlidersHorizontal, Sparkles, UserPlus } from "lucide-react";
import { DashboardSharePopover } from "@/components/dashboard-share-popover";
import { NotificationCenter } from "@/components/notification-center";
import { TeamMembersStack } from "@/components/team-members-stack";
import type { DashboardTab, DateRange } from "../widgets/dashboard-types";

interface DashboardHeaderProps {
  activeTab: DashboardTab;
  dateRange: DateRange;
  onOpenCustomize: () => void;
  onOpenInvite: () => void;
  tenantName: string;
  userName: string;
}

export function DashboardHeader({
  activeTab,
  dateRange,
  onOpenCustomize,
  onOpenInvite,
  tenantName,
  userName,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-2xl text-foreground tracking-tight">
            Dashboard
          </h1>
          <Badge className="gap-1 px-2 py-0.5 text-2xs" variant="accent">
            <Sparkles className="h-3 w-3 text-primary" />
            {tenantName || "Ana Çalışma Alanı"}
          </Badge>
        </div>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Hoş geldiniz,{" "}
          <span className="font-semibold text-foreground">
            {userName || "Serhat Dev"}
          </span>
          . Bugünün CRM özet ve performans durumu.
        </p>
      </div>

      {/* Action Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {/* Interactive Share Dashboard Popover */}
        <DashboardSharePopover activeTab={activeTab} dateRange={dateRange} />

        {/* Interactive Notification Center */}
        <NotificationCenter />

        {/* Interactive Member Avatars Stack & Popover */}
        <TeamMembersStack onOpenInvite={onOpenInvite} />

        {/* Quick Invite Button */}
        <Button
          onClick={onOpenInvite}
          size="icon-sm"
          title="Ekip Arkadaşı Davet Et"
          type="button"
          variant="outline"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </Button>

        {/* Customize Widgets Button */}
        <Button
          className="gap-1.5"
          onClick={onOpenCustomize}
          size="sm"
          type="button"
          variant="outline"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Widgetları Düzenle</span>
        </Button>
      </div>
    </div>
  );
}
