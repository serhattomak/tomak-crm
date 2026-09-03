"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Combobox } from "@workspace/ui/components/combobox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { TagsInput } from "@/components/products/product-form-modal";
import {
  ApiClient,
  type BrandDto,
  type BulkAssignFailureDto,
  type BulkAssignRequest,
  type ProductCategoryDto,
} from "@/lib/api-client";

interface BulkAssignModalProps {
  brands?: BrandDto[];
  categories: ProductCategoryDto[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string) => void;
  selectedIds: string[];
  tenantId: string;
}

export function BulkAssignModal({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  tenantId,
  selectedIds,
  categories,
  brands = [],
}: BulkAssignModalProps) {
  // Category assignment
  const [assignCategory, setAssignCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [clearCategory, setClearCategory] = useState(false);

  // Brand assignment
  const [assignBrand, setAssignBrand] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");

  // Status assignment
  const [assignStatus, setAssignStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("Active");

  // Tags assignment
  const [assignTags, setAssignTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [appendTags, setAppendTags] = useState(true);

  // Image assignment
  const [assignImage, setAssignImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [appendImages, setAppendImages] = useState(true);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [failures, setFailures] = useState<BulkAssignFailureDto[]>([]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !(
        assignCategory ||
        assignBrand ||
        assignStatus ||
        assignTags ||
        assignImage
      )
    ) {
      onToast("Lütfen atanacak en az bir alan seçin.");
      return;
    }

    setSubmitting(true);
    setFailures([]);

    try {
      const payload: BulkAssignRequest = {
        productIds: selectedIds,
      };

      if (assignCategory) {
        payload.clearCategory = clearCategory;
        if (!clearCategory && selectedCategory) {
          payload.categoryId = selectedCategory;
        }
      }

      if (assignBrand) {
        payload.brand = selectedBrand.trim() || undefined;
      }

      if (assignStatus) {
        payload.status = selectedStatus;
      }

      if (assignTags) {
        payload.tags = tags;
        payload.appendTags = appendTags;
      }

      if (assignImage && imageUrl.trim()) {
        payload.images = [imageUrl.trim()];
        payload.appendImages = appendImages;
      }

      const res = await ApiClient.bulkAssignProducts(payload, tenantId);

      if (res.success && res.data) {
        const { updatedCount, failedCount, failures: failList } = res.data;

        if (failedCount === 0) {
          onToast(`${updatedCount} ürün başarıyla güncellendi.`);
          onSuccess();
          onClose();
        } else if (updatedCount > 0) {
          onToast(
            `${updatedCount} ürün güncellendi, ${failedCount} ürün güncellenemedi.`
          );
          setFailures(failList);
          onSuccess();
        } else {
          setFailures(failList);
          onToast("Toplu atama sırasında hata oluştu.");
        }
      } else {
        onToast(res.message || "İşlem başarısız oldu.");
      }
    } catch {
      onToast("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-zinc-200 bg-white p-6 text-xs shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Toplu Bilgi Ata / Güncelle
            </h3>
            <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
              Seçilen{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {selectedIds.length}
              </strong>{" "}
              ürün için toplu değişiklik yapın.
            </p>
          </div>
          <button
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Failures List if any */}
        {failures.length > 0 && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{failures.length} üründe hata oluştu:</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px]">
              {failures.slice(0, 5).map((f) => (
                <li key={f.productId}>
                  <span className="font-mono">{f.productId.slice(0, 8)}…</span>:{" "}
                  {f.reason}
                </li>
              ))}
              {failures.length > 5 && (
                <li>…ve {failures.length - 5} diğer hata</li>
              )}
            </ul>
          </div>
        )}

        <form
          className="flex-1 space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit}
        >
          {/* Section 1: Kategori Atama */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={assignCategory}
                id="check-category"
                onCheckedChange={(val) => setAssignCategory(!!val)}
              />
              <Label
                className="cursor-pointer font-bold text-zinc-800 dark:text-zinc-200"
                htmlFor="check-category"
              >
                Kategori Ata
              </Label>
            </div>

            {assignCategory && (
              <div className="mt-3 space-y-2 border-zinc-200/60 border-t pt-3 dark:border-zinc-700/60">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={clearCategory}
                    id="clear-cat"
                    onCheckedChange={(val) => {
                      setClearCategory(!!val);
                      if (val) {
                        setSelectedCategory("");
                      }
                    }}
                  />
                  <label
                    className="cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400"
                    htmlFor="clear-cat"
                  >
                    Kategoriyi kaldır (Kategorisiz yap)
                  </label>
                </div>

                {!clearCategory && (
                  <Combobox
                    clearable
                    onChange={(val) => setSelectedCategory(val)}
                    options={[
                      { label: "Kategori Seçin", value: "" },
                      ...categories.map((c) => ({
                        label: `${c.parentId ? `↳ ${c.fullPath || c.name}` : c.name} (${c.productsCount})`,
                        value: c.id,
                      })),
                    ]}
                    placeholder="Hedef kategori seçin..."
                    searchPlaceholder="Kategori ara..."
                    value={selectedCategory}
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 2: Marka Atama */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={assignBrand}
                id="check-brand"
                onCheckedChange={(val) => setAssignBrand(!!val)}
              />
              <Label
                className="cursor-pointer font-bold text-zinc-800 dark:text-zinc-200"
                htmlFor="check-brand"
              >
                Marka Ata
              </Label>
            </div>

            {assignBrand && (
              <div className="mt-3 border-zinc-200/60 border-t pt-3 dark:border-zinc-700/60">
                {brands.length > 7 ? (
                  <Combobox
                    clearable
                    onChange={(val) => setSelectedBrand(val)}
                    options={[
                      { label: "Markasız Yap", value: "" },
                      ...brands.map((b) => ({ label: b.name, value: b.name })),
                    ]}
                    placeholder="Marka seçin veya yazın..."
                    searchPlaceholder="Marka ara..."
                    value={selectedBrand}
                  />
                ) : brands.length > 0 ? (
                  <Select
                    onValueChange={(val) =>
                      setSelectedBrand(val === "none" ? "" : val)
                    }
                    value={selectedBrand || "none"}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Marka Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Markasız Yap</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    placeholder="Örn: Logitech, Apple, Nike"
                    value={selectedBrand}
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 3: Durum Güncelleme */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={assignStatus}
                id="check-status"
                onCheckedChange={(val) => setAssignStatus(!!val)}
              />
              <Label
                className="cursor-pointer font-bold text-zinc-800 dark:text-zinc-200"
                htmlFor="check-status"
              >
                Durum Değiştir
              </Label>
            </div>

            {assignStatus && (
              <div className="mt-3 border-zinc-200/60 border-t pt-3 dark:border-zinc-700/60">
                <Select
                  onValueChange={(val) => setSelectedStatus(val)}
                  value={selectedStatus}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Aktif</SelectItem>
                    <SelectItem value="Draft">Taslak</SelectItem>
                    <SelectItem value="Inactive">Pasif</SelectItem>
                    <SelectItem value="Discontinued">
                      Satıştan Kalktı
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Section 4: Etiketler */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={assignTags}
                  id="check-tags"
                  onCheckedChange={(val) => setAssignTags(!!val)}
                />
                <Label
                  className="cursor-pointer font-bold text-zinc-800 dark:text-zinc-200"
                  htmlFor="check-tags"
                >
                  Etiket Ata / Ekle
                </Label>
              </div>
              {assignTags && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Checkbox
                    checked={appendTags}
                    id="append-tags"
                    onCheckedChange={(val) => setAppendTags(!!val)}
                  />
                  <label className="cursor-pointer" htmlFor="append-tags">
                    Mevcut etiketlerin üzerine ekle
                  </label>
                </div>
              )}
            </div>

            {assignTags && (
              <div className="mt-3 border-zinc-200/60 border-t pt-3 dark:border-zinc-700/60">
                <TagsInput onChange={setTags} value={tags} />
              </div>
            )}
          </div>

          {/* Section 5: Toplu Görsel Ekle */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 transition-all dark:border-zinc-800 dark:bg-zinc-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={assignImage}
                  id="check-image"
                  onCheckedChange={(val) => setAssignImage(!!val)}
                />
                <Label
                  className="cursor-pointer font-bold text-zinc-800 dark:text-zinc-200"
                  htmlFor="check-image"
                >
                  Ortak Görsel Ata (URL)
                </Label>
              </div>
              {assignImage && (
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Checkbox
                    checked={appendImages}
                    id="append-images"
                    onCheckedChange={(val) => setAppendImages(!!val)}
                  />
                  <label className="cursor-pointer" htmlFor="append-images">
                    Mevcut görsellerin sonuna ekle
                  </label>
                </div>
              )}
            </div>

            {assignImage && (
              <div className="mt-3 space-y-2 border-zinc-200/60 border-t pt-3 dark:border-zinc-700/60">
                <Input
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/shared-product-image.jpg"
                  type="url"
                  value={imageUrl}
                />
                <p className="text-[10px] text-zinc-400">
                  Girilen görsel URL'si seçili tüm ürünlerin galeri listesine
                  atanacaktır.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-end gap-2 border-zinc-100 border-t pt-4 dark:border-zinc-800">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              onClick={onClose}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uygulanıyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Seçilenlere Uygula</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
