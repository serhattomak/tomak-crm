"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Building2,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@/components/permission-gate";
import type { CustomerListDto } from "@/lib/api-client";

interface CustomerTableViewProps {
  allSelected: boolean;
  customers: CustomerListDto[];
  loading: boolean;
  onCreateCustomer: () => void;
  onDeleteCustomer: (customer: CustomerListDto) => void;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  selectedIds: Set<string>;
  someSelected: boolean;
  tenantSlug: string;
}

export function CustomerTableView({
  customers,
  loading,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelectAll,
  onToggleSelectOne,
  onDeleteCustomer,
  onCreateCustomer,
  tenantSlug,
}: CustomerTableViewProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton className="h-12 w-full" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        title="Müşteri Bulunamadı"
        description="Arama kriterlerinize uygun müşteri bulunamadı veya henüz müşteri kaydı eklenmedi."
        icon={Users}
        action={
          <PermissionGate permission="Customers.Create">
            <Button className="gap-1.5" onClick={onCreateCustomer} size="sm">
              <Plus className="h-3.5 w-3.5" />
              <span>İlk Müşteriyi Ekle</span>
            </Button>
          </PermissionGate>
        }
      />
    );
  }

  const getStatusBadgeProps = (
    status: string
  ): {
    variant: "success" | "accent" | "neutral" | "destructive";
    label: string;
  } => {
    switch (status) {
      case "Active":
        return { label: "Aktif Müşteri", variant: "success" };
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

  const getTierVariant = (
    tier: string
  ): "default" | "secondary" | "warning" | "accent" | "neutral" => {
    switch (tier) {
      case "VIP":
        return "warning";
      case "Enterprise":
        return "accent";
      case "SME":
        return "secondary";
      default:
        return "neutral";
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pr-2 pl-3">
              <Checkbox
                aria-label="Tümünü seç"
                checked={allSelected}
                data-indeterminate={someSelected}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead className="pr-4 pl-2">Müşteri / Şirket</TableHead>
            <TableHead className="px-3">Statü & Segment</TableHead>
            <TableHead className="px-3">İletişim</TableHead>
            <TableHead className="px-3">Konum</TableHead>
            <TableHead className="px-3">Temsilci</TableHead>
            <TableHead className="px-3 text-right">Toplam Hacim</TableHead>
            <TableHead className="pr-4 pl-3 text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const isSelected = selectedIds.has(c.id);
            const statusInfo = getStatusBadgeProps(c.status);

            return (
              <TableRow
                className={isSelected ? "bg-primary/5" : undefined}
                key={c.id}
              >
                <TableCell className="w-10 pr-2 pl-3">
                  <Checkbox
                    aria-label={`${c.name} seç`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelectOne(c.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>

                <TableCell className="pr-4 pl-2">
                  <Link
                    className="group flex items-center gap-2.5"
                    href={`/${tenantSlug}/customers/${c.id}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/60 text-primary shadow-2xs">
                      {c.type === "Company" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs transition-colors group-hover:text-primary">
                        {c.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {c.type === "Company" ? "Kurumsal" : "Bireysel"}
                        </span>
                        {c.industry ? (
                          <>
                            <span>•</span>
                            <span>{c.industry}</span>
                          </>
                        ) : null}
                        {c.contactsCount > 0 ? (
                          <>
                            <span>•</span>
                            <span>{c.contactsCount} Yetkili</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </TableCell>

                <TableCell className="px-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge size="sm" variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                    <Badge size="sm" variant={getTierVariant(c.tier)}>
                      {c.tier}
                    </Badge>
                  </div>
                </TableCell>

                <TableCell className="px-3">
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    {c.phone ? (
                      <a
                        className="flex items-center gap-1 transition-colors hover:text-foreground"
                        href={`tel:${c.phone}`}
                      >
                        <Phone className="h-3 w-3 text-muted-foreground/70" />
                        <span>{c.phone}</span>
                      </a>
                    ) : null}
                    {c.email ? (
                      <a
                        className="flex items-center gap-1 transition-colors hover:text-foreground"
                        href={`mailto:${c.email}`}
                      >
                        <Mail className="h-3 w-3 text-muted-foreground/70" />
                        <span className="max-w-[140px] truncate">
                          {c.email}
                        </span>
                      </a>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell className="px-3">
                  <span className="text-[11px] text-muted-foreground">
                    {c.city ? `${c.city}, ${c.country || "TR"}` : "—"}
                  </span>
                </TableCell>

                <TableCell className="px-3">
                  {c.assignedEmployeeName ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 font-bold text-[9px] text-primary">
                        {c.assignedEmployeeName.charAt(0)}
                      </div>
                      <span className="font-medium text-[11px] text-foreground">
                        {c.assignedEmployeeName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="px-3 text-right">
                  <span className="font-semibold text-foreground text-xs">
                    ₺{(c.totalRevenue || 0).toLocaleString("tr-TR")}
                  </span>
                </TableCell>

                <TableCell className="pr-4 pl-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <PermissionGate permission="Customers.Delete">
                      <Button
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDeleteCustomer(c)}
                        size="icon-xs"
                        title="Müşteriyi Sil"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
