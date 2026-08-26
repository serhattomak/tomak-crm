-- ==============================================================================
-- Migration: 20260826000003_recruitment_permissions.sql
-- Description: Recruitment permissions (Recruitment.View/Manage/Publish/ManageCandidates)
--              + tenant_modules entry for 'recruitment' + role grants to Owner/Admin.
--              Follows leaves (20260820000008) / attendance (20260820000010) pattern:
--              INSERT INTO permissions ON CONFLICT DO NOTHING + DO block for roles.
-- ==============================================================================

-- 1. Seed Permissions for Recruitment Module
INSERT INTO public.permissions (id, code, name, module, description)
VALUES
    (gen_random_uuid(), 'Recruitment.View', 'İşe Alım Görüntüleme', 'Recruitment', 'Aday havuzu, ilanlar ve başvuruları görüntüleyebilir.'),
    (gen_random_uuid(), 'Recruitment.Manage', 'İşe Alım Yönetimi', 'Recruitment', 'İlan, başvuru ve aşama oluşturabilir/güncelleyebilir, başvuru taşıyabilir.'),
    (gen_random_uuid(), 'Recruitment.Publish', 'İlan Yayınlama', 'Recruitment', 'İlanları yayınlayabilir, kapatabilir ve public başvuru linklerini yönetebilir.'),
    (gen_random_uuid(), 'Recruitment.ManageCandidates', 'Aday Silme ve KVKK Yönetimi', 'Recruitment', 'Adayları kalıcı silebilir ve KVKK anonimleştirme işlemlerini yönetebilir.')
ON CONFLICT (code) DO NOTHING;

-- 2. Grant Recruitment permissions to Owner / Admin / Super Admin roles
--    Uses nested loop pattern from leaves module (DO block, ON CONFLICT DO NOTHING)
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Recruitment' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 3. Enable Recruitment module for existing tenants (tenant_modules entry)
--    Idempotent: ON CONFLICT (tenant_id, module_key) DO NOTHING
INSERT INTO public.tenant_modules (id, tenant_id, module_key, is_enabled, display_name)
SELECT gen_random_uuid(), t.id, 'recruitment', true, 'İşe Alım'
FROM public.tenants t
ON CONFLICT (tenant_id, module_key) DO NOTHING;

-- 4. Append recruitment to default_modules of industry templates where missing
--    Keeps general/automotive/realestate templates in sync without duplicating.
UPDATE public.industry_templates
SET default_modules = array_append(default_modules, 'recruitment')
WHERE NOT ('recruitment' = ANY(default_modules));
