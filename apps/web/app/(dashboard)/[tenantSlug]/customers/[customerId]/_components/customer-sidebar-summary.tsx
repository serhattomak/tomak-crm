"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { CustomerDetailDto } from "@/lib/api-client";

interface CustomerSidebarSummaryProps {
  customer: CustomerDetailDto;
}

export function CustomerSidebarSummary({
  customer,
}: CustomerSidebarSummaryProps) {
  return (
    <div className="space-y-3.5">
      {/* 1. Contact Information Card */}
      <Card>
        <CardHeader className="p-4 pb-2.5">
          <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            İletişim & Konum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 text-xs">
          {customer.phone ? (
            <div className="flex items-center gap-2.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                className="font-medium text-foreground transition-colors hover:text-primary"
                href={`tel:${customer.phone}`}
              >
                {customer.phone}
              </a>
            </div>
          ) : null}

          {customer.email ? (
            <div className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                className="truncate font-medium text-primary hover:underline"
                href={`mailto:${customer.email}`}
              >
                {customer.email}
              </a>
            </div>
          ) : null}

          {customer.website ? (
            <div className="flex items-center gap-2.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                className="truncate font-medium text-primary hover:underline"
                href={customer.website}
                rel="noreferrer"
                target="_blank"
              >
                {customer.website}
              </a>
            </div>
          ) : null}

          {customer.addressLine ? (
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground leading-relaxed">
                {customer.addressLine}, {customer.city}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. Assigned Account Manager Card */}
      <Card>
        <CardHeader className="p-4 pb-2.5">
          <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            Sorumlu Satış Temsilcisi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {customer.assignedEmployeeName ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-bold text-primary text-xs shadow-2xs">
                {customer.assignedEmployeeName.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-foreground text-xs">
                  {customer.assignedEmployeeName}
                </div>
                <div className="text-2xs text-muted-foreground">
                  Portföy & Müşteri Yöneticisi
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">
              Bu müşteriye henüz temsilci atanmadı.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tax / Billing Information */}
      {customer.taxNumber || customer.taxOffice ? (
        <Card>
          <CardHeader className="p-4 pb-2.5">
            <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Fatura & Vergi Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-4 text-xs">
            {customer.taxNumber ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">VKN / TCKN:</span>
                <span className="font-medium text-foreground">
                  {customer.taxNumber}
                </span>
              </div>
            ) : null}
            {customer.taxOffice ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vergi Dairesi:</span>
                <span className="font-medium text-foreground">
                  {customer.taxOffice}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
