"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ChevronLeft, ChevronRight, Package, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { moveImage, removeImage, setCoverImage } from "./product-gallery-utils";

const MAIN_SIZES = "(max-width: 1024px) 100vw, 50vw";
const THUMB_SIZES = "(max-width: 640px) 20vw, 96px";

export interface ProductGalleryProps {
  className?: string;
  /** true ise kapak yap / sil / sırala kontrolleri gösterilir. */
  editable?: boolean;
  images: string[];
  /** Sıralama / kapak / silme sonrası güncel diziyle çağrılır. */
  onChange?: (nextImages: string[]) => void;
  productName: string;
  /**
   * Seçili varyantın kapak görseli. Varyant görseli `images` içindeyse o
   * thumb aktiflenir; liste dışı bir URL ise kapak rozetiyle öne çıkarılır.
   * `null`/boş ise ana ürün `images[0]` fallback uygulanır.
   */
  variantImage?: string | null;
}

/**
 * Varyant kapak görseli çözümleme: varyant görseli yoksa ana ürün
 * `images[0]` fallback döner; ikisi de boşsa `null`.
 */
export function resolveVariantCoverImage(
  variantImages?: string[] | null,
  productImages?: string[] | null
): string | null {
  const variantCover = variantImages?.find(
    (url) => typeof url === "string" && url.trim().length > 0
  );
  if (variantCover !== undefined) {
    return variantCover;
  }
  const productCover = productImages?.find(
    (url) => typeof url === "string" && url.trim().length > 0
  );
  return productCover ?? null;
}

function imageAlt(productName: string, index: number): string {
  return `${productName} — görsel ${index + 1}`;
}

export function ProductGallery({
  images,
  productName,
  editable = false,
  onChange,
  className = "",
  variantImage = null,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Aktif seçim dizi kısalınca geçersiz kalmasın.
  useEffect(() => {
    if (activeIndex >= images.length) {
      setActiveIndex(Math.max(images.length - 1, 0));
    }
  }, [images.length, activeIndex]);

  // Varyant seçimi değişince galeriyi doğru görsele senkronize et.
  // Varyant görseli liste dışıysa kapak (index 0) gösterilir; fallback images[0].
  useEffect(() => {
    if (variantImage === null || variantImage === "") {
      return;
    }
    const matchIndex = images.indexOf(variantImage);
    setActiveIndex(matchIndex >= 0 ? matchIndex : 0);
  }, [variantImage, images]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // Varyant görseli ürün galerisinde yoksa öne eklenerek gösterilir
  // (varyant kapak rozeti korunur, ana ürün images dizisi mutate edilmez).
  const displayImages =
    variantImage !== null &&
    variantImage !== "" &&
    !images.includes(variantImage)
      ? [variantImage, ...images]
      : images;

  const stepLightbox = useCallback(
    (direction: 1 | -1) => {
      setLightboxIndex((current) => {
        if (current === null || images.length === 0) {
          return current;
        }
        return (current + direction + images.length) % images.length;
      });
    },
    [images.length]
  );

  if (displayImages.length === 0) {
    return (
      <div
        className={`flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border border-border border-dashed bg-card text-muted-foreground ${className}`}
        role="status"
      >
        <Package aria-hidden="true" className="h-10 w-10" />
        <p className="font-medium text-xs">Bu ürünün görseli yok</p>
      </div>
    );
  }

  const safeActiveIndex = Math.min(activeIndex, displayImages.length - 1);
  const activeSrc = displayImages[safeActiveIndex] ?? "";
  const lightboxSrc =
    lightboxIndex === null ? null : (displayImages[lightboxIndex] ?? null);
  const isExternalVariantCover =
    variantImage !== null &&
    variantImage !== "" &&
    !images.includes(variantImage);

  const handleMove = (from: number, to: number) => {
    onChange?.(moveImage(images, from, to));
    setActiveIndex(to);
  };

  const handleSetCover = (index: number) => {
    onChange?.(setCoverImage(images, index));
    setActiveIndex(0);
  };

  const handleRemove = (index: number) => {
    onChange?.(removeImage(images, index));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ana görsel */}
      <button
        aria-label={`${imageAlt(productName, safeActiveIndex)} — büyüt`}
        className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-3xl border border-border bg-card shadow-xs focus-visible:outline-2 focus-visible:outline-blue-600"
        onClick={() => setLightboxIndex(safeActiveIndex)}
        type="button"
      >
        <Image
          alt={imageAlt(productName, safeActiveIndex)}
          fill
          priority={safeActiveIndex === 0}
          sizes={MAIN_SIZES}
          src={activeSrc}
          unoptimized
        />
        <span className="absolute top-3 left-3 rounded-lg bg-blue-600 px-2 py-0.5 font-bold text-3xs text-white shadow-xs">
          {isExternalVariantCover && safeActiveIndex === 0
            ? "Varyant"
            : "Kapak"}
        </span>
      </button>

      {/* Küçük resim şeridi */}
      <div
        aria-label="Ürün görselleri"
        aria-orientation="horizontal"
        className="flex gap-2 overflow-x-auto pb-1"
        role="listbox"
      >
        {displayImages.map((src, index) => {
          const isActive = index === activeIndex;
          const isDragging = index === dragIndex;
          return (
            <div
              aria-label={imageAlt(productName, index)}
              aria-selected={isActive}
              className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-card transition-all ${isActive ? "border-blue-600 ring-2 ring-blue-600/30" : "border-border hover:border-zinc-300 dark:hover:border-zinc-700"} ${isDragging ? "opacity-50" : ""}`}
              draggable={editable}
              key={`${src}-${index}`}
              onClick={() => setActiveIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={
                editable
                  ? (event) => {
                      event.preventDefault();
                    }
                  : undefined
              }
              onDragStart={
                editable
                  ? () => {
                      setDragIndex(index);
                    }
                  : undefined
              }
              onDrop={
                editable
                  ? (event) => {
                      event.preventDefault();
                      if (dragIndex !== null && dragIndex !== index) {
                        handleMove(dragIndex, index);
                      }
                      setDragIndex(null);
                    }
                  : undefined
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
              role="option"
              tabIndex={0}
            >
              <Image
                alt={imageAlt(productName, index)}
                className="object-cover"
                fill
                sizes={THUMB_SIZES}
                src={src}
                unoptimized
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded-md bg-blue-600 px-1.5 py-px font-bold text-3xs text-white">
                  {isExternalVariantCover ? "Varyant" : "Kapak"}
                </span>
              )}

              {editable && !(isExternalVariantCover && index === 0) && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-zinc-950/70 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    aria-label={`${index + 1}. görseli sola taşı`}
                    className="rounded-md p-1 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMove(index, index - 1);
                    }}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  {index !== 0 && (
                    <button
                      aria-label={`${index + 1}. görseli kapak yap`}
                      className="rounded-md px-1 py-0.5 font-bold text-3xs text-white transition-colors hover:bg-white/20"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetCover(index);
                      }}
                      type="button"
                    >
                      Kapak
                    </button>
                  )}
                  <button
                    aria-label={`${index + 1}. görseli sil`}
                    className="rounded-md p-1 text-white transition-colors hover:bg-white/20 hover:text-rose-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(index);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={`${index + 1}. görseli sağa taşı`}
                    className="rounded-md p-1 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                    disabled={index === displayImages.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMove(index, index + 1);
                    }}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc !== null && lightboxIndex !== null && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              closeLightbox();
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex h-screen w-screen max-w-none items-center justify-center gap-0 rounded-none bg-transparent p-4 shadow-none ring-0"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                stepLightbox(1);
              } else if (event.key === "ArrowLeft") {
                stepLightbox(-1);
              }
            }}
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">
              {productName} görsel önizleme
            </DialogTitle>
            <DialogClose asChild>
              <button
                aria-label="Önizlemeyi kapat"
                className="absolute top-4 right-4 rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-800"
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </DialogClose>

            {displayImages.length > 1 && (
              <>
                <button
                  aria-label="Önceki görsel"
                  className="absolute left-4 rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-800"
                  onClick={() => stepLightbox(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  aria-label="Sonraki görsel"
                  className="absolute right-4 rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-800"
                  onClick={() => stepLightbox(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </>
            )}

            <figure className="relative aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-3xl bg-zinc-900">
              <Image
                alt={imageAlt(productName, lightboxIndex)}
                fill
                sizes="100vw"
                src={lightboxSrc}
                unoptimized
              />
              <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-950/70 px-3 py-1 font-medium text-2xs text-white">
                {lightboxIndex + 1} / {displayImages.length}
                {lightboxIndex === 0
                  ? isExternalVariantCover
                    ? " · Varyant"
                    : " · Kapak"
                  : ""}
              </figcaption>
            </figure>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
