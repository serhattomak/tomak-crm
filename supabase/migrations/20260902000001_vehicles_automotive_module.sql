-- ==============================================================================
-- CRM.Modules.Vehicles & Automotive Intelligence Module
-- Migration: 20260902000001_vehicles_automotive_module.sql
-- ==============================================================================

-- 1. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    series VARCHAR(100),
    generation VARCHAR(100),
    platform VARCHAR(100),
    project_code VARCHAR(100),
    internal_code VARCHAR(100),
    model_year INT,
    trim VARCHAR(100),
    variant VARCHAR(100),
    segment VARCHAR(50),
    body_type VARCHAR(50),
    doors INT,
    seats INT,
    drive_type VARCHAR(50),
    market VARCHAR(100),
    country VARCHAR(100),
    plant VARCHAR(150),
    vin_prefix VARCHAR(50),
    engine VARCHAR(150),
    transmission VARCHAR(100),
    fuel VARCHAR(50),
    emission VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Development, Discontinued
    icon VARCHAR(20) NOT NULL DEFAULT '🚗',
    price_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_try NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Technical Specs (Structured JSONB)
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb, -- length, width, height, wheelbase, groundClearance, cargoVolume, fuelTank
    weights JSONB NOT NULL DEFAULT '{}'::jsonb, -- curb, gvw, payload
    engine_spec JSONB NOT NULL DEFAULT '{}'::jsonb, -- displacement, cylinders, power, torque, aspiration
    performance JSONB NOT NULL DEFAULT '{}'::jsonb, -- topSpeed, accel
    fuel_eco JSONB NOT NULL DEFAULT '{}'::jsonb, -- urban, combined, wltp
    suspension JSONB NOT NULL DEFAULT '{}'::jsonb, -- front, rear
    brakes JSONB NOT NULL DEFAULT '{}'::jsonb, -- front, rear
    tyres VARCHAR(100),
    safety JSONB NOT NULL DEFAULT '{}'::jsonb, -- airbags, adas (array)
    comfort JSONB NOT NULL DEFAULT '{}'::jsonb, -- climate, seats
    infotainment JSONB NOT NULL DEFAULT '{}'::jsonb, -- screen, features
    warranty JSONB NOT NULL DEFAULT '{}'::jsonb, -- vehicle, powertrain, corrosion
    equipment JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of strings

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON public.vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model ON public.vehicles(brand, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_segment ON public.vehicles(segment);

-- 2. VEHICLE SYSTEMS (EPC Main Categories)
CREATE TABLE IF NOT EXISTS public.vehicle_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    icon VARCHAR(20) NOT NULL DEFAULT '⚙️',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_systems_tenant ON public.vehicle_systems(tenant_id);

-- 3. VEHICLE SUBSYSTEMS (EPC Subcategories)
CREATE TABLE IF NOT EXISTS public.vehicle_subsystems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    system_id UUID NOT NULL REFERENCES public.vehicle_systems(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_subsystems_sys ON public.vehicle_subsystems(system_id);

-- 4. VEHICLE PARTS (EPC Multilingual Catalog)
CREATE TABLE IF NOT EXISTS public.vehicle_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    system_id UUID REFERENCES public.vehicle_systems(id) ON DELETE SET NULL,
    subsystem_id UUID REFERENCES public.vehicle_subsystems(id) ON DELETE SET NULL,
    part_number VARCHAR(100) NOT NULL,
    oem_number VARCHAR(100),
    name_tr VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    name_cn VARCHAR(200),
    qty_per_assembly INT NOT NULL DEFAULT 1,
    location VARCHAR(100),
    stock_quantity INT NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    supersession VARCHAR(200) DEFAULT '—',
    compatible_models JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of strings (e.g. "Voyager", "Ranger-X")
    hotspot_coord_x INT, -- Exploded view hotspot position %
    hotspot_coord_y INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_parts_tenant ON public.vehicle_parts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_sys ON public.vehicle_parts(system_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_part_no ON public.vehicle_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_oem ON public.vehicle_parts(oem_number);

-- 5. VEHICLE DOCUMENTS & TECHNICAL BULLETINS (TSB)
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    part_id UUID REFERENCES public.vehicle_parts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'PDF', -- PDF, Excel, Word, CAD, Image, Video
    category VARCHAR(100) NOT NULL DEFAULT 'Genel', -- TSB, Kullanım Kılavuzu, Homologasyon, Bakım, CAD, Garanti
    file_size VARCHAR(50) NOT NULL DEFAULT '1 MB',
    file_url TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_tenant ON public.vehicle_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON public.vehicle_documents(vehicle_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_subsystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS vehicles_tenant_isolation ON public.vehicles;
    CREATE POLICY vehicles_tenant_isolation ON public.vehicles
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS vehicle_systems_tenant_isolation ON public.vehicle_systems;
    CREATE POLICY vehicle_systems_tenant_isolation ON public.vehicle_systems
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS vehicle_subsystems_tenant_isolation ON public.vehicle_subsystems;
    CREATE POLICY vehicle_subsystems_tenant_isolation ON public.vehicle_subsystems
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS vehicle_parts_tenant_isolation ON public.vehicle_parts;
    CREATE POLICY vehicle_parts_tenant_isolation ON public.vehicle_parts
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

    DROP POLICY IF EXISTS vehicle_documents_tenant_isolation ON public.vehicle_documents;
    CREATE POLICY vehicle_documents_tenant_isolation ON public.vehicle_documents
        AS RESTRICTIVE
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
END $$;

-- ==============================================================================
-- PERMISSIONS SEED
-- ==============================================================================
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Vehicles.View', 'Araçları Görüntüle', 'Araç ve Parça kataloğunu görüntüleme', 'Vehicles'),
    (gen_random_uuid(), 'Vehicles.Create', 'Araç Oluştur', 'Yeni araç, parça ve doküman ekleme', 'Vehicles'),
    (gen_random_uuid(), 'Vehicles.Manage', 'Araç Yönet', 'Araç ve parça bilgilerini düzenleme', 'Vehicles'),
    (gen_random_uuid(), 'Vehicles.Delete', 'Araç Sil', 'Araç, parça ve doküman silme', 'Vehicles')
ON CONFLICT (code) DO NOTHING;
