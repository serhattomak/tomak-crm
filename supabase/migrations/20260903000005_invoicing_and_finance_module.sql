-- =====================================================
-- Invoicing, Cari Accounts & Finance Module Schema & RLS
-- Migration: 20260903000005_invoicing_and_finance_module.sql
-- =====================================================

-- 1. Cari Accounts (Müşteri / Tedarikçi / Personel Cari Kartları)
CREATE TABLE IF NOT EXISTS public.cari_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Customer', -- 'Customer', 'Supplier', 'Both', 'Personnel'
    tax_office VARCHAR(150) NULL,
    tax_number VARCHAR(50) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Türkiye',
    postal_code VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0.00,  -- Toplam Borç
    total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0.00, -- Toplam Alacak
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,      -- Güncel Bakiye (Borç - Alacak)
    credit_limit NUMERIC(18, 2) NOT NULL DEFAULT 0.00, -- Risk Limiti
    payment_term_days INT NOT NULL DEFAULT 30,          -- Vade Gün Sayısı
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cari_accounts_tenant ON public.cari_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cari_accounts_code ON public.cari_accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_cari_accounts_customer ON public.cari_accounts(tenant_id, customer_id);

-- 2. Invoices (Satış ve Alış Faturaları)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cari_account_id UUID NOT NULL REFERENCES public.cari_accounts(id) ON DELETE RESTRICT,
    order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    series VARCHAR(10) NOT NULL DEFAULT 'A',
    type VARCHAR(50) NOT NULL DEFAULT 'Sales', -- 'Sales', 'Purchase', 'SalesReturn', 'PurchaseReturn'
    profile VARCHAR(50) NOT NULL DEFAULT 'TICARIFATURA', -- 'TICARIFATURA', 'TEMELFATURA', 'EARSIVFATURA', 'IHRACAT'
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Issued', 'Sent', 'Approved', 'Cancelled', 'Paid', 'PartiallyPaid'
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    exchange_rate NUMERIC(18, 4) NOT NULL DEFAULT 1.0000,
    subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    withholding_total NUMERIC(18, 2) NOT NULL DEFAULT 0.00, -- Tevkifat
    grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    e_invoice_uuid VARCHAR(100) NULL,
    e_invoice_status VARCHAR(50) NULL,
    notes TEXT NULL,
    payment_terms TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cari ON public.invoices(tenant_id, cari_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(tenant_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(tenant_id, status);

-- 3. Invoice Items (Fatura Kalemleri)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'Adet',
    quantity NUMERIC(18, 4) NOT NULL DEFAULT 1.0000,
    unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00, -- 0, 1, 10, 20
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    withholding_rate VARCHAR(20) NULL, -- '5/10', '7/10', '9/10', etc.
    withholding_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- 4. Financial Accounts (Kasa ve Banka Hesapları)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Bank', -- 'Cash', 'Bank', 'Pos'
    bank_name VARCHAR(150) NULL,
    branch_name VARCHAR(150) NULL,
    account_number VARCHAR(100) NULL,
    iban VARCHAR(50) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_tenant ON public.financial_accounts(tenant_id);

-- 5. Financial Transactions (Kasa / Banka Hareketleri - Tahsilat, Ödeme, Masraf, Transfer)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    cari_account_id UUID NULL REFERENCES public.cari_accounts(id) ON DELETE SET NULL,
    invoice_id UUID NULL REFERENCES public.invoices(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'Collection' (Tahsilat), 'Payment' (Ödeme), 'Transfer' (Virman), 'Expense' (Masraf)
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    exchange_rate NUMERIC(18, 4) NOT NULL DEFAULT 1.0000,
    document_number VARCHAR(100) NULL,
    description TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_account ON public.financial_transactions(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_cari ON public.financial_transactions(cari_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date DESC);

-- 6. Cari Transactions (Cari Hesap Hareketleri & Ekstre)
CREATE TABLE IF NOT EXISTS public.cari_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cari_account_id UUID NOT NULL REFERENCES public.cari_accounts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'SalesInvoice', 'PurchaseInvoice', 'Payment', 'Collection', 'OpeningBalance', 'Cancellation'
    document_number VARCHAR(100) NULL,
    description TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NULL,
    debit NUMERIC(18, 2) NOT NULL DEFAULT 0.00,  -- Borç
    credit NUMERIC(18, 2) NOT NULL DEFAULT 0.00, -- Alacak
    balance_after NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    source_type VARCHAR(50) NULL, -- 'Invoice', 'FinancialTransaction'
    source_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cari_transactions_cari ON public.cari_transactions(cari_account_id, transaction_date DESC);

-- 7. Enable RLS on all Invoicing & Finance tables
ALTER TABLE public.cari_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cari_transactions ENABLE ROW LEVEL SECURITY;

-- 8. Isolation Policies
CREATE POLICY "Tenants isolate cari_accounts" ON public.cari_accounts
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY "Tenants isolate invoices" ON public.invoices
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY "Tenants isolate invoice_items" ON public.invoice_items
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY "Tenants isolate financial_accounts" ON public.financial_accounts
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY "Tenants isolate financial_transactions" ON public.financial_transactions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY "Tenants isolate cari_transactions" ON public.cari_transactions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
