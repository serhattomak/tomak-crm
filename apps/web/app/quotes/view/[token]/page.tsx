"use client";

import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  Award,
  Building,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ApiClient, type PublicQuoteViewDto } from "@/lib/api-client";

const formatCurrency = (amount: number, currency = "TRY") => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function PublicQuoteViewPage() {
  const params = useParams();
  const token = (params?.token as string) || "";

  const [quote, setQuote] = useState<PublicQuoteViewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Accept Modal
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptedByName, setAcceptedByName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccessAccepted, setIsSuccessAccepted] = useState(false);

  // Revision Feedback Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    if (!token) return;
    const loadQuote = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await ApiClient.getPublicQuote(token);
        if (res.success && res.data) {
          setQuote(res.data);
          setAcceptedByName(res.data.customerName || "");
        } else {
          setErrorMsg(res.message || "Teklif bulunamadı veya bağlantı geçersiz.");
        }
      } catch {
        setErrorMsg("Teklif yüklenirken bir hata meydana geldi.");
      } finally {
        setIsLoading(false);
      }
    };
    loadQuote();
  }, [token]);

  // Handle Accept
  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedByName.trim()) {
      toast.error("Lütfen adınızı girin");
      return;
    }

    setIsAccepting(true);
    try {
      const res = await ApiClient.publicAcceptQuote(token, {
        acceptedByName: acceptedByName.trim(),
        customerNotes: customerNotes.trim() || undefined,
      });

      if (res.success) {
        setIsSuccessAccepted(true);
        setIsAcceptModalOpen(false);
        toast.success("Teklif başarıyla onaylandı! Satış ekibimize bildirim iletildi.");
      } else {
        toast.error(res.message || "Onaylama işlemi gerçekleştirilemedi.");
      }
    } catch {
      toast.error("İşlem sırasında hata oluştu");
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Revision Request
  const handleRevisionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error("Lütfen talebinizi yazın");
      return;
    }

    setIsSendingFeedback(true);
    try {
      const res = await ApiClient.publicRequestRevision(token, feedback.trim());
      if (res.success) {
        toast.success("Talebiniz temsilcimize iletildi.");
        setIsRevisionModalOpen(false);
        setFeedback("");
      } else {
        toast.error(res.message || "İletilemedi.");
      }
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <span className="font-semibold text-xs">Teklif hazırlanıyor...</span>
      </div>
    );
  }

  if (errorMsg || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="font-bold text-base text-slate-900">Teklif Görüntülenemedi</h2>
          <p className="text-xs text-slate-500">{errorMsg || "Bağlantı geçersiz veya süresi dolmuş olabilir."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Floating Action Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-md flex flex-wrap items-center justify-between gap-3 sticky top-4 z-40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-900">{quote.quoteNumber}</span>
                <span className="rounded bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px] font-bold">
                  R{quote.revisionNumber}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 truncate max-w-xs block">{quote.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Yazdır</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <span>Revizyon İste</span>
            </button>

            {isSuccessAccepted || quote.status === "Accepted" ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-1.5 text-xs font-bold shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Teklif Onaylandı</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition"
              >
                <Check className="h-4 w-4" />
                <span>Teklifi Kabul Et & Onayla</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Proposal Card Document */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-4">
            <div>
              <h1 className="font-extrabold text-2xl text-blue-700 tracking-tight">
                {quote.companyName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">Resmi Satış & Hizmet Teklifi</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="font-mono font-extrabold text-lg text-slate-900 block">
                {quote.quoteNumber} (R{quote.revisionNumber})
              </span>
              <span className="text-xs text-slate-500 block">
                Tarih: {new Date().toLocaleDateString("tr-TR")}
              </span>
              {quote.validUntil && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  <Clock className="h-3 w-3" />
                  Son Geçerlilik: {new Date(quote.validUntil).toLocaleDateString("tr-TR")}
                </span>
              )}
            </div>
          </div>

          {/* Client & Description Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SAYIN / MÜŞTERİ:
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 mt-1">{quote.customerName}</h3>
              <p className="text-xs text-slate-600 mt-0.5 font-semibold text-blue-700">{quote.title}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TEKLİF DETAYI:
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Aşağıda detayları belirtilen ürün ve hizmetler için hazırlanan fiyat teklifimiz bilgilerinize sunulmuştur.
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Teklif Kalemleri
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Ürün / Hizmet Açıklaması</th>
                    <th className="py-3 px-3 text-center">Miktar</th>
                    <th className="py-3 px-3 text-right">Birim Fiyat</th>
                    <th className="py-3 px-3 text-center">İskonto</th>
                    <th className="py-3 px-3 text-center">KDV</th>
                    <th className="py-3 px-4 text-right">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {quote.items.map((item, idx) => (
                    <tr key={item.id} className={item.isOptional ? "bg-slate-50/50 opacity-70" : ""}>
                      <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                        {item.description && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">{item.description}</span>
                        )}
                        {item.isOptional && (
                          <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold mt-1 inline-block">
                            Opsiyonel Hizmet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {formatCurrency(item.unitPrice, quote.currency)}
                      </td>
                      <td className="py-3 px-3 text-center text-rose-600 font-bold">
                        {item.discountRate > 0 ? `%${item.discountRate}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">
                        %{item.taxRate}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(item.totalPrice, quote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-80 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-bold text-slate-900">{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Uygulanan İskonto:</span>
                  <span className="font-bold">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Hesaplanan KDV:</span>
                <span className="font-bold text-slate-900">{formatCurrency(quote.taxAmount, quote.currency)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">GENEL TOPLAM:</span>
                <span className="font-extrabold text-xl text-blue-700">
                  {formatCurrency(quote.totalAmount, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions Sections */}
          <div className="pt-6 border-t border-slate-200 space-y-4 text-xs text-slate-700">
            {quote.paymentTerms && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">Ödeme Şartları</h4>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{quote.paymentTerms}</p>
              </div>
            )}

            {quote.deliveryTerms && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">Teslimat & Sevkiyat Şartları</h4>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{quote.deliveryTerms}</p>
              </div>
            )}

            {quote.bankDetails && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1 font-mono">
                <h4 className="font-bold text-slate-900 text-xs font-sans">Banka Hesap & IBAN Bilgileri</h4>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">{quote.bankDetails}</p>
              </div>
            )}

            {quote.termsAndConditions && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">Genel Hükümler & Garanti Şartları</h4>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{quote.termsAndConditions}</p>
              </div>
            )}
          </div>

          {/* Footer Approval Call-to-action */}
          <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-sm text-blue-950">Teklifimizi Onaylamaya Hazır mısınız?</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Tek tıkla dijital onayınızı vererek sipariş sürecini anında başlatabilirsiniz.
              </p>
            </div>

            {isSuccessAccepted || quote.status === "Accepted" ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold shadow-md">
                <CheckCircle2 className="h-4 w-4" />
                <span>Teklif Onaylandı</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 text-white px-6 py-2.5 text-xs font-bold shadow-md hover:bg-blue-700 active:scale-[0.99] transition"
              >
                <Check className="h-4 w-4" />
                <span>Teklifi Kabul Et & Onayla</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Accept Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Teklifi Onayla</h3>
              </div>
              <button type="button" onClick={() => setIsAcceptModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAccept} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Onaylayan Yetkili Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz"
                  value={acceptedByName}
                  onChange={(e) => setAcceptedByName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Varsa Notunuz / Sipariş Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Örn: Faturayı şirket adresimize iletmenizi rica ederiz."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
                Bu teklifi onaylayarak yukarıda belirtilen şart ve koşulları kabul etmiş ve sipariş sürecini başlatmış olursunuz.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isAccepting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isAccepting ? "İşleniyor..." : "Onaylıyorum"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Revizyon Talebi İlet</h3>
              </div>
              <button type="button" onClick={() => setIsRevisionModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRevisionRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Değişiklik / Not Talebiniz *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Örn: Miktar revizyonu rica ediyoruz veya ödeme vadesini 45 gün yapabilir misiniz?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSendingFeedback}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSendingFeedback ? "İletiliyor..." : "Talebi Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
