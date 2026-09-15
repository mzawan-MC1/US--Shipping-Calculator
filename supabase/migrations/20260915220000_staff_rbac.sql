-- ==============================================================================
-- Migration: 20260915220000_staff_rbac.sql
-- Description: Core staff profiles, roles, permissions, and RBAC helper functions
-- ==============================================================================

-- 1. Staff Profiles (Links to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Role Permissions Mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Staff Role Assignments
CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.staff_profiles(id),
    PRIMARY KEY (staff_id, role_id)
);

-- Insert Standard System Roles
INSERT INTO public.roles (id, name, description) VALUES
    ('super_admin', 'Super Admin', 'Full unrestricted authority over all operations, staff, tariffs, and settings'),
    ('admin_manager', 'Operations Manager', 'Full management over quotations, routes, customers, and pricing tariffs'),
    ('pricing_manager', 'Pricing & Tariffs Manager', 'Controls ocean freight, towing rules, and destination surcharge matrix'),
    ('sales_agent', 'Sales Coordinator', 'Handles inbound customer leads, quotation adjustments, and WhatsApp communication'),
    ('content_manager', 'Content Manager', 'Manages website marketing notices, port descriptions, and announcements'),
    ('viewer', 'Auditor / Viewer', 'Read-only access across business data and reports')
ON CONFLICT (id) DO NOTHING;

-- Insert Standard Granular Permissions
INSERT INTO public.permissions (id, description) VALUES
    ('dashboard.view', 'View operational dashboard KPIs and pipeline summaries'),
    ('enquiries.view', 'View customer shipping enquiries and inbound leads'),
    ('enquiries.manage', 'Update status, assign staff, and edit enquiry details'),
    ('quotations.view', 'View calculated quotations and immutable pricing snapshots'),
    ('quotations.manage', 'Revise, adjust, and approve quotations for customers'),
    ('customers.view', 'View customer directory and contact details'),
    ('customers.manage', 'Create and update customer profiles'),
    ('routes.view', 'View origins, destination ports, and transit schedules'),
    ('routes.manage', 'Create and configure shipping routes, ports, and transit days'),
    ('pricing.view', 'View ocean freight tariffs, towing brackets, and tax rules'),
    ('pricing.manage', 'Update freight rates, towing rules, and surcharge matrix'),
    ('cms.view', 'View website content items and announcements'),
    ('cms.manage', 'Publish and edit website content and promotional banners'),
    ('staff.view', 'View internal staff accounts and assigned roles'),
    ('staff.manage', 'Invite staff and modify staff role assignments'),
    ('reports.view', 'Generate and view financial and volume reporting'),
    ('settings.view', 'View system parameters and currency exchange rates'),
    ('settings.manage', 'Modify system settings, exchange rates, and business variables'),
    ('audit.view', 'Inspect immutable audit events and system modification logs')
ON CONFLICT (id) DO NOTHING;

-- Assign Permissions to Super Admin (All Permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Assign Permissions to Operations Manager
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('admin_manager', 'dashboard.view'),
    ('admin_manager', 'enquiries.view'),
    ('admin_manager', 'enquiries.manage'),
    ('admin_manager', 'quotations.view'),
    ('admin_manager', 'quotations.manage'),
    ('admin_manager', 'customers.view'),
    ('admin_manager', 'customers.manage'),
    ('admin_manager', 'routes.view'),
    ('admin_manager', 'routes.manage'),
    ('admin_manager', 'pricing.view'),
    ('admin_manager', 'pricing.manage'),
    ('admin_manager', 'cms.view'),
    ('admin_manager', 'cms.manage'),
    ('admin_manager', 'reports.view'),
    ('admin_manager', 'settings.view'),
    ('admin_manager', 'audit.view')
ON CONFLICT DO NOTHING;

-- Assign Permissions to Pricing Manager
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('pricing_manager', 'dashboard.view'),
    ('pricing_manager', 'routes.view'),
    ('pricing_manager', 'routes.manage'),
    ('pricing_manager', 'pricing.view'),
    ('pricing_manager', 'pricing.manage'),
    ('pricing_manager', 'quotations.view'),
    ('pricing_manager', 'settings.view')
ON CONFLICT DO NOTHING;

-- Assign Permissions to Sales Agent
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('sales_agent', 'dashboard.view'),
    ('sales_agent', 'enquiries.view'),
    ('sales_agent', 'enquiries.manage'),
    ('sales_agent', 'quotations.view'),
    ('sales_agent', 'quotations.manage'),
    ('sales_agent', 'customers.view'),
    ('sales_agent', 'customers.manage'),
    ('sales_agent', 'routes.view')
ON CONFLICT DO NOTHING;

-- Assign Permissions to Content Manager
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('content_manager', 'dashboard.view'),
    ('content_manager', 'cms.view'),
    ('content_manager', 'cms.manage')
ON CONFLICT DO NOTHING;

-- Assign Permissions to Viewer
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    ('viewer', 'dashboard.view'),
    ('viewer', 'enquiries.view'),
    ('viewer', 'quotations.view'),
    ('viewer', 'customers.view'),
    ('viewer', 'routes.view'),
    ('viewer', 'pricing.view'),
    ('viewer', 'reports.view')
ON CONFLICT DO NOTHING;

-- Helper function: Check if current authenticated user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(required_perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff_profiles sp
        JOIN public.staff_role_assignments sra ON sp.id = sra.staff_id
        JOIN public.role_permissions rp ON sra.role_id = rp.role_id
        WHERE sp.id = auth.uid()
          AND sp.is_active = true
          AND rp.permission_id = required_perm
    );
$$;

-- Helper function: Get all active permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(permission_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT DISTINCT rp.permission_id
    FROM public.staff_profiles sp
    JOIN public.staff_role_assignments sra ON sp.id = sra.staff_id
    JOIN public.role_permissions rp ON sra.role_id = rp.role_id
    WHERE sp.id = target_user_id
      AND sp.is_active = true;
$$;

-- Bootstrap function for the first Super Admin
-- Safe and restricted: Can only be run by postgres/service-role or when no staff exists
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(target_email);

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No auth.users record found matching email: ' || target_email
        );
    END IF;

    -- Ensure staff profile exists
    INSERT INTO public.staff_profiles (id, email, full_name, is_active)
    VALUES (v_user_id, target_email, 'Super Admin', true)
    ON CONFLICT (id) DO UPDATE
    SET is_active = true;

    -- Assign super_admin role
    INSERT INTO public.staff_role_assignments (staff_id, role_id)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (staff_id, role_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'role', 'super_admin',
        'message', 'Super admin role successfully assigned to ' || target_email
    );
END;
$$;
