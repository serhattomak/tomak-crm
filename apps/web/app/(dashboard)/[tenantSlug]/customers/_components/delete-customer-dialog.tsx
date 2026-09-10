"use client";

import { Button } from "@workspace/ui/components/button";
import type { CustomerListDto } from "@/lib/api-client";

interface DeleteCustomerDialogProps {
  customer: CustomerListDto | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCustomerDialog({
  customer,
  onClose,
  onConfirm,
}: DeleteCustomerDialogProps) {
  if (!customer) {
    return null;
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-md flex-col rounded-lg border border-border bg-card p-5 shadow-2xl">
        <h3 className="font-semibold text-base text-foreground">
          Müşteriyi Sil
        </h3>
        <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
          <strong className="font-semibold text-foreground">
            {customer.name}
          </strong>{" "}
          isimli müşteriyi ve buna bağlı yetkilileri, notları silmek
          istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            Vazgeç
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            type="button"
            variant="destructive"
          >
            Evet, Müşteriyi Sil
          </Button>
        </div>
      </div>
    </div>
  );
}
