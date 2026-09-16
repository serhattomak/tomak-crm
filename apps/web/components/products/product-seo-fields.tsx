"use client";

// F2-4 — SEO slug + rich description alanları.
// Slug oto-üret (Türkçe karaktersiz), benzersizlik suffix'i, 409 çakışmasında toast.
// Rich description: textarea (markdown-lite) + XSS korumalı render
// (`dangerouslySetInnerHTML` yok — metin React node'larına bölünür).
//
// CRM input standartları (ADR-0002): Input + Label. Renkler: zinc + blue.

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export interface ProductSeoValues {
  richDescription?: string;
  seoDescription?: string;
  seoTitle?: string;
  slug?: string;
}

const TURKISH_MAP: Record<string, string> = {
  I: "i",
  Ç: "c",
  Ö: "o",
  Ü: "u",
  ç: "c",
  ö: "o",
  ü: "u",
  Ğ: "g",
  ğ: "g",
  İ: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
};

/** Türkçe karaktersiz, lowercase, tireli slug üretir (DB `slugify_tr` ile eşlenik). */
export function slugifyTr(input: string): string {
  const mapped = input
    .split("")
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join("");
  const slug = mapped
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug === "" ? "urun" : slug.slice(0, 180);
}

/**
 * Benzersiz slug: `existing` içinde varsa `-2`, `-3` … suffix ekler.
 * Dönen `hadConflict`, çağrıcının toast göstermesi içindir.
 */
export function ensureUniqueSlug(
  base: string,
  existing: readonly string[]
): { hadConflict: boolean; slug: string } {
  const normalized = slugifyTr(base);
  if (!existing.includes(normalized)) {
    return { hadConflict: false, slug: normalized };
  }
  let n = 2;
  let candidate = `${normalized.slice(0, 170)}-${n}`;
  while (existing.includes(candidate)) {
    n += 1;
    candidate = `${normalized.slice(0, 170)}-${n}`;
  }
  return { hadConflict: true, slug: candidate };
}

/**
 * Rich description sanitizer: tüm HTML etiketlerini, `javascript:` şemalarını
 * ve event-handler kalıplarını düşürüp düz metin döndürür.
 */
export function sanitizeRichText(raw?: string): string {
  if (!raw || raw.trim() === "") {
    return "";
  }
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, 10_000);
}

const MAX_SEO_TITLE = 60;
const MAX_SEO_DESC = 160;

interface ProductSeoFieldsProps {
  existingSlugs?: readonly string[];
  onChange: (values: ProductSeoValues) => void;
  onSlugConflict?: (slug: string) => void;
  productName?: string;
  values: ProductSeoValues;
}

export function ProductSeoFields({
  existingSlugs = [],
  onChange,
  onSlugConflict,
  productName = "",
  values,
}: ProductSeoFieldsProps) {
  const [slugTouched, setSlugTouched] = useState(false);

  const handleNameSync = () => {
    const { hadConflict, slug } = ensureUniqueSlug(
      productName || values.slug || "urun",
      existingSlugs
    );
    setSlugTouched(true);
    onChange({ ...values, slug });
    if (hadConflict) {
      onSlugConflict?.(slug);
    }
  };

  const handleSlugChange = (next: string) => {
    setSlugTouched(true);
    const slug = slugifyTr(next);
    if (next.trim() !== "" && existingSlugs.includes(slug)) {
      const unique = ensureUniqueSlug(next, existingSlugs);
      onChange({ ...values, slug: unique.slug });
      onSlugConflict?.(unique.slug);
      return;
    }
    onChange({ ...values, slug });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1" htmlFor="product-seo-slug">
          SEO Slug (URL)
        </Label>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Input
              id="product-seo-slug"
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={slugifyTr(productName || "ornek-urun")}
              value={slugTouched ? (values.slug ?? "") : (values.slug ?? "")}
            />
          </div>
          <button
            aria-label="Slug oto-üret"
            className="rounded-xl border border-border p-2 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            onClick={handleNameSync}
            title="Ürün adından slug üret"
            type="button"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          Türkçe karaktersiz otomatik üretilir; çakışmada -2, -3 eklenir.
        </p>
      </div>

      <div>
        <Label className="mb-1" htmlFor="product-seo-title">
          SEO Başlığı ({(values.seoTitle ?? "").length}/{MAX_SEO_TITLE})
        </Label>
        <Input
          id="product-seo-title"
          maxLength={MAX_SEO_TITLE}
          onChange={(e) => onChange({ ...values, seoTitle: e.target.value })}
          placeholder={productName.slice(0, MAX_SEO_TITLE) || "Ürün başlığı"}
          value={values.seoTitle ?? ""}
        />
      </div>

      <div>
        <Label className="mb-1" htmlFor="product-seo-desc">
          SEO Açıklaması ({(values.seoDescription ?? "").length}/{MAX_SEO_DESC})
        </Label>
        <Input
          id="product-seo-desc"
          maxLength={MAX_SEO_DESC}
          onChange={(e) =>
            onChange({ ...values, seoDescription: e.target.value })
          }
          placeholder="Arama sonuçlarında görünecek kısa açıklama"
          value={values.seoDescription ?? ""}
        />
      </div>

      <div>
        <Label className="mb-1" htmlFor="product-rich-desc">
          Zengin Açıklama (markdown-lite)
        </Label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-zinc-900 shadow-2xs outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-zinc-100"
          id="product-rich-desc"
          onChange={(e) =>
            onChange({ ...values, richDescription: e.target.value })
          }
          placeholder="**Kalın**, *italik*, satır araları korunur. HTML yapıştırılırsa render'da temizlenir."
          rows={4}
          value={values.richDescription ?? ""}
        />
      </div>
    </div>
  );
}

/** XSS korumalı rich description önizleme (paragraf bölmeli, etiketsiz). */
export function ProductRichDescription({ text }: { text?: string }) {
  const clean = sanitizeRichText(text);
  if (clean === "") {
    return null;
  }
  const paragraphs = clean.split(/\n{2,}|\n/).filter((p) => p.trim() !== "");
  return (
    <div className="space-y-1.5 text-xs text-zinc-700 leading-relaxed dark:text-zinc-300">
      {paragraphs.map((p) => (
        <p key={p.slice(0, 32)}>{p}</p>
      ))}
    </div>
  );
}
