-- Migration: 20260917002619_storage_branding_and_tariffs.sql
-- Description: Create branding storage bucket, RLS policies, Arabic country/port fields, duplicate rate prevention indexes.

-- 1. Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS policies for branding bucket
DROP POLICY IF EXISTS "Public can view branding assets" ON storage.objects;
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Staff can insert branding assets" ON storage.objects;
CREATE POLICY "Staff can insert branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND (public.has_permission('cms.manage') OR public.has_permission('settings.manage')));

DROP POLICY IF EXISTS "Staff can update branding assets" ON storage.objects;
CREATE POLICY "Staff can update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND (public.has_permission('cms.manage') OR public.has_permission('settings.manage')))
WITH CHECK (bucket_id = 'branding' AND (public.has_permission('cms.manage') OR public.has_permission('settings.manage')));

DROP POLICY IF EXISTS "Staff can delete branding assets" ON storage.objects;
CREATE POLICY "Staff can delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND (public.has_permission('cms.manage') OR public.has_permission('settings.manage')));

-- 3. System settings RLS for public website branding and staff CMS management
DROP POLICY IF EXISTS "Public can view branding settings" ON public.system_settings;
CREATE POLICY "Public can view branding settings"
ON public.system_settings FOR SELECT TO public
USING (key IN ('company_profile', 'branding_settings'));

DROP POLICY IF EXISTS "Staff with cms.manage can update branding settings" ON public.system_settings;
CREATE POLICY "Staff with cms.manage can update branding settings"
ON public.system_settings FOR ALL TO authenticated
USING (has_permission('cms.manage') AND key IN ('company_profile', 'branding_settings'))
WITH CHECK (has_permission('cms.manage') AND key IN ('company_profile', 'branding_settings'));

-- 4. Add Arabic name columns to countries and ports
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.ports ADD COLUMN IF NOT EXISTS name_ar text;

UPDATE public.countries SET name_ar = 'الولايات المتحدة الأمريكية' WHERE code = 'USA' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.countries SET name_ar = 'الإمارات العربية المتحدة' WHERE code = 'ARE' AND (name_ar IS NULL OR name_ar = '');

UPDATE public.ports SET name_ar = 'ميناء نيوارك' WHERE code = 'USNWK' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.ports SET name_ar = 'ميناء سافانا' WHERE code = 'USSAV' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.ports SET name_ar = 'ميناء هيوستن' WHERE code = 'USHOU' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.ports SET name_ar = 'ميناء لوس أنجلوس' WHERE code = 'USLAX' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.ports SET name_ar = 'ميناء خورفكان' WHERE code = 'AEKLF' AND (name_ar IS NULL OR name_ar = '');
UPDATE public.ports SET name_ar = 'ميناء جبل علي' WHERE code = 'AEJEA' AND (name_ar IS NULL OR name_ar = '');

-- 5. Prevent duplicate active freight rates
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_route_freight_rate
ON public.route_freight_rates (route_id, shipping_method_id, vehicle_category_id, powertrain_id)
WHERE is_active = true AND effective_to IS NULL;

-- 6. Prevent duplicate active inland towing rates
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_towing_rate
ON public.towing_rates (purchase_location_id, loading_port_id, COALESCE(vehicle_category_id, ''), COALESCE(vehicle_condition_id, ''))
WHERE is_active = true AND effective_to IS NULL;

-- 7. Disallow same port for origin and destination in shipping_routes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_shipping_routes_ports_different'
    ) THEN
        ALTER TABLE public.shipping_routes
        ADD CONSTRAINT chk_shipping_routes_ports_different
        CHECK (origin_port_id <> destination_port_id);
    END IF;
END $$;
