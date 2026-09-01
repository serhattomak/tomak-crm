/* eslint-disable react-hooks/set-state-in-effect -- gallery variant sync and bounds correction are intentional sync effects */
"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageOff, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import * as React from "react";

export interface GalleryProps {
  alt: string;
  className?: string;
  images: string[];
  variantImage?: string | null;
}

export function Gallery({
  alt,
  className,
  images,
  variantImage,
}: GalleryProps) {
  const normalizedImages = React.useMemo(
    () => images.filter(Boolean),
    [images]
  );
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  // Keep activeIndex in bounds when images change
  React.useEffect(() => {
    if (normalizedImages.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= normalizedImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, normalizedImages.length]);

  // Variant image sync: when variantImage matches an image, select it
  React.useEffect(() => {
    if (!variantImage || normalizedImages.length === 0) {
      return;
    }
    const idx = normalizedImages.indexOf(variantImage);
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [variantImage, normalizedImages, activeIndex]);

  const activeImage = normalizedImages[activeIndex] ?? null;
  const hasImages = normalizedImages.length > 0;

  const openLightbox = () => {
    if (activeImage) {
      setIsLightboxOpen(true);
    }
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  // Keyboard: Esc closes lightbox
  React.useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLightboxOpen, closeLightbox]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main image — aspect-[4/3] rounded-[1rem] */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] border border-store-border bg-white shadow-store-sm">
        {activeImage ? (
          <button
            aria-label={`${alt} — büyütmek için tıklayın`}
            className="group relative h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            onClick={openLightbox}
            type="button"
          >
            <Image
              alt={alt}
              className="object-cover"
              fetchPriority={activeIndex === 0 ? "high" : "auto"}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              src={activeImage}
            />
            <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center rounded-full bg-white/90 px-2 py-1 font-medium font-sans text-[11px] text-store-ink opacity-0 shadow-store-sm backdrop-blur transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <ZoomIn
                aria-hidden="true"
                className="mr-1 h-3.5 w-3.5"
                strokeWidth={1.5}
              />
              Büyüt
            </span>
          </button>
        ) : (
          <div
            aria-label="Görsel yok"
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-store-muted px-4 text-center text-store-muted-foreground"
            role="img"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-store-sm">
              <ImageOff
                aria-hidden="true"
                className="h-7 w-7 text-store-muted-foreground"
                strokeWidth={1.5}
              />
            </span>
            <span className="font-medium font-sans text-store-muted-foreground text-xs">
              Görsel yakında
            </span>
            <span className="max-w-[14rem] font-sans text-[11px] text-store-muted-foreground/80 leading-relaxed">
              Bu ürün için görsel henüz eklenmedi
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails — square rounded-store-sm */}
      {hasImages ? (
        <div className="grid grid-cols-4 gap-2">
          {normalizedImages.slice(0, 8).map((src, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                aria-current={isActive ? "true" : undefined}
                aria-label={`${alt} görsel ${index + 1}`}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-store-sm border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring",
                  isActive
                    ? "border-store-primary shadow-store ring-2 ring-store-ring"
                    : "border-store-border hover:border-store-ring/50"
                )}
                key={src}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <Image
                  alt={`${alt} küçük görsel ${index + 1}`}
                  className="object-cover"
                  fill
                  sizes="20vw"
                  src={src}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Lightbox */}
      {isLightboxOpen && activeImage ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
        >
          <button
            aria-label="Kapat"
            className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={closeLightbox}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div
            className="relative aspect-[4/3] max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[1rem] bg-black shadow-store-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              alt={alt}
              className="object-contain"
              fill
              priority
              sizes="90vw"
              src={activeImage}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
