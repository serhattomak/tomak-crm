/* Hallmark · component: quick-add-sales-rep-modal · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

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
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Hızlı Satış Temsilcisi Ekle
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ekibe yeni bir temsilci kaydedin ve anında atayın
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
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
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Satış Temsilcisi / Müşteri Yöneticisi"
              type="text"
              value={title}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-3.5 py-1.5 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-1.5 font-semibold text-white shadow-xs transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50"
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
      </div>
    </div>
  );
}
