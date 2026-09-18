-- ==============================================================================
-- Migration: 20260918160000_harden_attribute_pricing_security.sql
-- Description:
-- 1. Security hardening: Revoke execute from anon on deletion functions.
-- 2. Security hardening: Set immutable search_path on helper functions.
-- 3. Security hardening: Explicitly revoke table mutation privileges from anon.
-- 4. Attribute audit: Seed Large SUV, Caravan / RV, and Jet Ski as deactivated
--    categories with no tariffs or adjustment amounts.
-- ==============================================================================

-- 1. REVOKE EXECUTE FROM PUBLIC & ANON ON SENSITIVE RPCs
REVOKE ALL ON FUNCTION public.delete_vehicle_attribute(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_vehicle_attribute(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_attribute(TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_additional_charge_rule(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_additional_charge_rule(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_additional_charge_rule(UUID) TO authenticated, service_role;

-- 2. FIX SEARCH PATH ON IMMUTABLE FUNCTIONS (SUPABASE ADVISOR COMPLIANCE)
ALTER FUNCTION public.normalize_phone(text) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.normalize_phone(text, text) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.sanitize_rule_html(text) SET search_path TO 'public', 'pg_temp';

-- 3. DEFENSE-IN-DEPTH: PREVENT ANONYMOUS TABLE MUTATIONS
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vehicle_categories FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.powertrains FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vehicle_conditions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vehicle_category_compatibilities FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.attribute_price_adjustments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.additional_charge_rules FROM anon;

-- 4. SEED REQUESTED CATEGORIES AS DEACTIVATED WITH NO TARIFFS OR ADJUSTMENTS
INSERT INTO public.vehicle_categories (id, name, name_ar, icon, display_order, is_active, is_archived)
VALUES 
    ('large_suv', 'Large SUV', 'دفع رباعي كبير / Large SUV', 'truck', 6, false, false),
    ('caravan_rv', 'Caravan / RV', 'كرفان / مركبة ترفيهية', 'bus', 7, false, false),
    ('jet_ski', 'Jet Ski', 'دراجة مائية / جت سكي', 'anchor', 8, false, false)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order;
