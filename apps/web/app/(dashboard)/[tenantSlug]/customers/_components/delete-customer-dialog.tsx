"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
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
    <ConfirmDialog
      confirmText="Evet, Müşteriyi Sil"
      description={`${customer.name} isimli müşteriyi ve buna bağlı yetkilileri, notları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      onConfirm={onConfirm}
      onOpenChange={onClose}
      open
      title="Müşteriyi Sil"
      variant="destructive"
    />
  );
}
