-- ==============================================================================
-- MIGRATION: 20260904000001_product_variant_images.sql
-- DESCRIPTION: F2-1 — product_variants.images TEXT[] (varyant görseli, fallback ana ürüne)
-- Backward compatible: nullable + default '{}', mevcut veri bozulmaz.
-- ==============================================================================

ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

-- Boş NULL kalıntılarını normalize et (kolon NOT NULL olduğundan eski NULL satırlar '{}' olur)
UPDATE public.product_variants SET images = '{}' WHERE images IS NULL;

COMMENT ON COLUMN public.product_variants.images IS 'Varyant görselleri (URL dizisi). Boşsa frontend ana ürün images[0] fallback uygular.';
