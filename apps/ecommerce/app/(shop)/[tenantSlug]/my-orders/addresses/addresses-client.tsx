"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type CustomerAddressDto,
  EcommerceClient,
} from "@/lib/ecommerce-client";
import { createClient } from "@/lib/supabase/client";

interface AddressesClientProps {
  tenantSlug: string;
}

const EMPTY_FORM = {
  addressLine1: "",
  city: "",
  country: "TR",
  district: "",
  postalCode: "",
  title: "",
  type: "both",
};

export function AddressesClient({ tenantSlug }: AddressesClientProps) {
  const [addresses, setAddresses] = useState<CustomerAddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError(
          "Adres defteri için giriş yapmalısınız (auth_user_id → customerId)."
        );
        setAddresses([]);
        return;
      }
      const res = await EcommerceClient.getAddresses(tenantSlug, token);
      if (res.success && res.data) {
        setAddresses(res.data);
      } else {
        setError(res.message ?? "Adresler yüklenemedi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adresler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(form.addressLine1.trim() && form.city.trim())) {
      setError("Adres satırı ve şehir zorunlu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Oturum bulunamadı.");
        return;
      }
      const res = await EcommerceClient.createAddress(
        {
          addressLine1: form.addressLine1.trim(),
          city: form.city.trim(),
          country: form.country,
          district: form.district.trim() || undefined,
          postalCode: form.postalCode.trim() || undefined,
          title: form.title.trim() || undefined,
          type: form.type,
        },
        tenantSlug,
        token
      );
      if (res.success) {
        setForm(EMPTY_FORM);
        await fetchAddresses();
      } else {
        setError(res.message ?? "Adres eklenemedi");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        return;
      }
      const res = await EcommerceClient.deleteAddress(id, tenantSlug, token);
      if (res.success) {
        await fetchAddresses();
      } else {
        setError(res.message ?? "Silinemedi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Adreslerim
        </h2>
        <p className="text-xs text-zinc-500">
          customer_addresses — billing/shipping, default işaretli. CRUD via
          POST/PUT/DELETE /api/public/addresses.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-800 text-xs">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((addr) => (
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            key={addr.id}
          >
            <div className="flex items-start justify-between">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                {addr.title ?? addr.label ?? addr.city}
                {addr.isDefaultBilling ? " · Varsayılan fatura ★" : ""}
                {addr.isDefaultShipping ? " · Varsayılan kargo ★" : ""}
              </p>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => void handleDelete(addr.id)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {addr.addressLine1}
              {addr.district ? `, ${addr.district}` : ""} — {addr.city}{" "}
              {addr.postalCode ?? ""} / {addr.country}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">Tip: {addr.type}</p>
          </div>
        ))}
        {addresses.length === 0 ? (
          <p className="rounded-xl border border-zinc-300 border-dashed p-4 text-xs text-zinc-500 dark:border-zinc-700">
            Henüz kayıtlı adres yok.
          </p>
        ) : null}
      </div>

      <form
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        onSubmit={handleCreate}
      >
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Yeni adres ekle
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Başlık (Ev, İş)"
            value={form.title}
          />
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            value={form.type}
          >
            <option value="both">Her ikisi</option>
            <option value="billing">Fatura</option>
            <option value="shipping">Teslimat</option>
          </select>
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) =>
              setForm((f) => ({ ...f, addressLine1: e.target.value }))
            }
            placeholder="Adres satırı *"
            value={form.addressLine1}
          />
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) =>
              setForm((f) => ({ ...f, district: e.target.value }))
            }
            placeholder="İlçe"
            value={form.district}
          />
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Şehir *"
            value={form.city}
          />
          <input
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            onChange={(e) =>
              setForm((f) => ({ ...f, postalCode: e.target.value }))
            }
            placeholder="Posta kodu"
            value={form.postalCode}
          />
        </div>
        <button
          className="w-full rounded-xl bg-zinc-900 px-4 py-2 font-semibold text-white text-xs disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? "Ekleniyor…"
            : "Adresi kaydet — POST /api/public/addresses"}
        </button>
      </form>
    </div>
  );
}
