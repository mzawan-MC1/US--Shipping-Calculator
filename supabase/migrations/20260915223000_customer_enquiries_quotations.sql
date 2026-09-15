-- ==============================================================================
-- Migration: 20260915223000_customer_enquiries_quotations.sql
-- Description: Customers, vehicles, enquiry pipeline, immutable quotations, and audit trail
-- ==============================================================================

-- 1. Customers (Protected Customer PII)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    country TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- 2. Customer Vehicles
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_category_id TEXT NOT NULL REFERENCES public.vehicle_categories(id),
    powertrain_id TEXT NOT NULL REFERENCES public.powertrains(id),
    condition_id TEXT REFERENCES public.vehicle_conditions(id),
    make TEXT,
    model TEXT,
    year INT CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
    vin TEXT,
    lot_number TEXT,
    listing_url TEXT,
    declared_value_usd NUMERIC(12, 2) NOT NULL CHECK (declared_value_usd >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON public.customer_vehicles(customer_id);

-- 3. Enquiries (Inbound Leads and Operational Pipeline)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'interested', 'confirmed', 'completed', 'lost')) DEFAULT 'new',
    assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'web_calculator',
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned ON public.enquiries(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON public.enquiries(created_at DESC);

-- 4. Enquiry Status History
CREATE TABLE IF NOT EXISTS public.enquiry_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enquiry_history ON public.enquiry_status_history(enquiry_id);

-- 5. Quotations (Immutable Pricing Snapshots)
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE RESTRICT,
    version INT NOT NULL DEFAULT 1,
    idempotency_key TEXT UNIQUE,
    route_id UUID REFERENCES public.shipping_routes(id),
    pricing_snapshot JSONB NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(10, 5) NOT NULL,
    
    -- Financial breakdown fields (Fixed or Min/Max for range towing)
    subtotal_ocean_freight NUMERIC(12, 2) NOT NULL,
    towing_fee_min NUMERIC(12, 2),
    towing_fee_max NUMERIC(12, 2),
    is_towing_range BOOLEAN NOT NULL DEFAULT false,
    customs_clearance_fee NUMERIC(12, 2) NOT NULL,
    port_additional_charges NUMERIC(12, 2) NOT NULL,
    cif_value NUMERIC(12, 2) NOT NULL,
    customs_duty NUMERIC(12, 2) NOT NULL,
    vat_taxable_value NUMERIC(12, 2) NOT NULL,
    import_vat NUMERIC(12, 2) NOT NULL,
    
    -- Summary totals
    total_charges_usd_min NUMERIC(12, 2) NOT NULL,
    total_charges_usd_max NUMERIC(12, 2) NOT NULL,
    total_charges_aed_min NUMERIC(12, 2) NOT NULL,
    total_charges_aed_max NUMERIC(12, 2) NOT NULL,
    
    disclaimer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotations_enquiry ON public.quotations(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotations_reference ON public.quotations(reference_number);

-- 6. Quotation Line Items
CREATE TABLE IF NOT EXISTS public.quotation_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    source_rule_type TEXT,
    source_rule_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_line_items_quotation ON public.quotation_line_items(quotation_id);

-- 7. Audit Events (Append-only trail for sensitive operational changes)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_table TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'execute')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.audit_events(performed_at DESC);
