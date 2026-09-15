"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import { X } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { type AddCustomerContactRequest, ApiClient } from "@/lib/api-client";

interface AddContactModalProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function AddContactModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customerId,
}: AddContactModalProps) {
  const [formData, setFormData] = useState<AddCustomerContactRequest>({
    department: "",
    email: "",
    firstName: "",
    isPrimary: false,
    lastName: "",
    mobile: "",
    notes: "",
    phone: "",
    title: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!(formData.firstName.trim() && formData.lastName.trim())) {
        return;
      }

      setSubmitting(true);
      try {
        const res = await ApiClient.addCustomerContact(
          customerId,
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
    [customerId, formData, onSuccess, tenantId]
  );

  if (!isOpen) {
    return null;
  }

  return (
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
        className="gap-0 p-5"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border/60 border-b pb-3">
          <DialogTitle className="font-semibold text-foreground text-sm">
            Yeni Yetkili / İlgili Kişi Ekle
          </DialogTitle>
          <DialogClose asChild>
            <Button
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs" required>
                Ad
              </Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="Ahmet"
                required
                value={formData.firstName}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs" required>
                Soyad
              </Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Yılmaz"
                required
                value={formData.lastName}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 text-xs">Ünvan / Pozisyon</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Örn: Satın Alma Müdürü"
              value={formData.title || ""}
            />
          </div>

          <div>
            <Label className="mb-1 text-xs">E-Posta</Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="yetkili@sirket.com"
              type="email"
              value={formData.email || ""}
            />
          </div>

          <div>
            <Label className="mb-1 text-xs">Telefon</Label>
            <PhoneInput
              onChange={(val) => setFormData({ ...formData, phone: val })}
              placeholder="+90 (5XX) XXX XX XX"
              value={formData.phone || ""}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              checked={formData.isPrimary}
              label="Bu şirketin birincil yetkilisi olarak ayarla"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPrimary: checked === true })
              }
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border/60 border-t pt-3.5">
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
              disabled={
                submitting ||
                !formData.firstName.trim() ||
                !formData.lastName.trim()
              }
              size="sm"
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Yetkiliyi Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
