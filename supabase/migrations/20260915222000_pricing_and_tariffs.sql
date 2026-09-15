-- ==============================================================================
-- Migration: 20260915222000_pricing_and_tariffs.sql
-- Description: Ocean freight rates, towing rules, destination taxes, surcharges, and exchange rates
-- ==============================================================================

-- 1. Route Freight Rates (Ocean shipping base price by route, method, vehicle, powertrain)
CREATE TABLE IF NOT EXISTS public.route_freight_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.shipping_routes(id) ON DELETE CASCADE,
    shipping_method_id TEXT NOT NULL REFERENCES public.shipping_methods(id),
    vehicle_category_id TEXT NOT NULL REFERENCES public.vehicle_categories(id),
    powertrain_id TEXT NOT NULL REFERENCES public.powertrains(id),
    currency TEXT NOT NULL DEFAULT 'USD',
    base_amount NUMERIC(12, 2) NOT NULL CHECK (base_amount >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_freight_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_freight_lookup 
    ON public.route_freight_rates(route_id, shipping_method_id, vehicle_category_id, powertrain_id)
    WHERE is_active = true;

-- 2. Towing Rates (Inland Towing from Auction / City to USA Port)
-- Supports FIXED and RANGE modes
CREATE TABLE IF NOT EXISTS public.towing_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_location_id UUID NOT NULL REFERENCES public.purchase_locations(id) ON DELETE CASCADE,
    loading_port_id UUID NOT NULL REFERENCES public.ports(id) ON DELETE CASCADE,
    vehicle_category_id TEXT REFERENCES public.vehicle_categories(id),
    vehicle_condition_id TEXT REFERENCES public.vehicle_conditions(id),
    rate_type TEXT NOT NULL CHECK (rate_type IN ('fixed', 'range')),
    currency TEXT NOT NULL DEFAULT 'USD',
    fixed_amount NUMERIC(12, 2) CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
    min_amount NUMERIC(12, 2) CHECK (min_amount IS NULL OR min_amount >= 0),
    max_amount NUMERIC(12, 2) CHECK (max_amount IS NULL OR max_amount >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_towing_amounts CHECK (
        (rate_type = 'fixed' AND fixed_amount IS NOT NULL) OR
        (rate_type = 'range' AND min_amount IS NOT NULL AND max_amount IS NOT NULL AND max_amount >= min_amount)
    ),
    CONSTRAINT chk_towing_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_towing_lookup 
    ON public.towing_rates(purchase_location_id, loading_port_id)
    WHERE is_active = true;

-- 3. Surcharge Rules (Vehicle condition, electric battery hazmat, oversize, salvage surcharges)
CREATE TABLE IF NOT EXISTS public.surcharge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vehicle_category_id TEXT REFERENCES public.vehicle_categories(id),
    powertrain_id TEXT REFERENCES public.powertrains(id),
    vehicle_condition_id TEXT REFERENCES public.vehicle_conditions(id),
    charge_type TEXT NOT NULL CHECK (charge_type IN ('fixed', 'percentage')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Destination Tax Rules (Customs Duty & VAT by destination country)
CREATE TABLE IF NOT EXISTS public.destination_tax_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL REFERENCES public.countries(code) ON UPDATE CASCADE,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('customs_duty', 'vat')),
    name TEXT NOT NULL,
    percentage NUMERIC(6, 4) NOT NULL CHECK (percentage >= 0), -- e.g. 0.0500 for 5%
    calculation_base TEXT NOT NULL CHECK (calculation_base IN ('cif', 'vat_base')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tax_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- 5. Additional Charge Rules (Customs clearance, port documentation, terminal handling)
CREATE TABLE IF NOT EXISTS public.additional_charge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_port_id UUID REFERENCES public.ports(id) ON DELETE CASCADE,
    country_code TEXT REFERENCES public.countries(code),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('customs_clearance', 'port_handling', 'documentation', 'inspection', 'insurance', 'other')),
    charge_type TEXT NOT NULL CHECK (charge_type IN ('fixed', 'percentage')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_included_in_vat_base BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Exchange Rates (Manually administered USD to AED exchange rate with historical audit)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(10, 5) NOT NULL CHECK (rate > 0),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.staff_profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active 
    ON public.exchange_rates(from_currency, to_currency) 
    WHERE is_active = true;
