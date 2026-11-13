"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { ChevronRight, Globe, Mail, Phone } from "lucide-react";
import Link from "next/link";
import type { CustomerListDto } from "@/lib/api-client";

interface CustomerGridViewProps {
  customers: CustomerListDto[];
  tenantSlug: string;
}

export function CustomerGridView({
  customers,
  tenantSlug,
}: CustomerGridViewProps) {
  const initialsOf = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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
        return { label: "Lead", variant: "accent" };
      case "Passive":
        return { label: "Pasif", variant: "neutral" };
      case "Churned":
        return { label: "Kaybedildi", variant: "destructive" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {customers.map((c) => {
        const statusInfo = getStatusBadgeProps(c.status);

        return (
          <Card className="group flex flex-col justify-between p-4" key={c.id}>
            <div>
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-2xs text-muted-foreground">
                    {initialsOf(c.name)}
                  </div>
                  <div>
                    <Link
                      className="font-semibold text-foreground text-xs transition-colors group-hover:text-primary"
                      href={`/${tenantSlug}/customers/${c.id}`}
                    >
                      {c.name}
                    </Link>
                    <div className="text-3xs text-muted-foreground">
                      {c.industry ||
                        (c.type === "Company" ? "Kurumsal Şirket" : "Bireysel")}
                    </div>
                  </div>
                </div>

                <Badge size="sm" variant={statusInfo.variant}>
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Contact info list */}
              <div className="mt-3.5 space-y-1 border-border/60 border-t pt-2.5 text-muted-foreground text-xs">
                {c.phone ? (
                  <div className="flex items-center gap-2 text-2xs">
                    <Phone className="h-3 w-3 text-muted-foreground/70" />
                    <span>{c.phone}</span>
                  </div>
                ) : null}
                {c.email ? (
                  <div className="flex items-center gap-2 text-2xs">
                    <Mail className="h-3 w-3 text-muted-foreground/70" />
                    <span className="truncate">{c.email}</span>
                  </div>
                ) : null}
                {c.city ? (
                  <div className="flex items-center gap-2 text-2xs">
                    <Globe className="h-3 w-3 text-muted-foreground/70" />
                    <span>{c.city}, TR</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-4 flex items-center justify-between border-border/60 border-t pt-2.5">
              <div>
                <span className="text-3xs text-muted-foreground">
                  Toplam Ciro:
                </span>
                <div className="font-semibold text-foreground text-xs">
                  ₺{(c.totalRevenue || 0).toLocaleString("tr-TR")}
                </div>
              </div>

              <Button
                asChild
                className="h-7 gap-1 text-xs"
                size="sm"
                variant="outline"
              >
                <Link href={`/${tenantSlug}/customers/${c.id}`}>
                  <span>Detay</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
