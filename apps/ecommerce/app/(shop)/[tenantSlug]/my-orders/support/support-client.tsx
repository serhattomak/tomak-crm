"use client";

import { useCallback, useEffect, useState } from "react";
import { EcommerceClient, type PublicTicketDto } from "@/lib/ecommerce-client";
import { createClient } from "@/lib/supabase/client";

interface SupportClientProps {
  tenantSlug: string;
}

export function SupportClient({ tenantSlug }: SupportClientProps) {
  const [tickets, setTickets] = useState<PublicTicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Destek talepleriniz için giriş yapmalısınız.");
        setTickets([]);
        return;
      }
      const res = await EcommerceClient.getMyTickets(tenantSlug, token);
      if (res.success && res.data) {
        const data: unknown = res.data;
        const list = Array.isArray(data)
          ? (data as PublicTicketDto[])
          : ((data as { items?: PublicTicketDto[] })?.items ?? []);
        setTickets(list);
      } else {
        setError(res.message ?? "Talepler yüklenemedi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talepler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void fetchTickets();
    // 30s polling fallback for tickets/mine as well
    const interval = setInterval(() => void fetchTickets(), 30_000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(subject.trim() && description.trim())) {
      setError("Konu ve açıklama zorunlu.");
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
      const res = await EcommerceClient.createPublicTicket(
        { description: description.trim(), subject: subject.trim() },
        tenantSlug,
        token
      );
      if (res.success) {
        setSubject("");
        setDescription("");
        await fetchTickets();
      } else {
        setError(res.message ?? "Talep oluşturulamadı");
      }
    } finally {
      setSubmitting(false);
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
          Destek Taleplerim
        </h2>
        <p className="text-xs text-zinc-500">
          POST /api/public/tickets → helpdesk_tickets SenderType=Customer, CRM
          yanıtı GET /api/public/tickets/mine ile gelir.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-800 text-xs">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            key={ticket.id}
          >
            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {ticket.ticketNumber} — {ticket.subject}
            </p>
            <p className="text-xs text-zinc-500">
              {new Date(ticket.createdAt).toLocaleDateString("tr-TR")} ·{" "}
              {ticket.status} · {ticket.priority}
            </p>
          </div>
        ))}
        {tickets.length === 0 ? (
          <p className="rounded-xl border border-zinc-300 border-dashed p-4 text-xs text-zinc-500 dark:border-zinc-700">
            Henüz destek talebiniz yok.
          </p>
        ) : null}
      </div>

      <form
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        onSubmit={handleCreate}
      >
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Yeni destek talebi
        </h3>
        <input
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Konu *"
          value={subject}
        />
        <textarea
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sorununuzu açıklayın *"
          rows={3}
          value={description}
        />
        <button
          className="w-full rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? "Gönderiliyor…"
            : "Talebi oluştur — POST /api/public/tickets"}
        </button>
      </form>
    </div>
  );
}
