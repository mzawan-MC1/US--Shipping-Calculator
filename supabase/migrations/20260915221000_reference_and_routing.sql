-- ==============================================================================
-- Migration: 20260915221000_reference_and_routing.sql
-- Description: Geographic and maritime reference data, routes, and vehicle taxonomy
-- ==============================================================================

-- 1. Countries
CREATE TABLE IF NOT EXISTS public.countries (
    code TEXT PRIMARY KEY, -- ISO alpha-3 (e.g. USA, ARE) or common 3-letter code
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ports
CREATE TABLE IF NOT EXISTS public.ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- UN/LOCODE or port identifier (e.g. USNWK, USSAV, AEKLF)
    name TEXT NOT NULL,
    country_code TEXT NOT NULL REFERENCES public.countries(code) ON UPDATE CASCADE,
    state_or_city TEXT NOT NULL,
    is_loading_port BOOLEAN NOT NULL DEFAULT false,
    is_destination_port BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ports_country ON public.ports(country_code);
CREATE INDEX IF NOT EXISTS idx_ports_loading ON public.ports(is_loading_port) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ports_destination ON public.ports(is_destination_port) WHERE is_active = true;

-- 3. Vehicle Categories (Sedan, SUV, Van, Pickup, Bike)
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Powertrains (Petrol, Hybrid, Electric)
CREATE TABLE IF NOT EXISTS public.powertrains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Vehicle Conditions (Operable / Running, Non-Runner, Salvage Damaged, Forklift Required)
CREATE TABLE IF NOT EXISTS public.vehicle_conditions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Purchase Sources (Copart, IAAI, Manheim, ACV, ADESA, Dealership, Private Party)
CREATE TABLE IF NOT EXISTS public.purchase_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'auction', -- auction, dealer, private
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Purchase / Towing Pickup Locations (Auction branches, cities, ZIP metadata)
CREATE TABLE IF NOT EXISTS public.purchase_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_source_id TEXT NOT NULL REFERENCES public.purchase_sources(id) ON UPDATE CASCADE,
    name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    postal_code TEXT,
    default_loading_port_id UUID REFERENCES public.ports(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_locations_source ON public.purchase_locations(purchase_source_id);

-- 8. Shipping Methods (Consolidated Container LCL, Dedicated Container FCL)
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Shipping Routes (Origin Port -> Destination Port)
CREATE TABLE IF NOT EXISTS public.shipping_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_port_id UUID NOT NULL REFERENCES public.ports(id) ON DELETE RESTRICT,
    destination_port_id UUID NOT NULL REFERENCES public.ports(id) ON DELETE RESTRICT,
    transit_days_min INT NOT NULL CHECK (transit_days_min > 0),
    transit_days_max INT NOT NULL CHECK (transit_days_max >= transit_days_min),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_ports UNIQUE (origin_port_id, destination_port_id)
);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_origin ON public.shipping_routes(origin_port_id);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_destination ON public.shipping_routes(destination_port_id);
