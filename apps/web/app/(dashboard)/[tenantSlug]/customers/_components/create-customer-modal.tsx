"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { useState } from "react";
import { SalesRepPicker } from "@/components/entity-picker-modal";
import { QuickAddSalesRepModal } from "@/components/quick-add-sales-rep-modal";
import {
  ApiClient,
  type CreateCustomerRequest,
  type EmployeeDto,
} from "@/lib/api-client";

interface CreateCustomerModalProps {
  employees: EmployeeDto[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  employees: initialEmployees,
}: CreateCustomerModalProps) {
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
        assignedEmployeeId: formData.assignedEmployeeId || undefined,
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
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        open
      >
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-border/80 border-b p-4 sm:p-5">
            <div>
              <DialogTitle className="font-semibold text-base text-foreground">
                Yeni Müşteri Ekle
              </DialogTitle>
              <p className="text-muted-foreground text-xs">
                Kurumsal şirket veya bireysel şahıs müşterisi oluşturun
              </p>
            </div>

            <DialogClose asChild>
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </DialogClose>
          </div>

          {/* Form */}
          <form
            className="flex-1 space-y-4 overflow-y-auto p-5 text-xs"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 font-medium text-destructive text-xs">
                {error}
              </div>
            )}

            {/* Type Switcher */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
              <button
                className={`flex-1 rounded-md py-1.5 font-medium text-xs transition-all ${
                  formData.type === "Company"
                    ? "bg-card font-semibold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setFormData({ ...formData, type: "Company" })}
                type="button"
              >
                Kurumsal (Şirket)
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 font-medium text-xs transition-all ${
                  formData.type === "Individual"
                    ? "bg-card font-semibold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
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
                <Label className="mb-1" required>
                  {formData.type === "Company"
                    ? "Şirket / Kurum Adı"
                    : "Müşteri Adı Soyadı"}
                </Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={
                    formData.type === "Company"
                      ? "Acme Holding A.Ş."
                      : "Ahmet Yılmaz"
                  }
                  required
                  value={formData.name}
                />
              </div>

              <div>
                <Label className="mb-1">E-Posta</Label>
                <Input
                  leftIcon={<Mail className="h-4 w-4" />}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="info@acme.com"
                  type="email"
                  value={formData.email}
                />
              </div>

              <div>
                <Label className="mb-1">Telefon</Label>
                <PhoneInput
                  onChange={(val) => setFormData({ ...formData, phone: val })}
                  placeholder="+90 (5XX) XXX XX XX"
                  value={formData.phone || ""}
                />
              </div>

              <div>
                <Label className="mb-1">Statü</Label>
                <Select
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                  value={formData.status}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Potansiyel (Lead)</SelectItem>
                    <SelectItem value="Active">Aktif Müşteri</SelectItem>
                    <SelectItem value="Passive">Pasif</SelectItem>
                    <SelectItem value="Churned">Kaybedildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1">Segment / Seviye</Label>
                <Select
                  onValueChange={(val) =>
                    setFormData({ ...formData, tier: val })
                  }
                  value={formData.tier}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standart</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="SME">KOBİ (SME)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1">Sektör</Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  placeholder="Yazılım / Bilişim"
                  type="text"
                  value={formData.industry}
                />
              </div>

              <div>
                <Label className="mb-1">Sorumlu Satış Temsilcisi</Label>
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
              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3.5">
                <h4 className="font-semibold text-foreground text-xs">
                  Birincil Yetkili / İlgili Kişi
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Input
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
                  <Input
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
                  <Input
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
                    placeholder="Yetkili Telefon"
                    value={formData.initialContactPhone || ""}
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-border/80 border-t pt-4">
              <Button
                onClick={onClose}
                size="sm"
                type="button"
                variant="outline"
              >
                Vazgeç
              </Button>
              <Button disabled={submitting} size="sm" type="submit">
                {submitting ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
