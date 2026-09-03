-- ==============================================================================
-- MIGRATION: 20260903000007_product_seo.sql
-- DESCRIPTION: F2-4 — Product SEO slug + rich description (slug oto-üret + unique)
-- DEPENDS ON: 20260819000006_products_module.sql
-- ==============================================================================

-- 1. Yeni kolonlar (idempotent)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(200);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description VARCHAR(300);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rich_description TEXT;

-- 2. Tenant-bazlı benzersiz slug (NULL atlanır, çakışmada suffix backend/frontend üretir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_slug
    ON public.products(tenant_id, slug) WHERE slug IS NOT NULL;

-- 3. Slug oto-üret helper (Türkçe karaktersiz, lowercase, tireli)
CREATE OR REPLACE FUNCTION public.slugify_tr(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    s TEXT := lower(coalesce(input, ''));
BEGIN
    s := translate(s,
        'çÇğĞıIİöÖşŞüÜâêîôûàèéìòùáíóúýñßäëïöüÿ',
        'ccggiioosssuuaaeiou aeeeiooouuaiouyns aaeiouy');
    s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
    s := regexp_replace(s, '(^-+|-+$)', '', 'g');
    s := regexp_replace(s, '-{2,}', '-', 'g');
    IF s = '' THEN
        s := 'urun';
    END IF;
    RETURN left(s, 180);
END;
$$;

-- 4. Mevcut satırlar: boş slug'ları isimden doldur (çakışmada -2, -3 suffix)
DO $$
DECLARE
    r RECORD;
    base TEXT;
    candidate TEXT;
    n INT;
BEGIN
    FOR r IN SELECT id, tenant_id, name FROM public.products
             WHERE slug IS NULL OR btrim(slug) = '' LOOP
        base := public.slugify_tr(r.name);
        candidate := base;
        n := 2;
        WHILE EXISTS (SELECT 1 FROM public.products p
                      WHERE p.tenant_id = r.tenant_id
                        AND p.slug = candidate
                        AND p.id <> r.id) LOOP
            candidate := base || '-' || n::TEXT;
            n := n + 1;
        END LOOP;
        UPDATE public.products SET slug = candidate, updated_at = now()
        WHERE id = r.id;
    END LOOP;
END $$;

-- 5. Insert/Update trigger: slug boşsa isimden üret + tenant içinde benzersizleştir
CREATE OR REPLACE FUNCTION public.products_ensure_slug()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    base TEXT;
    candidate TEXT;
    n INT := 2;
BEGIN
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
        NEW.slug := public.slugify_tr(NEW.name);
    ELSE
        NEW.slug := public.slugify_tr(NEW.slug);
    END IF;
    base := NEW.slug;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.products p
                  WHERE p.tenant_id = NEW.tenant_id
                    AND p.slug = candidate
                    AND p.id <> NEW.id) LOOP
        candidate := left(base, 170) || '-' || n::TEXT;
        n := n + 1;
    END LOOP;
    NEW.slug := candidate;
    -- SEO başlık boşsa ürün adından türet (60 karakter vitrin standardı)
    IF (NEW.seo_title IS NULL OR btrim(NEW.seo_title) = '') AND NEW.name IS NOT NULL THEN
        NEW.seo_title := left(btrim(NEW.name), 60);
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_ensure_slug ON public.products;
CREATE TRIGGER trg_products_ensure_slug
    BEFORE INSERT OR UPDATE OF name, slug, seo_title ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.products_ensure_slug();
