"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { ApiClient, type EmployeeDto } from "@/lib/api-client";

interface QuickAddSalesRepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmployee: EmployeeDto) => void;
  tenantId: string;
}

export function QuickAddSalesRepModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
}: QuickAddSalesRepModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("Satış Temsilcisi");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(firstName.trim() && lastName.trim() && email.trim())) {
      setError("Lütfen ad, soyad ve e-posta alanlarını doldurun.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await ApiClient.createEmployee(
        {
          departmentId: undefined,
          email: email.trim(),
          firstName: firstName.trim(),
          hireDate: new Date().toISOString().split("T")[0],
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          title: title.trim() || "Satış Temsilcisi",
        },
        tenantId
      );

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || "Temsilci eklenirken bir hata oluştu.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

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
        className="flex w-full flex-col gap-0 overflow-hidden p-5 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="mb-4 flex items-center justify-between border-border border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Hızlı Satış Temsilcisi Ekle
              </DialogTitle>
              <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                Ekibe yeni bir temsilci kaydedin ve anında atayın
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>

        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 p-2.5 font-medium text-rose-700 text-xs dark:bg-rose-950/60 dark:text-rose-300">
            {error}
          </div>
        )}

        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Ad *
              </label>
              <input
                autoFocus
                className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Örn: Can"
                required
                type="text"
                value={firstName}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Soyad *
              </label>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Örn: Özkan"
                required
                type="text"
                value={lastName}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              E-Posta *
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="can.ozkan@sirket.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Telefon
            </label>
            <PhoneInput
              onChange={(val) => setPhone(val)}
              placeholder="+90 5XX XXX XX XX"
              value={phone}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              Ünvan
            </label>
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:text-zinc-100"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Satış Temsilcisi / Müşteri Yöneticisi"
              type="text"
              value={title}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-border border-t pt-3">
            <button
              className="rounded-xl border border-border px-3.5 py-1.5 font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Temsilciyi Ekle & Seç</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
