/**
 * Pure list helpers for `ProductGallery`.
 *
 * Extracted from `product-gallery.tsx` so they can be tested: the component is
 * a `.tsx` file, and `node --test` cannot load a module that contains JSX
 * without a bundler. Keeping them here means the test runs on Node's built-in
 * test runner with **no added dependency** — the same reason the guard and its
 * fixture check are dependency-free.
 *
 * These are pure, so they are also the parts of the gallery most worth testing.
 */

/** Kapak görsel her zaman dizinin ilk elemanıdır (`images[0]`). */
export function setCoverImage(images: string[], index: number): string[] {
  if (index <= 0 || index >= images.length) {
    return [...images];
  }
  const next = [...images];
  const [picked] = next.splice(index, 1);
  if (picked !== undefined) {
    next.unshift(picked);
  }
  return next;
}

export function removeImage(images: string[], index: number): string[] {
  if (index < 0 || index >= images.length) {
    return [...images];
  }
  return images.filter((_, i) => i !== index);
}

/** Öğeyi `from` konumundan `to` konumuna taşır (sınırlar kırpılır). */
export function moveImage(
  images: string[],
  from: number,
  to: number
): string[] {
  if (from < 0 || from >= images.length) {
    return [...images];
  }
  const clampedTo = Math.min(Math.max(to, 0), images.length - 1);
  if (clampedTo === from) {
    return [...images];
  }
  const next = [...images];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) {
    next.splice(clampedTo, 0, moved);
  }
  return next;
}
