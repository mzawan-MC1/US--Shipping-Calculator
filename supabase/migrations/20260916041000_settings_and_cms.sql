-- Migration: 20260916041000_settings_and_cms.sql
-- Description: Persistent system settings and CMS notices schema with RBAC RLS policies and seeds.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_by uuid REFERENCES public.staff_profiles(id),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view system settings"
ON public.system_settings FOR SELECT TO authenticated
USING (public.has_permission('settings.view') OR public.has_permission('staff.view'));

CREATE POLICY "Staff can update system settings"
ON public.system_settings FOR ALL TO authenticated
USING (public.has_permission('settings.manage'))
WITH CHECK (public.has_permission('settings.manage'));

-- Seed system settings
INSERT INTO public.system_settings (key, value, description)
VALUES
(
    'company_profile',
    jsonb_build_object(
        'company_name', 'Fakher Alam Used Cars Shipping',
        'company_name_ar', 'فاخر علم لشحن السيارات المستعملة',
        'tax_trn', '100456789000003',
        'headquarters_address', 'Industrial Area 4, Sharjah, United Arab Emirates',
        'headquarters_address_ar', 'المنطقة الصناعية 4، الشارقة، الإمارات العربية المتحدة',
        'support_email', 'info@fakheralamshipping.com',
        'support_phone', '+971 50 123 4567',
        'whatsapp_number', '+971501234567'
    ),
    'Official company contact, tax TRN, and regional headquarters details'
),
(
    'operational_parameters',
    jsonb_build_object(
        'quotation_validity_days', 14,
        'default_customs_duty_rate', 0.05,
        'default_vat_rate', 0.05,
        'default_currency', 'USD',
        'settlement_currency', 'AED',
        'auto_assign_leads', true
    ),
    'Operational rules for quotation expiration, default tax rates, and lead distribution'
)
ON CONFLICT (key) DO NOTHING;

-- CMS Notices & Announcements Table
CREATE TABLE IF NOT EXISTS public.cms_notices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    title_ar text,
    content text NOT NULL,
    content_ar text,
    banner_type text NOT NULL DEFAULT 'info' CHECK (banner_type IN ('info', 'warning', 'success', 'announcement')),
    display_location text NOT NULL DEFAULT 'calculator' CHECK (display_location IN ('all', 'calculator', 'home', 'portal')),
    is_active boolean NOT NULL DEFAULT true,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cms_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and staff can view active CMS notices"
ON public.cms_notices FOR SELECT
USING (is_active = true OR public.has_permission('cms.view'));

CREATE POLICY "Staff can manage CMS notices"
ON public.cms_notices FOR ALL TO authenticated
USING (public.has_permission('cms.manage'))
WITH CHECK (public.has_permission('cms.manage'));

-- Seed CMS notices
INSERT INTO public.cms_notices (title, title_ar, content, content_ar, banner_type, display_location, is_active, display_order)
VALUES
(
    'Reliable Weekly Sailings from USA to UAE',
    'رحلات بحرية أسبوعية منتظمة من الولايات المتحدة إلى الإمارات',
    'Containerized and RoRo auto shipping departing every Tuesday and Friday from Newark, Savannah, Houston, and Los Angeles directly to Jebel Ali, Port Khalid, and Sharjah.',
    'شحن سيارات بالحاويات وخدمة RoRo كل يوم ثلاثاء وجمعة من نيوآرك، سافانا، هيوستن، ولوس أنجلوس مباشرة إلى جبل علي، ميناء خالد، والشارقة.',
    'announcement',
    'calculator',
    true,
    1
),
(
    'Standard UAE Customs & Clearance Support',
    'خدمات التخليص الجمركي المعتمدة في الإمارات',
    'Complete customs inspection, VCC document preparation, and terminal clearance handling provided upon vessel discharge.',
    'نوفر التخليص الجمركي الشامل وإصدار وثائق المقاصة VCC وإجراءات الفحص والاستلام الفوري فور وصول الشحنة إلى الميناء.',
    'info',
    'all',
    true,
    2
)
ON CONFLICT DO NOTHING;

COMMIT;
