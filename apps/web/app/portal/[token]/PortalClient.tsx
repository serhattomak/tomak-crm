"use client";

import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  FileSignature,
  FileSpreadsheet,
  MessageSquare,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { ContractSignModal } from "@/components/portal/contract-sign-modal";
import {
  ApiClient,
  type PublicContractDto,
  type PublicQuoteViewDto,
} from "@/lib/api-client";

const formatCurrency = (amount: number, currency = "TRY"): string =>
  new Intl.NumberFormat("tr-TR", {
    currency: currency || "TRY",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount || 0);

type PortalClientProps = {
  initialToken?: string;
};

export default function PortalClient({ initialToken }: PortalClientProps) {
  const params = useParams();
  const routeToken = (params?.token as string) || "";
  const token = initialToken || routeToken;

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

  // Contract State
  const [contract, setContract] = useState<PublicContractDto | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    const loadQuote = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // 1. Check if token is a contract
        const contractRes = await ApiClient.getPublicContract(token);
        if (contractRes.success && contractRes.data) {
          setContract(contractRes.data);
          return;
        }

        // 2. Prefer portal endpoint, fallback to public quote for backward compatibility
        const portalRes = await ApiClient.getPortalView(token);
        if (portalRes.success && portalRes.data) {
          setQuote(portalRes.data);
          setAcceptedByName(portalRes.data.customerName || "");
          return;
        }
        const fallback = await ApiClient.getPublicQuote(token);
        if (fallback.success && fallback.data) {
          setQuote(fallback.data);
          setAcceptedByName(fallback.data.customerName || "");
          return;
        }
        setErrorMsg(
          portalRes.message ||
            fallback.message ||
            "Belge veya teklif bulunamadı ya da bağlantı geçersiz."
        );
      } catch {
        setErrorMsg("Belge yüklenirken bir hata meydana geldi.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadQuote();
  }, [token]);

  // Handle Accept
  const handleAccept = async (e: React.FormEvent): Promise<void> => {
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
        toast.success(
          "Teklif başarıyla onaylandı! Satış ekibimize bildirim iletildi."
        );
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
  const handleRevisionRequest = async (e: React.FormEvent): Promise<void> => {
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-500">
        <RefreshCw className="mb-3 h-8 w-8 animate-spin text-blue-600" />
        <span className="font-semibold text-xs">Teklif hazırlanıyor...</span>
      </div>
    );
  }

  // Contract View Rendering
  if (contract) {
    const isSigned =
      contract.status === "Signed" || contract.status === "Active";

    return (
      <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Top banner / actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-0.5 font-bold text-[11px] text-violet-700">
                  Resmi Sözleşme
                </span>
                <span className="font-mono text-slate-500 text-xs">
                  {contract.contractNumber}
                </span>
              </div>
              <h1 className="mt-1 font-bold text-slate-900 text-xl md:text-2xl">
                {contract.title}
              </h1>
              <p className="text-slate-500 text-xs">
                Muhatap:{" "}
                <strong>{contract.customerName || "Sayın Müşterimiz"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-medium text-slate-700 text-xs shadow-xs hover:bg-slate-50 active:scale-95"
                onClick={() => window.print()}
                type="button"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                Yazdır / İndir
              </button>

              {isSigned ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 font-semibold text-emerald-700 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  İmzalandı
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white text-xs shadow-md shadow-violet-500/20 hover:bg-violet-700 active:scale-95"
                  onClick={() => setIsContractModalOpen(true)}
                  type="button"
                >
                  <FileSignature className="h-4 w-4" />
                  Sözleşmeyi İmzala
                </button>
              )}
            </div>
          </div>

          {/* Audit Trail Badge */}
          {isSigned && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-900 text-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <strong>Dijital Olarak Onaylandı & İmzalandı</strong>
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  İmzalayan: {contract.signedByName} • Tarih:{" "}
                  {contract.signedAt
                    ? new Date(contract.signedAt).toLocaleString("tr-TR")
                    : "Kayıtlı"}
                </p>
              </div>
            </div>
          )}

          {/* Contract Content Page / Paper */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-md md:p-12">
            <div
              className="prose prose-slate max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contract.contentHtml }}
            />

            <div className="mt-12 flex items-center justify-between border-slate-200 border-t pt-8 text-slate-500 text-xs">
              <div>
                <p className="font-semibold text-slate-700">Hizmet Sağlayıcı</p>
                <p className="mt-1">Dijital Olarak İmzalanmıştır</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">Müşteri / Alıcı</p>
                <p className="mt-1">
                  {isSigned
                    ? `${contract.signedByName} (İmzalandı)`
                    : "İmza Bekleniyor"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* E-Signature Modal */}
        <ContractSignModal
          contract={contract}
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          onSigned={(signedAt) => {
            setContract((prev: PublicContractDto | null) =>
              prev
                ? {
                    ...prev,
                    signedAt,
                    status: "Signed",
                  }
                : null
            );
          }}
          token={token}
        />
      </div>
    );
  }

  const isExpired = quote
    ? quote.status === "Expired" ||
      (quote.validUntil
        ? new Date(quote.validUntil).getTime() < Date.now()
        : false)
    : false;

  if (isExpired || errorMsg || !quote) {
    const expiredDate = quote?.validUntil
      ? new Date(quote.validUntil).toLocaleDateString("tr-TR")
      : null;
    const displayMessage = isExpired
      ? `Bu teklifin geçerlilik süresi dolmuştur. Son geçerlilik tarihi ${expiredDate} idi. Lütfen temsilcinizle iletişime geçerek güncel teklif talep edin.`
      : errorMsg || "Bağlantı geçersiz veya süresi dolmuş olabilir.";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="font-bold text-base text-slate-900">
            Teklif Görüntülenemedi
          </h2>
          <p className="text-slate-500 text-xs">{displayMessage}</p>
          {isExpired && expiredDate && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-[11px] text-amber-700">
              <Clock className="h-3 w-3" />
              Son Geçerlilik: {expiredDate}
            </span>
          )}
        </div>
      </div>
    );
  }

  const handlePrint = (): void => {
    if (!quote) {
      return;
    }
    const existingIframe = document.getElementById(
      "quote-print-iframe"
    ) as HTMLIFrameElement | null;
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "quote-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const formatCur = (amount: number): string =>
      new Intl.NumberFormat("tr-TR", {
        currency: quote.currency || "TRY",
        minimumFractionDigits: 2,
        style: "currency",
      }).format(amount || 0);

    const itemsHtml = quote.items
      .map(
        (item, idx) =>
          `
      <tr style="${item.isOptional ? "background-color: #fefce8;" : idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
        <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a;">${item.productName}</div>
          ${item.sku ? `<div style="font-size: 9px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>` : ""}
          ${item.description ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${item.description}</div>` : ""}
        </td>
        <td style="padding: 7px 8px; text-align: center; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${item.quantity} ${item.unit}</td>
        <td style="padding: 7px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCur(item.unitPrice)}</td>
        <td style="padding: 7px 8px; text-align: center; font-weight: 700; color: #e11d48; border-bottom: 1px solid #e2e8f0;">${item.discountRate > 0 ? `%${item.discountRate}` : "-"}</td>
        <td style="padding: 7px 8px; text-align: center; color: #475569; border-bottom: 1px solid #e2e8f0;">%${item.taxRate}</td>
        <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${formatCur(item.totalPrice)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>${quote.quoteNumber} - ${quote.title}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #fff; font-size: 11px; line-height: 1.4; -webkit-print-color-adjust: exact !important; }
          .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 10px 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
          .company-name { font-size: 18px; font-weight: 900; }
          .quote-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 800; }
          .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .party-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
          .items-table th { background: #0f172a; color: #ffffff; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 8px; text-align: left; }
          .totals-card { float: right; width: 280px; border: 2px solid #0f172a; background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .grand-total { border-top: 2px solid #0f172a; padding-top: 6px; font-weight: 900; font-size: 15px; color: #1d4ed8; display: flex; justify-content: space-between; }
          .terms { clear: both; font-size: 9px; margin-bottom: 16px; }
          .term-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 6px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; page-break-inside: avoid; }
          .sig-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 9px; }
          .sig-line { height: 45px; border-bottom: 1px dashed #cbd5e1; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="company-name">${quote.companyName}</div>
              <div style="color: #64748b; font-size: 10px;">Resmi Satış & Fiyat Teklifi</div>
            </div>
            <div style="text-align: right;">
              <span class="quote-badge">${quote.quoteNumber} (R${quote.revisionNumber})</span>
              <div style="font-size: 10px; color: #475569; margin-top: 4px;">Tarih: ${new Date().toLocaleDateString("tr-TR")}</div>
            </div>
          </div>

          <div class="party-grid">
            <div class="party-card">
              <div style="font-size: 8px; font-weight: 800; color: #2563eb;">SAYIN / MÜŞTERİ</div>
              <div style="font-size: 12px; font-weight: 800;">${quote.customerName}</div>
              <div style="font-size: 10px; color: #475569;">${quote.title}</div>
            </div>
            <div class="party-card">
              <div style="font-size: 8px; font-weight: 800; color: #64748b;">TEKLİFİ VEREN</div>
              <div style="font-size: 12px; font-weight: 800;">${quote.companyName}</div>
              <div style="font-size: 10px; color: #475569;">Durum: <b>${quote.status}</b></div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>Ürün / Hizmet Açıklaması</th>
                <th style="width: 70px; text-align: center;">Miktar</th>
                <th style="width: 90px; text-align: right;">Birim Fiyat</th>
                <th style="width: 55px; text-align: center;">İskonto</th>
                <th style="width: 45px; text-align: center;">KDV</th>
                <th style="width: 100px; text-align: right;">Toplam</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals-card">
            <div class="totals-row"><span>Ara Toplam:</span><b>${formatCur(quote.subtotal)}</b></div>
            ${quote.discountAmount > 0 ? `<div class="totals-row" style="color: #e11d48;"><span>İskonto:</span><b>-${formatCur(quote.discountAmount)}</b></div>` : ""}
            <div class="totals-row"><span>KDV:</span><b>${formatCur(quote.taxAmount)}</b></div>
            <div class="grand-total"><span>GENEL TOPLAM:</span><span>${formatCur(quote.totalAmount)}</span></div>
          </div>

          <div class="terms">
            ${quote.paymentTerms ? `<div class="term-item"><b>Ödeme Koşulları:</b> ${quote.paymentTerms}</div>` : ""}
            ${quote.deliveryTerms ? `<div class="term-item"><b>Teslimat Şartları:</b> ${quote.deliveryTerms}</div>` : ""}
            ${quote.bankDetails ? `<div class="term-item" style="font-family: monospace;"><b>Banka / IBAN:</b> ${quote.bankDetails}</div>` : ""}
            ${quote.termsAndConditions ? `<div class="term-item"><b>Genel Hükümler:</b> ${quote.termsAndConditions}</div>` : ""}
          </div>

          <div class="signatures">
            <div class="sig-box">
              <b>TEKLİFİ DÜZENLEYEN</b>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <b>TEKLİFİ ONAYLAYAN (MÜŞTERİ)</b>
              <div class="sig-line"></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 px-4 py-8 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Floating Action Bar */}
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-slate-900 text-xs">
                  {quote.quoteNumber}
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.2 font-bold text-[10px] text-blue-700">
                  R{quote.revisionNumber}
                </span>
              </div>
              <span className="block max-w-xs truncate text-[11px] text-slate-500">
                {quote.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 text-xs shadow-2xs transition hover:bg-slate-50"
              onClick={handlePrint}
              type="button"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 text-xs shadow-2xs transition hover:bg-slate-50"
              onClick={() => setIsRevisionModalOpen(true)}
              type="button"
            >
              <MessageSquare className="h-4 w-4 text-slate-500" />
              <span>Revizyon İste</span>
            </button>

            {isSuccessAccepted || quote.status === "Accepted" ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-1.5 font-bold text-emerald-800 text-xs shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Teklif Onaylandı</span>
              </span>
            ) : (
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-1.5 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-[0.99]"
                onClick={() => setIsAcceptModalOpen(true)}
                type="button"
              >
                <Check className="h-4 w-4" />
                <span>Teklifi Kabul Et & Onayla</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Proposal Card Document */}
        <div
          className="space-y-8 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl sm:p-12 print:rounded-none print:border-none print:p-0 print:shadow-none"
          id="quote-printable-document"
        >
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 border-slate-200 border-b pb-8 sm:flex-row">
            <div>
              {quote.companyLogoUrl ? (
                <Image
                  alt={`${quote.companyName} logo`}
                  className="h-10 w-auto object-contain"
                  height={40}
                  src={quote.companyLogoUrl}
                  width={160}
                />
              ) : null}
              <h1
                className={`font-extrabold text-2xl text-blue-700 tracking-tight ${quote.companyLogoUrl ? "mt-2" : ""}`}
              >
                {quote.companyName}
              </h1>
              <p className="mt-1 text-slate-500 text-xs">
                Resmi Satış & Hizmet Teklifi
              </p>
            </div>

            <div className="space-y-1 text-left sm:text-right">
              <span className="block font-extrabold font-mono text-lg text-slate-900">
                {quote.quoteNumber} (R{quote.revisionNumber})
              </span>
              <span className="block text-slate-500 text-xs">
                Tarih: {new Date().toLocaleDateString("tr-TR")}
              </span>
              {quote.validUntil && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-[11px] text-amber-700">
                  <Clock className="h-3 w-3" />
                  Son Geçerlilik:{" "}
                  {new Date(quote.validUntil).toLocaleDateString("tr-TR")}
                </span>
              )}
            </div>
          </div>

          {/* Client & Description Banner */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/60 bg-slate-50 p-5 sm:grid-cols-2">
            <div>
              <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                SAYIN / MÜŞTERİ:
              </span>
              <h3 className="mt-1 font-extrabold text-slate-900 text-sm">
                {quote.customerName}
              </h3>
              <p className="mt-0.5 font-semibold text-blue-700 text-slate-600 text-xs">
                {quote.title}
              </p>
            </div>

            <div>
              <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                TEKLİF DETAYI:
              </span>
              <p className="mt-1 text-slate-600 text-xs">
                Aşağıda detayları belirtilen ürün ve hizmetler için hazırlanan
                fiyat teklifimiz bilgilerinize sunulmuştur.
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Teklif Kalemleri
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-slate-200 border-b bg-slate-50 font-bold text-[11px] text-slate-600">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Ürün / Hizmet Açıklaması</th>
                    <th className="px-3 py-3 text-center">Miktar</th>
                    <th className="px-3 py-3 text-right">Birim Fiyat</th>
                    <th className="px-3 py-3 text-center">İskonto</th>
                    <th className="px-3 py-3 text-center">KDV</th>
                    <th className="px-4 py-3 text-right">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {quote.items.map((item, idx) => (
                    <tr
                      className={
                        item.isOptional ? "bg-slate-50/50 opacity-70" : ""
                      }
                      key={item.id}
                    >
                      <td className="px-4 py-3 font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-900">
                          {item.productName}
                        </span>
                        {item.description && (
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {item.description}
                          </span>
                        )}
                        {item.isOptional && (
                          <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.2 font-bold text-[9px] text-amber-800">
                            Opsiyonel Hizmet
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatCurrency(item.unitPrice, quote.currency)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-rose-600">
                        {item.discountRate > 0 ? `%${item.discountRate}` : "-"}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500">
                        %{item.taxRate}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
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
            <div className="w-80 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(quote.subtotal, quote.currency)}
                </span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between font-medium text-rose-600">
                  <span>Uygulanan İskonto:</span>
                  <span className="font-bold">
                    -{formatCurrency(quote.discountAmount, quote.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Hesaplanan KDV:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(quote.taxAmount, quote.currency)}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-slate-200 border-t pt-2">
                <span className="font-bold text-slate-900 text-sm">
                  GENEL TOPLAM:
                </span>
                <span className="font-extrabold text-blue-700 text-xl">
                  {formatCurrency(quote.totalAmount, quote.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions Sections */}
          <div className="space-y-4 border-slate-200 border-t pt-6 text-slate-700 text-xs">
            {quote.paymentTerms && (
              <div className="space-y-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Ödeme Şartları
                </h4>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {quote.paymentTerms}
                </p>
              </div>
            )}

            {quote.deliveryTerms && (
              <div className="space-y-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Teslimat & Sevkiyat Şartları
                </h4>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {quote.deliveryTerms}
                </p>
              </div>
            )}

            {quote.bankDetails && (
              <div className="space-y-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 font-mono">
                <h4 className="font-bold font-sans text-slate-900 text-xs">
                  Banka Hesap & IBAN Bilgileri
                </h4>
                <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                  {quote.bankDetails}
                </p>
              </div>
            )}

            {quote.termsAndConditions && (
              <div className="space-y-1 rounded-2xl border border-slate-200/60 bg-slate-50 p-4">
                <h4 className="font-bold text-slate-900 text-xs">
                  Genel Hükümler & Garanti Şartları
                </h4>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {quote.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          {/* Footer Approval Call-to-action */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:flex-row">
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-blue-950 text-sm">
                Teklifimizi Onaylamaya Hazır mısınız?
              </h3>
              <p className="mt-0.5 text-blue-700 text-xs">
                Tek tıkla dijital onayınızı vererek sipariş sürecini anında
                başlatabilirsiniz.
              </p>
            </div>

            {isSuccessAccepted || quote.status === "Accepted" ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 font-bold text-white text-xs shadow-md">
                <CheckCircle2 className="h-4 w-4" />
                <span>Teklif Onaylandı</span>
              </span>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 font-bold text-white text-xs shadow-md transition hover:bg-blue-700 active:scale-[0.99]"
                onClick={() => setIsAcceptModalOpen(true)}
                type="button"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Teklifi Onayla
                </h3>
              </div>
              <button
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                onClick={() => setIsAcceptModalOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-3 text-xs" onSubmit={handleAccept}>
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-700"
                  htmlFor="acceptedByName"
                >
                  Onaylayan Yetkili Adı Soyadı *
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  id="acceptedByName"
                  onChange={(e) => setAcceptedByName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  type="text"
                  value={acceptedByName}
                />
              </div>

              <div>
                <label
                  className="mb-1 block font-semibold text-slate-700"
                  htmlFor="customerNotes"
                >
                  Varsa Notunuz / Sipariş Açıklaması
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  id="customerNotes"
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Örn: Faturayı şirket adresimize iletmenizi rica ederiz."
                  rows={2}
                  value={customerNotes}
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
                Bu teklifi onaylayarak yukarıda belirtilen şart ve koşulları
                kabul etmiş ve sipariş sürecini başlatmış olursunuz.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 text-xs hover:bg-slate-100"
                  onClick={() => setIsAcceptModalOpen(false)}
                  type="button"
                >
                  Vazgeç
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                  disabled={isAccepting}
                  type="submit"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Revizyon Talebi İlet
                </h3>
              </div>
              <button
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                onClick={() => setIsRevisionModalOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-3 text-xs"
              onSubmit={handleRevisionRequest}
            >
              <div>
                <label
                  className="mb-1 block font-semibold text-slate-700"
                  htmlFor="revisionFeedback"
                >
                  Değişiklik / Not Talebiniz *
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900 text-xs focus:border-blue-500 focus:outline-none"
                  id="revisionFeedback"
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Örn: Miktar revizyonu rica ediyoruz veya ödeme vadesini 45 gün yapabilir misiniz?"
                  required
                  rows={4}
                  value={feedback}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-xl px-4 py-2 font-semibold text-slate-600 text-xs hover:bg-slate-100"
                  onClick={() => setIsRevisionModalOpen(false)}
                  type="button"
                >
                  Vazgeç
                </button>
                <button
                  className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white text-xs shadow-xs transition hover:bg-purple-700 disabled:opacity-50"
                  disabled={isSendingFeedback}
                  type="submit"
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
