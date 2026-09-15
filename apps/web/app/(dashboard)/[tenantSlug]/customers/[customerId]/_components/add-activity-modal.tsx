"use client";

import { Button } from "@workspace/ui/components/button";
import { DatePicker } from "@workspace/ui/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { TimePicker } from "@workspace/ui/components/time-picker";
import { X } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { type AddCustomerActivityRequest, ApiClient } from "@/lib/api-client";

interface AddActivityModalProps {
  customerId: string;
  initialType?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export function AddActivityModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  customerId,
  initialType = "Call",
}: AddActivityModalProps) {
  const [formData, setFormData] = useState({
    activityDate: new Date().toISOString().split("T")[0],
    activityTime: "14:00",
    description: "",
    subject: "",
    type: initialType || "Call",
  });

  useEffect(() => {
    if (initialType) {
      setFormData((prev) => ({ ...prev, type: initialType }));
    }
  }, [initialType]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.subject.trim()) {
        return;
      }

      setSubmitting(true);
      try {
        const combinedDateTime = new Date(
          `${formData.activityDate}T${formData.activityTime}:00`
        ).toISOString();

        const payload: AddCustomerActivityRequest = {
          activityType: formData.type,
          description: formData.description.trim() || undefined,
          performedAt: combinedDateTime,
          title: formData.subject.trim(),
        };

        const res = await ApiClient.addCustomerActivity(
          customerId,
          payload,
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
            Yeni Müşteri Aktivitesi Ekle
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
          <div>
            <Label className="mb-1 text-xs" required>
              Aktivite Türü
            </Label>
            <Select
              onValueChange={(val) => setFormData({ ...formData, type: val })}
              value={formData.type}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Call">Telefon Araması</SelectItem>
                <SelectItem value="Meeting">Toplantı / Görüşme</SelectItem>
                <SelectItem value="Email">E-Posta İletişimi</SelectItem>
                <SelectItem value="Note">Not / Bilgilendirme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 text-xs" required>
              Konu / Başlık
            </Label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Örn: Yıllık Sözleşme Yenileme Görüşmesi"
              required
              value={formData.subject}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="mb-1 text-xs" required>
                Tarih
              </Label>
              <DatePicker
                onChange={(val) =>
                  setFormData({ ...formData, activityDate: val })
                }
                placeholder="Tarih seçin"
                value={formData.activityDate}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs" required>
                Saat
              </Label>
              <TimePicker
                onChange={(val) =>
                  setFormData({ ...formData, activityTime: val })
                }
                value={formData.activityTime}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 text-xs">Açıklama & Detaylar</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background p-2.5 text-foreground text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Görüşülen maddeler ve kararlar..."
              rows={3}
              value={formData.description}
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
              disabled={submitting || !formData.subject.trim()}
              size="sm"
              type="submit"
            >
              {submitting ? "Kaydediliyor..." : "Aktiviteyi Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
