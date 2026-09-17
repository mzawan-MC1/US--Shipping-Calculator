-- Migration: 20260917214000_public_reference_rls_decoupling.sql
-- Description: Decouple combined public/staff SELECT policies on calculator reference tables to resolve anon "permission denied for function has_permission"

-- ====================================================================
-- 1. countries
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active countries" ON public.countries;
DROP POLICY IF EXISTS "Authorized staff can view all countries" ON public.countries;

CREATE POLICY "Public can view active countries"
ON public.countries
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all countries"
ON public.countries
FOR SELECT
TO authenticated
USING (public.has_permission('routes.view'));

-- ====================================================================
-- 2. ports
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active ports" ON public.ports;
DROP POLICY IF EXISTS "Authorized staff can view all ports" ON public.ports;

CREATE POLICY "Public can view active ports"
ON public.ports
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all ports"
ON public.ports
FOR SELECT
TO authenticated
USING (public.has_permission('routes.view'));

-- ====================================================================
-- 3. shipping_routes
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active shipping routes" ON public.shipping_routes;
DROP POLICY IF EXISTS "Authorized staff can view all shipping routes" ON public.shipping_routes;

CREATE POLICY "Public can view active shipping routes"
ON public.shipping_routes
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all shipping routes"
ON public.shipping_routes
FOR SELECT
TO authenticated
USING (public.has_permission('routes.view'));

-- ====================================================================
-- 4. shipping_methods
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active shipping methods" ON public.shipping_methods;
DROP POLICY IF EXISTS "Authorized staff can view all shipping methods" ON public.shipping_methods;

CREATE POLICY "Public can view active shipping methods"
ON public.shipping_methods
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all shipping methods"
ON public.shipping_methods
FOR SELECT
TO authenticated
USING (public.has_permission('routes.view'));

-- ====================================================================
-- 5. vehicle_categories
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active vehicle categories" ON public.vehicle_categories;
DROP POLICY IF EXISTS "Authorized staff can view all vehicle categories" ON public.vehicle_categories;

CREATE POLICY "Public can view active vehicle categories"
ON public.vehicle_categories
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all vehicle categories"
ON public.vehicle_categories
FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view'));

-- ====================================================================
-- 6. powertrains
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active powertrains" ON public.powertrains;
DROP POLICY IF EXISTS "Authorized staff can view all powertrains" ON public.powertrains;

CREATE POLICY "Public can view active powertrains"
ON public.powertrains
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all powertrains"
ON public.powertrains
FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view'));

-- ====================================================================
-- 7. vehicle_conditions
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active vehicle conditions" ON public.vehicle_conditions;
DROP POLICY IF EXISTS "Authorized staff can view all vehicle conditions" ON public.vehicle_conditions;

CREATE POLICY "Public can view active vehicle conditions"
ON public.vehicle_conditions
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all vehicle conditions"
ON public.vehicle_conditions
FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view'));

-- ====================================================================
-- 8. purchase_sources
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active purchase sources" ON public.purchase_sources;
DROP POLICY IF EXISTS "Authorized staff can view all purchase sources" ON public.purchase_sources;

CREATE POLICY "Public can view active purchase sources"
ON public.purchase_sources
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all purchase sources"
ON public.purchase_sources
FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view'));

-- ====================================================================
-- 9. purchase_locations
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active purchase locations" ON public.purchase_locations;
DROP POLICY IF EXISTS "Authorized staff can view all purchase locations" ON public.purchase_locations;

CREATE POLICY "Public can view active purchase locations"
ON public.purchase_locations
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all purchase locations"
ON public.purchase_locations
FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view'));

-- ====================================================================
-- 10. exchange_rates
-- ====================================================================
DROP POLICY IF EXISTS "Public can view active exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authorized staff can view all exchange rates" ON public.exchange_rates;

CREATE POLICY "Public can view active exchange rates"
ON public.exchange_rates
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all exchange rates"
ON public.exchange_rates
FOR SELECT
TO authenticated
USING (public.has_permission('settings.view'));

-- ====================================================================
-- 11. cms_notices
-- ====================================================================
DROP POLICY IF EXISTS "Public and staff can view active CMS notices" ON public.cms_notices;
DROP POLICY IF EXISTS "Public can view active cms notices" ON public.cms_notices;
DROP POLICY IF EXISTS "Authorized staff can view all cms notices" ON public.cms_notices;

CREATE POLICY "Public can view active cms notices"
ON public.cms_notices
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Authorized staff can view all cms notices"
ON public.cms_notices
FOR SELECT
TO authenticated
USING (public.has_permission('cms.view'));

-- ====================================================================
-- Ensure table-level SELECT access for anon and authenticated
-- ====================================================================
GRANT SELECT ON TABLE public.countries TO anon, authenticated;
GRANT SELECT ON TABLE public.ports TO anon, authenticated;
GRANT SELECT ON TABLE public.shipping_routes TO anon, authenticated;
GRANT SELECT ON TABLE public.shipping_methods TO anon, authenticated;
GRANT SELECT ON TABLE public.vehicle_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.powertrains TO anon, authenticated;
GRANT SELECT ON TABLE public.vehicle_conditions TO anon, authenticated;
GRANT SELECT ON TABLE public.purchase_sources TO anon, authenticated;
GRANT SELECT ON TABLE public.purchase_locations TO anon, authenticated;
GRANT SELECT ON TABLE public.exchange_rates TO anon, authenticated;
GRANT SELECT ON TABLE public.cms_notices TO anon, authenticated;

-- ====================================================================
-- Preserve has_permission security boundary (authenticated only)
-- ====================================================================
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
