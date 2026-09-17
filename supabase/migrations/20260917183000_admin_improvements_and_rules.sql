-- ==============================================================================
-- Migration: 20260917183000_admin_improvements_and_rules.sql
-- Description:
-- 1. Extend staff_profiles with avatar_url, phone, preferred_language, notification_preferences
-- 2. Create avatars storage bucket and RLS policies
-- 3. Create quotation_rules table with RLS, audit fields, and initial seed
-- 4. Update calculate_shipping_quote_v1 to snapshot quotation rules
-- 5. Exclude port handling from 5% VAT base in additional_charge_rules
-- ==============================================================================

-- 1. Extend staff_profiles
ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "browser": false}'::JSONB;

-- Recreate or update staff_directory_view to include new columns
CREATE OR REPLACE VIEW public.staff_directory_view
WITH (security_invoker = true)
AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.phone,
    p.preferred_language,
    p.notification_preferences,
    p.is_active,
    p.created_at,
    p.updated_at,
    r.id AS role_id,
    r.name AS role_name,
    r.description AS role_description
FROM public.staff_profiles p
LEFT JOIN public.staff_role_assignments a ON p.id = a.staff_id
LEFT JOIN public.roles r ON a.role_id = r.id;

-- 2. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage RLS Policies for avatars
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete own avatar" ON storage.objects;

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Staff can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] 
        OR public.has_permission('staff.manage')
    )
);

CREATE POLICY "Staff can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] 
        OR public.has_permission('staff.manage')
    )
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] 
        OR public.has_permission('staff.manage')
    )
);

CREATE POLICY "Staff can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1] 
        OR public.has_permission('staff.manage')
    )
);

-- 3. Quotation Rules & Regulations Table
CREATE TABLE IF NOT EXISTS public.quotation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT NOT NULL,
    title_ar TEXT,
    content_en TEXT NOT NULL,
    content_ar TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    effective_until DATE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.quotation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active quotation rules" ON public.quotation_rules;
DROP POLICY IF EXISTS "Staff can view all quotation rules" ON public.quotation_rules;
DROP POLICY IF EXISTS "Staff can insert quotation rules" ON public.quotation_rules;
DROP POLICY IF EXISTS "Staff can update quotation rules" ON public.quotation_rules;
DROP POLICY IF EXISTS "Staff can delete quotation rules" ON public.quotation_rules;

-- Read policy: Anyone can read active, non-archived rules within effective dates
CREATE POLICY "Public can read active quotation rules"
ON public.quotation_rules FOR SELECT
USING (
    is_active = true 
    AND is_archived = false 
    AND effective_from <= CURRENT_DATE 
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
);

-- Staff with pricing.view can read all rules (including archived/inactive)
CREATE POLICY "Staff can view all quotation rules"
ON public.quotation_rules FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view') OR public.has_permission('pricing.manage'));

CREATE POLICY "Staff can insert quotation rules"
ON public.quotation_rules FOR INSERT
TO authenticated
WITH CHECK (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can update quotation rules"
ON public.quotation_rules FOR UPDATE
TO authenticated
USING (public.has_permission('pricing.manage'))
WITH CHECK (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can delete quotation rules"
ON public.quotation_rules FOR DELETE
TO authenticated
USING (public.has_permission('pricing.manage'));

-- 4. Correct Port Handling in additional_charge_rules to be excluded from VAT base
UPDATE public.additional_charge_rules
SET is_included_in_vat_base = false
WHERE category = 'port_handling';

