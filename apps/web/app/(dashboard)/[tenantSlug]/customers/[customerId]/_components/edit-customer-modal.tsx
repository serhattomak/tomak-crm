"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Mail, X } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { QuickAddSalesRepModal } from "@/components/quick-add-sales-rep-modal";
import {
  ApiClient,
  type CustomerDetailDto,
  type EmployeeDto,
  type UpdateCustomerRequest,
} from "@/lib/api-client";

interface EditCustomerModalProps {
  customer: CustomerDetailDto;
  employees: EmployeeDto[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function EditCustomerModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  employees,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    addressLine: customer.addressLine || "",
    assignedEmployeeId: customer.assignedEmployeeId || undefined,
    city: customer.city || "",
    country: customer.country || "",
    email: customer.email || "",
    industry: customer.industry || "",
    name: customer.name || "",
    phone: customer.phone || "",
    postalCode: customer.postalCode || "",
    state: customer.state || "",
    status: customer.status || "Active",
    tags: customer.tags || [],
    taxNumber: customer.taxNumber || "",
    taxOffice: customer.taxOffice || "",
    tier: customer.tier || "Standard",
    type: customer.type || "Company",
    website: customer.website || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name?.trim()) {
        return;
      }

      setSubmitting(true);
      try {
        const res = await ApiClient.updateCustomer(
          customer.id,
          formData,
          tenantId
        );
        if (res.success) {
          onSuccess();
        }
      } finally {
        setSubmitting(false);
      }
    },
    [customer.id, formData, onSuccess, tenantId]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border border-border/80 bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-border/60 border-b pb-3">
          <h3 className="font-semibold text-foreground text-sm">
            Müşteri Bilgilerini Düzenle
          </h3>
          <Button
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-1 text-xs" required>
              Müşteri / Şirket Adı
            </Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              value={formData.name || ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs">Müşteri Türü</Label>
              <Select
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                value={formData.type}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company">Kurumsal Şirket</SelectItem>
                  <SelectItem value="Individual">Bireysel Müşteri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 text-xs">Segment (Tier)</Label>
              <Select
                onValueChange={(val) => setFormData({ ...formData, tier: val })}
                value={formData.tier}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs">E-Posta</Label>
              <Input
                leftIcon={<Mail className="h-3.5 w-3.5" />}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                type="email"
                value={formData.email || ""}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">Telefon</Label>
              <PhoneInput
                onChange={(val) => setFormData({ ...formData, phone: val })}
                value={formData.phone || ""}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 text-xs">Sorumlu Satış Temsilcisi</Label>
            <SalesRepPicker
              employees={employees}
              onAddNew={() => setIsQuickAddOpen(true)}
              onChange={(empId) =>
                setFormData({
                  ...formData,
                  assignedEmployeeId: empId || undefined,
                })
              }
              value={formData.assignedEmployeeId}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs">Sektör</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                placeholder="Örn: Bilişim / Yazılım"
                value={formData.industry || ""}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">Web Sitesi</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://..."
                value={formData.website || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs">Şehir</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="İstanbul"
                value={formData.city || ""}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs">Adres</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, addressLine: e.target.value })
                }
                placeholder="Cadde / Sokak..."
                value={formData.addressLine || ""}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-border/60 border-t pt-3.5">
            <Button
              disabled={submitting}
              onClick={onClose}
              size="sm"
              type="button"
              variant="outline"
            >
              Vazgeç
            </Button>
            <Button
              disabled={submitting || !formData.name?.trim()}
              size="sm"
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>

        <QuickAddSalesRepModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSuccess={(emp) => {
            setFormData({ ...formData, assignedEmployeeId: emp.id });
            setIsQuickAddOpen(false);
          }}
          tenantId={tenantId}
        />
      </div>
    </div>
  );
}
