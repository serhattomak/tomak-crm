"use client";

import { Gallery } from "@workspace/ui/components/gallery";
import * as React from "react";

export interface ProductGalleryProps {
  alt: string;
  className?: string;
  images: string[];
  variantImage?: string | null;
}

/**
 * ProductGallery — wraps @workspace/ui Gallery with product-specific logic.
 *
 * - Merges variantImage into images if not already present (prepend) so
 *   Gallery's variant sync can switch activeIndex correctly.
 * - Keeps priority LCP via Gallery's internal `priority={activeIndex===0}`.
 * - Deduplicates + filters empty strings, handles empty state via Gallery fallback.
 * - Re-exports Gallery primitive behaviour (lightbox, thumbnails, keyboard).
 */
export function ProductGallery({
  images,
  variantImage,
  alt,
  className,
}: ProductGalleryProps) {
  const mergedImages = React.useMemo(() => {
    const cleaned = images.filter(Boolean);
    const deduped = Array.from(new Set(cleaned));
    if (variantImage && !deduped.includes(variantImage)) {
      return [variantImage, ...deduped];
    }
    return deduped;
  }, [images, variantImage]);

  return (
    <Gallery
      alt={alt}
      className={className}
      images={mergedImages}
      variantImage={variantImage ?? null}
    />
  );
}

export type { GalleryProps } from "@workspace/ui/components/gallery";
// Re-export primitive for direct use and for file-level granularity checks
export { Gallery } from "@workspace/ui/components/gallery";

export default ProductGallery;
