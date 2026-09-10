"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowLeft,
  Building2,
  Edit2,
  FileSpreadsheet,
  Plus,
  User,
} from "lucide-react";
import Link from "next/link";
import type { CustomerDetailDto } from "@/lib/api-client";

interface CustomerDetailHeaderProps {
  customer: CustomerDetailDto;
  onOpenActivityModal: () => void;
  onOpenEditModal: () => void;
  tenantSlug: string;
}

export function CustomerDetailHeader({
  customer,
  tenantSlug,
  onOpenEditModal,
  onOpenActivityModal,
}: CustomerDetailHeaderProps) {
  const getStatusBadgeProps = (
    status: string
  ): {
    variant: "success" | "accent" | "neutral" | "destructive";
    label: string;
  } => {
    switch (status) {
      case "Active":
        return { label: "Aktif", variant: "success" };
      case "Lead":
        return { label: "Potansiyel (Lead)", variant: "accent" };
      case "Passive":
        return { label: "Pasif", variant: "neutral" };
      case "Churned":
        return { label: "Kaybedildi", variant: "destructive" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  const statusInfo = getStatusBadgeProps(customer.status);

  return (
    <div className="space-y-3">
      {/* Back Button */}
      <div>
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-xs transition hover:text-foreground"
          href={`/${tenantSlug}/customers`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Müşteriler Listesine Dön</span>
        </Link>
      </div>

      {/* Main Header Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/60 text-primary shadow-2xs">
            {customer.type === "Company" ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold text-foreground text-xl tracking-tight sm:text-2xl">
                {customer.name}
              </h1>
              <Badge size="sm" variant={statusInfo.variant}>
                {statusInfo.label}
              </Badge>
              <Badge size="sm" variant="warning">
                {customer.tier}
              </Badge>
              <Badge size="sm" variant="secondary">
                {customer.type === "Company"
                  ? "Kurumsal Şirket"
                  : "Bireysel Şahıs"}
              </Badge>
            </div>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {customer.industry ? `${customer.industry} • ` : ""}
              {customer.city ? `${customer.city}, TR • ` : ""}
              Müşteri 360° Entegre Yönetim Paneli
            </p>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="gap-1.5"
            onClick={onOpenEditModal}
            size="sm"
            type="button"
            variant="outline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Müşteriyi Düzenle</span>
          </Button>

          <Button asChild className="gap-1.5" size="sm" variant="outline">
            <Link
              href={`/${tenantSlug}/quotes?create=true&customerId=${customer.id}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Yeni Teklif</span>
            </Link>
          </Button>

          <Button
            className="gap-1.5"
            onClick={onOpenActivityModal}
            size="sm"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Aktivite Ekle</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
