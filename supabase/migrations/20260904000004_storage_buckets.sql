-- Create product-images, crm-public, and crm-private buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('crm-public', 'crm-public', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('crm-private', 'crm-private', false) ON CONFLICT (id) DO NOTHING;

-- RLS policies for product-images
DROP POLICY IF EXISTS product_images_select ON storage.objects;
CREATE POLICY product_images_select ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_insert ON storage.objects;
CREATE POLICY product_images_insert ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_update ON storage.objects;
CREATE POLICY product_images_update ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_delete ON storage.objects;
CREATE POLICY product_images_delete ON storage.objects
    FOR DELETE
    USING (bucket_id = 'product-images');
