-- ==============================================================================
-- Migration: 20260819000007_orders_module.sql
-- Description: Orders, Order Items, Order Payments, and Order Activities with RLS
-- ==============================================================================

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, PendingApproval, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid', -- Unpaid, PartiallyPaid, Paid, Refunded
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BankTransfer', -- BankTransfer, CreditCard, Cash, Check, OpenAccount
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    shipping_address TEXT,
    billing_address TEXT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    invoice_number VARCHAR(100),
    notes TEXT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_orders_tenant_number UNIQUE (tenant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer ON public.orders(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_order_date ON public.orders(tenant_id, order_date DESC);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'Adet',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 1.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    options_or_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 3. Order Payments Table
CREATE TABLE IF NOT EXISTS public.order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BankTransfer',
    reference_number VARCHAR(100),
    notes TEXT,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);

-- 4. Order Activities / Timeline Table
CREATE TABLE IF NOT EXISTS public.order_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- StatusChange, PaymentAdded, ItemUpdated, Created
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_activities_order ON public.order_activities(order_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_activities ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS orders_tenant_isolation ON public.orders;
CREATE POLICY orders_tenant_isolation ON public.orders
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS order_items_tenant_isolation ON public.order_items;
CREATE POLICY order_items_tenant_isolation ON public.order_items
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS order_payments_tenant_isolation ON public.order_payments;
CREATE POLICY order_payments_tenant_isolation ON public.order_payments
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

DROP POLICY IF EXISTS order_activities_tenant_isolation ON public.order_activities;
CREATE POLICY order_activities_tenant_isolation ON public.order_activities
    AS RESTRICTIVE
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
    );

-- 7. Seed Permissions for Orders
INSERT INTO public.permissions (id, code, name, description, module)
VALUES
    (gen_random_uuid(), 'Orders.View', 'Siparişleri Görüntüle', 'Sipariş listesini ve detaylarını görüntüleyebilir.', 'Orders'),
    (gen_random_uuid(), 'Orders.Create', 'Sipariş Oluştur', 'Müşteriler için yeni sipariş oluşturabilir.', 'Orders'),
    (gen_random_uuid(), 'Orders.Update', 'Sipariş Güncelle', 'Sipariş ve kalem bilgilerini düzenleyebilir.', 'Orders'),
    (gen_random_uuid(), 'Orders.Delete', 'Sipariş Sil', 'Siparişleri silebilir.', 'Orders'),
    (gen_random_uuid(), 'Orders.StatusChange', 'Sipariş Durumu Değiştir', 'Sipariş durumunu ve yaşam döngüsünü güncelleyebilir.', 'Orders'),
    (gen_random_uuid(), 'Orders.PaymentRecord', 'Tahsilat Kaydet', 'Sipariş için ödeme ve tahsilat kaydedebilir.', 'Orders')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to Owner, Admin and Super Admin roles across all tenants
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id FROM public.roles WHERE name IN ('Owner', 'Admin', 'Super Admin') LOOP
        FOR p IN SELECT id FROM public.permissions WHERE module = 'Orders' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (r.id, p.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
