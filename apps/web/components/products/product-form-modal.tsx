"use client";

// F1-6 — Create/Edit modal wiring: images[] (upload + URL), Tags chip-input,
// Attributes key-value editörü, SKU/Barkod oto-üret + 409 çakışma yönetimi.
//
// Mevcut `CreateProductRequest` / `UpdateProductRequest` değişmeden kullanılır:
// `images?: string[]`, `tags?: string[]`, `attributes?: string` (JSON serialize).
// CRM input standartları (ADR-0002): Input, NumberInput, SelectField, Combobox.
// Renkler: zinc + blue (slate/violet/hex yasak). Görseller `next/image` ile.

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Link2, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ProductGallery } from "@/components/products/product-gallery";
import type { ApiResponse } from "@/lib/api-client";
import { ApiClient } from "@/lib/api-client";

export const MAX_PRODUCT_TAGS = 10;
export const MAX_PRODUCT_ATTRIBUTES = 20;
export const MAX_PRODUCT_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const STAGED_THUMB_SIZES = "96px";

export interface AttributeRow {
  key: string;
  value: string;
}

export interface StagedImage {
  file: File;
  previewUrl: string;
}

// ── Oto-üret yardımları ──────────────────────────────────────────────────────

/** SKU oto-üret: `PRD-<base36 zaman><3 rastgele>` (örn. PRD-LX2K9QA7F). */
export function generateSku(prefix = "PRD"): string {
  const time = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random()
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  return `${prefix}-${time}${rand}`;
}

function ean13CheckDigit(firstTwelve: string): string {
  let sum = 0;
  for (let i = 0; i < firstTwelve.length; i += 1) {
    const digit = Number.parseInt(firstTwelve[i] ?? "0", 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Barkod oto-üret: 869 önekli geçerli EAN-13 (check digit dahil). */
export function generateBarcode(): string {
  let body = "869";
  for (let i = 0; i < 9; i += 1) {
    body += String(Math.floor(Math.random() * 10));
  }
  return body + ean13CheckDigit(body);
}

// ── Attributes JSON serialize ────────────────────────────────────────────────

/** Backend'deki `attributes` JSON metnini editör satırlarına çevirir. */
export function parseAttributes(raw?: string): AttributeRow[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return Object.entries(parsed as Record<string, unknown>)
        .slice(0, MAX_PRODUCT_ATTRIBUTES)
        .map(([key, value]) => ({
          key,
          value:
            typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
        }));
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Editör satırlarını backend `attributes` JSON metnine çevirir.
 * Boş anahtarlı satırlar engellenir (atlanır), tekrarlı anahtarda ilk kazanır.
 */
export function serializeAttributes(rows: AttributeRow[]): string | undefined {
  const obj: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key === "" || obj[key] !== undefined) {
      continue;
    }
    obj[key] = row.value.trim();
  }
  return Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;
}

// ── 409 çakışma yönetimi ─────────────────────────────────────────────────────

const CONFLICT_MARKERS = ["409", "CONFLICT", "EXISTS", "DUPLICATE", "ALREADY"];

/** SKU/Barkod çakışması (HTTP 409) yanıtı mı? */
export function isConflictResponse(
  res: Pick<ApiResponse<unknown>, "errorCode" | "message"> | null | undefined
): boolean {
  if (!res) {
    return false;
  }
  const code = (res.errorCode ?? "").toUpperCase();
  if (CONFLICT_MARKERS.some((marker) => code.includes(marker))) {
    return true;
  }
  const message = (res.message ?? "").toLowerCase();
  return (
    message.includes("409") ||
    message.includes("çakış") ||
    message.includes("conflict") ||
    (message.includes("zaten") &&
      (message.includes("sku") ||
        message.includes("barkod") ||
        message.includes("barcode")))
  );
}

/** 409 yanıtını kullanıcı dostu Türkçe mesaja çevirir (toast + form hatası). */
export function conflictFriendlyMessage(
  res: Pick<ApiResponse<unknown>, "message"> | null | undefined,
  fallback: string
): string {
  const message = (res?.message ?? "").toLowerCase();
  if (message.includes("barkod") || message.includes("barcode")) {
    return "Bu barkod zaten kullanımda. Farklı bir barkod girin veya oto-üret kullanın.";
  }
  if (message.includes("sku")) {
    return "Bu SKU zaten kullanımda. Farklı bir SKU girin veya oto-üret kullanın.";
  }
  if (message !== "") {
    return res?.message ?? fallback;
  }
  return "Bu SKU/Barkod zaten kullanımda. Farklı bir değer girin veya oto-üret kullanın.";
}

// ── Staged upload yardımları ─────────────────────────────────────────────────

/** Bellekteki blob önizlemeleri serbest bırakır (leak önleme). */
export function revokeStagedImages(staged: StagedImage[]): void {
  for (const entry of staged) {
    URL.revokeObjectURL(entry.previewUrl);
  }
}

/**
 * Kaydetme sonrası staged dosyaları yükler (`POST /images/upload`).
 * Modal transactional kalır: seçim iptal edilirse sunucuya hiçbir şey gitmez.
 */
export async function uploadStagedImages(
  productId: string,
  staged: StagedImage[],
  tenantId: string,
  onToast: (msg: string) => void
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const entry of staged) {
    try {
      const res = await ApiClient.uploadProductImage(
        productId,
        entry.file,
        tenantId
      );
      if (res.success && res.data?.imageUrl) {
        uploaded.push(res.data.imageUrl);
      } else if (res.errorCode === "HTTP_409") {
        onToast("Görsel limiti aşıldı (en fazla 10).");
        break;
      } else {
        onToast(res.message ?? `${entry.file.name} yüklenemedi.`);
      }
    } catch {
      onToast(`${entry.file.name} yüklenirken hata oluştu.`);
    }
  }
  return uploaded;
}

// ── Tags chip-input (max 10) ─────────────────────────────────────────────────

export interface TagsInputProps {
  max?: number;
  onChange: (next: string[]) => void;
  value: string[];
}

export function TagsInput({
  onChange,
  value,
  max = MAX_PRODUCT_TAGS,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const parts = draft
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter((part) => part !== "");
    if (parts.length === 0) {
      setDraft("");
      return;
    }
    const next = [...value];
    for (const part of parts) {
      if (next.length >= max) {
        break;
      }
      const duplicate = next.some(
        (tag) => tag.toLowerCase() === part.toLowerCase()
      );
      if (!duplicate) {
        next.push(part);
      }
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        {value.map((tag) => (
          <span
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 font-semibold text-[11px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
            key={tag}
          >
            {tag}
            <button
              aria-label={`${tag} etiketini kaldır`}
              className="rounded p-0.5 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
              onClick={() => removeTag(tag)}
              type="button"
            >
              <X aria-hidden="true" className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          aria-label="Etiket ekle"
          className="min-w-24 flex-1 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={value.length >= max}
          onBlur={commitDraft}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setDraft(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            value.length >= max
              ? "Etiket limiti doldu"
              : "Etiket yaz, Enter'a bas…"
          }
          value={draft}
        />
      </div>
      <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
        {value.length}/{max} etiket — listede etiket filtresi olarak aranabilir.
      </p>
    </div>
  );
}

// ── Attributes key-value editörü (max 20) ────────────────────────────────────

export interface AttributesEditorProps {
  max?: number;
  onChange: (next: AttributeRow[]) => void;
  value: AttributeRow[];
}

export function AttributesEditor({
  onChange,
  value,
  max = MAX_PRODUCT_ATTRIBUTES,
}: AttributesEditorProps) {
  const updateRow = (index: number, patch: Partial<AttributeRow>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addRow = () => {
    if (value.length < max) {
      onChange([...value, { key: "", value: "" }]);
    }
  };

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div className="flex items-center gap-2" key={`attr-${index}`}>
          <div className="flex-1">
            <Input
              aria-label={`${index + 1}. özellik anahtarı`}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateRow(index, { key: event.target.value })
              }
              placeholder="Anahtar (örn. Renk)"
              value={row.key}
            />
          </div>
          <div className="flex-1">
            <Input
              aria-label={`${index + 1}. özellik değeri`}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateRow(index, { value: event.target.value })
              }
              placeholder="Değer (örn. Siyah)"
              value={row.value}
            />
          </div>
          <button
            aria-label={`${index + 1}. özelliği sil`}
            className="rounded-lg border border-border p-2 text-zinc-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500"
            onClick={() => removeRow(index)}
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {value.length}/{max} özellik — boş anahtarlı satırlar kaydedilmez.
        </p>
        <button
          className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 font-semibold text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          disabled={value.length >= max}
          onClick={addRow}
          type="button"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Özellik Ekle</span>
        </button>
      </div>
    </div>
  );
}

// ── Görsel alanı: URL ekleme + dosya stage + galeri ──────────────────────────

export interface ProductImagesFieldProps {
  images: string[];
  onChange: (next: string[]) => void;
  onStagedChange: (next: StagedImage[]) => void;
  onToast: (msg: string) => void;
  productName: string;
  staged: StagedImage[];
}

export function ProductImagesField({
  onChange,
  images,
  onStagedChange,
  onToast,
  productName,
  staged,
}: ProductImagesFieldProps) {
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal iptal ile kapanırsa staged blob URL'leri serbest bırakılır.
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(
    () => () => {
      revokeStagedImages(stagedRef.current);
    },
    []
  );

  const totalCount = images.length + staged.length;
  const room = MAX_PRODUCT_IMAGES - totalCount;

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = (event: FormEvent) => {
    event.preventDefault();
    const candidate = urlDraft.trim();
    if (candidate === "") {
      return;
    }
    let parsed: URL | null = null;
    try {
      parsed = new URL(candidate);
    } catch {
      parsed = null;
    }
    if (
      !parsed ||
      (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    ) {
      onToast("Geçerli bir görsel bağlantısı girin (http/https).");
      return;
    }
    if (images.includes(candidate)) {
      onToast("Bu görsel zaten ekli.");
      return;
    }
    if (room <= 0) {
      onToast("En fazla 10 görsel ekleyebilirsiniz.");
      return;
    }
    onChange([...images, candidate]);
    setUrlDraft("");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    if (room <= 0) {
      onToast("En fazla 10 görsel ekleyebilirsiniz.");
      resetFileInput();
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const valid: File[] = [];
    for (const file of picked) {
      if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        onToast(`${file.name}: yalnızca JPG, PNG veya WebP yükleyin.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        onToast(`${file.name}: dosya 5MB sınırını aşıyor.`);
        continue;
      }
      const alreadyStaged = staged.some(
        (entry) =>
          entry.file.name === file.name && entry.file.size === file.size
      );
      if (!alreadyStaged) {
        valid.push(file);
      }
    }
    if (valid.length > 0) {
      // Transactional: dosyalar kaydetme anına kadar staged kalır,
      // iptal edilirse sunucuya hiçbir şey yüklenmez.
      onStagedChange([
        ...staged,
        ...valid.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }
    resetFileInput();
  };

  const removeStaged = (previewUrl: string) => {
    const target = staged.find((entry) => entry.previewUrl === previewUrl);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onStagedChange(staged.filter((entry) => entry.previewUrl !== previewUrl));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Ürün Görselleri</Label>
        <span className="font-semibold text-[11px] text-zinc-400 dark:text-zinc-500">
          {totalCount}/{MAX_PRODUCT_IMAGES} — kapak ilk görseldir
        </span>
      </div>

      {/* URL ekleme + dosya yükleme */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={handleAddUrl}
        >
          <div className="flex-1">
            <Input
              aria-label="Görsel bağlantısı ekle"
              leftIcon={<Link2 aria-hidden="true" className="h-4 w-4" />}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUrlDraft(event.target.value)
              }
              placeholder="https://… görsel bağlantısı yapıştır"
              value={urlDraft}
            />
          </div>
          <button
            className="rounded-xl border border-border px-3 py-2 font-semibold text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            type="submit"
          >
            Ekle
          </button>
        </form>
        <button
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 font-semibold text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          disabled={room <= 0}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" />
          <span>Dosya Yükle</span>
        </button>
        <input
          accept=".jpg,.jpeg,.png,.webp"
          aria-label="Görsel dosyası seç"
          className="hidden"
          multiple
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleFiles(event.target.files)
          }
          ref={fileInputRef}
          type="file"
        />
      </div>

      {/* Kaydetmeyi bekleyen dosyalar */}
      {staged.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-blue-200/70 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-semibold text-[11px] text-blue-700 dark:text-blue-300">
            Kaydedince yüklenecek dosyalar ({staged.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {staged.map((entry) => (
              <div
                className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-card"
                key={entry.previewUrl}
              >
                <Image
                  alt={`${productName} — yüklenecek görsel ${entry.file.name}`}
                  fill
                  sizes={STAGED_THUMB_SIZES}
                  src={entry.previewUrl}
                  unoptimized
                />
                <button
                  aria-label={`${entry.file.name} dosyasını kaldır`}
                  className="absolute top-1 right-1 rounded-lg bg-zinc-950/70 p-1 text-white transition-colors hover:bg-zinc-950"
                  onClick={() => removeStaged(entry.previewUrl)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Galeri: kapak = images[0], sırala/kapak/sil */}
      {images.length > 0 && (
        <ProductGallery
          editable
          images={images}
          onChange={onChange}
          productName={productName}
        />
      )}
      {images.length === 0 && staged.length === 0 && (
        <p className="rounded-2xl border border-border border-dashed px-3 py-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          Henüz görsel yok — bağlantı yapıştırın veya dosya seçin. JPG/PNG/WebP,
          en fazla 5MB, en fazla 10 görsel.
        </p>
      )}
    </div>
  );
}
