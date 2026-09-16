/* Para biçimlendirme — tek kaynak.

   Eskiden `quotes/page.tsx` içinde yereldi (29 kullanım). Belge component'i ayrı dosyaya
   çıkarılınca kopyalamak yerine paylaşılan modüle taşındı: aynı işi iki yerde tutmak,
   ikisinin ayrışması için tek bir fırsat bırakır. */
export const formatCurrency = (amount: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    currency: currency || "TRY",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount || 0);
