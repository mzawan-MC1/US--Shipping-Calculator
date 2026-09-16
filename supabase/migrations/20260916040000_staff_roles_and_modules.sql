-- Migration: 20260916040000_staff_roles_and_modules.sql
-- Description: Disambiguate staff relationships via staff_directory_view, extend roles schema, seed quotation_officer, add role management RPCs, and fix audit event columns.

BEGIN;

-- 1. Extend public.roles table
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing base system roles
UPDATE public.roles
SET is_system = true
WHERE id IN ('super_admin', 'admin_manager', 'pricing_manager', 'sales_agent', 'content_manager', 'viewer');

-- Ensure quotation_officer exists
INSERT INTO public.roles (id, name, description, is_system, is_active)
VALUES (
    'quotation_officer',
    'Quotation Officer',
    'Prepares and approves freight quotations, reviews tariff schedules, and manages customer pricing requests',
    true,
    true
)
ON CONFLICT (id) DO UPDATE
SET is_system = true,
    is_active = true,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Seed permissions for quotation_officer
INSERT INTO public.role_permissions (role_id, permission_id)
VALUES
    ('quotation_officer', 'dashboard.view'),
    ('quotation_officer', 'enquiries.view'),
    ('quotation_officer', 'enquiries.manage'),
    ('quotation_officer', 'quotations.view'),
    ('quotation_officer', 'quotations.manage'),
    ('quotation_officer', 'customers.view'),
    ('quotation_officer', 'customers.manage'),
    ('quotation_officer', 'routes.view'),
    ('quotation_officer', 'pricing.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Create staff_directory_view with security_invoker = true
-- This permanently solves PostgREST ambiguous join error (PGRST201) while preserving RLS.
CREATE OR REPLACE VIEW public.staff_directory_view WITH (security_invoker = true) AS
SELECT
    sp.id,
    sp.email,
    sp.full_name,
    sp.is_active,
    sp.created_at,
    sp.updated_at,
    sra.role_id,
    r.name AS role_name,
    r.description AS role_description,
    r.is_system AS role_is_system,
    r.is_active AS role_is_active
FROM public.staff_profiles sp
LEFT JOIN public.staff_role_assignments sra ON sra.staff_id = sp.id
LEFT JOIN public.roles r ON r.id = sra.role_id;

GRANT SELECT ON public.staff_directory_view TO authenticated, service_role;

-- 3. Super Admin Role Management RPCs

-- 3.1 Create Role
CREATE OR REPLACE FUNCTION public.admin_create_role(
    p_id text,
    p_name text,
    p_description text,
    p_permissions text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_clean_id TEXT;
    v_clean_name TEXT;
    v_clean_desc TEXT;
    v_perm TEXT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    v_clean_id := LOWER(TRIM(p_id));
    v_clean_name := TRIM(p_name);
    v_clean_desc := TRIM(p_description);

    IF v_clean_id IS NULL OR LENGTH(v_clean_id) < 3 OR v_clean_id !~ '^[a-z0-9_]+$' THEN
        RAISE EXCEPTION 'Role identifier must be 3-50 alphanumeric lowercase characters or underscores.';
    END IF;

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Role name must be at least 2 characters.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.roles WHERE lower(id) = v_clean_id) THEN
        RAISE EXCEPTION 'A role with ID "%" already exists.', v_clean_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.roles WHERE lower(name) = lower(v_clean_name)) THEN
        RAISE EXCEPTION 'A role with name "%" already exists.', v_clean_name;
    END IF;

    INSERT INTO public.roles (id, name, description, is_system, is_active, created_at, updated_at)
    VALUES (v_clean_id, v_clean_name, v_clean_desc, false, true, now(), now());

    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            IF EXISTS (SELECT 1 FROM public.permissions WHERE id = v_perm) THEN
                INSERT INTO public.role_permissions (role_id, permission_id)
                VALUES (v_clean_id, v_perm)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        v_clean_id,
        'CREATE_ROLE',
        NULL,
        jsonb_build_object('name', v_clean_name, 'description', v_clean_desc, 'permissions', p_permissions),
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', v_clean_id);
END;
$$;

-- 3.2 Update Role
CREATE OR REPLACE FUNCTION public.admin_update_role(
    p_role_id text,
    p_name text,
    p_description text,
    p_permissions text[],
    p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_role RECORD;
    v_clean_name TEXT;
    v_clean_desc TEXT;
    v_perm TEXT;
    v_all_perms_count INT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_role FROM public.roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role "%" not found.', p_role_id;
    END IF;

    v_clean_name := TRIM(p_name);
    v_clean_desc := TRIM(p_description);

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Role name must be at least 2 characters.';
    END IF;

    -- Protect super_admin
    IF p_role_id = 'super_admin' THEN
        IF p_is_active IS FALSE THEN
            RAISE EXCEPTION 'The Super Admin role cannot be deactivated.';
        END IF;

        SELECT count(*) INTO v_all_perms_count FROM public.permissions;
        IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) < v_all_perms_count THEN
            RAISE EXCEPTION 'The Super Admin role must retain all system permissions.';
        END IF;
    END IF;

    -- Check duplicate name
    IF EXISTS (SELECT 1 FROM public.roles WHERE lower(name) = lower(v_clean_name) AND id <> p_role_id) THEN
        RAISE EXCEPTION 'Another role with name "%" already exists.', v_clean_name;
    END IF;

    UPDATE public.roles
    SET name = v_clean_name,
        description = v_clean_desc,
        is_active = COALESCE(p_is_active, is_active),
        updated_at = now()
    WHERE id = p_role_id;

    -- Update permissions (except super_admin cannot be stripped)
    IF p_role_id <> 'super_admin' AND p_permissions IS NOT NULL THEN
        DELETE FROM public.role_permissions WHERE role_id = p_role_id;

        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            IF EXISTS (SELECT 1 FROM public.permissions WHERE id = v_perm) THEN
                INSERT INTO public.role_permissions (role_id, permission_id)
                VALUES (p_role_id, v_perm)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        p_role_id,
        'UPDATE_ROLE',
        jsonb_build_object('name', v_role.name, 'description', v_role.description, 'is_active', v_role.is_active),
        jsonb_build_object('name', v_clean_name, 'description', v_clean_desc, 'is_active', p_is_active, 'permissions', p_permissions),
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', p_role_id);
END;
$$;

-- 3.3 Delete Role
CREATE OR REPLACE FUNCTION public.admin_delete_role(p_role_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_role RECORD;
    v_assigned_staff_count INT;
    v_pending_invite_count INT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_role FROM public.roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role "%" not found.', p_role_id;
    END IF;

    IF v_role.is_system OR p_role_id = 'super_admin' THEN
        RAISE EXCEPTION 'System-defined roles cannot be deleted.';
    END IF;

    SELECT count(*) INTO v_assigned_staff_count
    FROM public.staff_role_assignments
    WHERE role_id = p_role_id;

    IF v_assigned_staff_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role "%": % active staff member(s) are assigned to it. Please reassign them first.', v_role.name, v_assigned_staff_count;
    END IF;

    SELECT count(*) INTO v_pending_invite_count
    FROM public.staff_invitations
    WHERE role_id = p_role_id AND status = 'pending';

    IF v_pending_invite_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role "%": % pending invitation(s) use this role. Please revoke or update them first.', v_role.name, v_pending_invite_count;
    END IF;

    DELETE FROM public.role_permissions WHERE role_id = p_role_id;
    DELETE FROM public.roles WHERE id = p_role_id;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        p_role_id,
        'DELETE_ROLE',
        jsonb_build_object('name', v_role.name),
        NULL,
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'deleted_role_id', p_role_id);
END;
$$;

-- 3.4 Clone Role
CREATE OR REPLACE FUNCTION public.admin_clone_role(
    p_source_role_id text,
    p_new_role_id text,
    p_new_role_name text,
    p_new_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_source_role RECORD;
    v_clean_id TEXT;
    v_clean_name TEXT;
    v_clean_desc TEXT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_source_role FROM public.roles WHERE id = p_source_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source role "%" not found.', p_source_role_id;
    END IF;

    v_clean_id := LOWER(TRIM(p_new_role_id));
    v_clean_name := TRIM(p_new_role_name);
    v_clean_desc := COALESCE(TRIM(p_new_description), 'Cloned from ' || v_source_role.name);

    IF v_clean_id IS NULL OR LENGTH(v_clean_id) < 3 OR v_clean_id !~ '^[a-z0-9_]+$' THEN
        RAISE EXCEPTION 'Role identifier must be 3-50 alphanumeric lowercase characters or underscores.';
    END IF;

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Role name must be at least 2 characters.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.roles WHERE lower(id) = v_clean_id) THEN
        RAISE EXCEPTION 'A role with ID "%" already exists.', v_clean_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.roles WHERE lower(name) = lower(v_clean_name)) THEN
        RAISE EXCEPTION 'A role with name "%" already exists.', v_clean_name;
    END IF;

    INSERT INTO public.roles (id, name, description, is_system, is_active, created_at, updated_at)
    VALUES (v_clean_id, v_clean_name, v_clean_desc, false, true, now(), now());

    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_clean_id, permission_id
    FROM public.role_permissions
    WHERE role_id = p_source_role_id;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        v_clean_id,
        'CLONE_ROLE',
        NULL,
        jsonb_build_object('source_role', p_source_role_id, 'name', v_clean_name),
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', v_clean_id);
END;
$$;

-- 4. Correct Audit Columns in Existing Staff RPCs

CREATE OR REPLACE FUNCTION public.admin_update_staff_role(p_staff_id uuid, p_role_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_role_exists BOOLEAN;
    v_current_role TEXT;
    v_active_super_admins INT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id AND is_active = true) INTO v_role_exists;
    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Role "%" does not exist or is inactive.', p_role_id;
    END IF;

    SELECT role_id INTO v_current_role
    FROM public.staff_role_assignments
    WHERE staff_id = p_staff_id;

    IF v_current_role = 'super_admin' AND p_role_id <> 'super_admin' THEN
        SELECT count(*) INTO v_active_super_admins
        FROM public.staff_role_assignments sra
        JOIN public.staff_profiles sp ON sra.staff_id = sp.id
        WHERE sra.role_id = 'super_admin' AND sp.is_active = true AND sp.id <> p_staff_id;

        IF v_active_super_admins < 1 THEN
            RAISE EXCEPTION 'Cannot demote the only active Super Admin account.';
        END IF;
    END IF;

    DELETE FROM public.staff_role_assignments WHERE staff_id = p_staff_id;
    INSERT INTO public.staff_role_assignments (staff_id, role_id, assigned_by)
    VALUES (p_staff_id, p_role_id, auth.uid());

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'staff_role_assignments',
        p_staff_id::text,
        'ROLE_UPDATED',
        jsonb_build_object('role_id', v_current_role),
        jsonb_build_object('role_id', p_role_id),
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', p_role_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_staff_status(p_staff_id uuid, p_is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_current_role TEXT;
    v_other_super_admins INT;
    v_old_status BOOLEAN;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    IF p_staff_id = auth.uid() AND NOT p_is_active THEN
        RAISE EXCEPTION 'Cannot deactivate your own staff account.';
    END IF;

    SELECT is_active INTO v_old_status FROM public.staff_profiles WHERE id = p_staff_id;

    IF NOT p_is_active THEN
        SELECT role_id INTO v_current_role
        FROM public.staff_role_assignments
        WHERE staff_id = p_staff_id;

        IF v_current_role = 'super_admin' THEN
            SELECT count(*) INTO v_other_super_admins
            FROM public.staff_role_assignments sra
            JOIN public.staff_profiles sp ON sra.staff_id = sp.id
            WHERE sra.role_id = 'super_admin' AND sp.is_active = true AND sp.id <> p_staff_id;

            IF v_other_super_admins < 1 THEN
                RAISE EXCEPTION 'Cannot deactivate the last active Super Admin account.';
            END IF;
        END IF;
    END IF;

    UPDATE public.staff_profiles
    SET is_active = p_is_active,
        updated_at = now()
    WHERE id = p_staff_id;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'staff_profiles',
        p_staff_id::text,
        'STATUS_TOGGLED',
        jsonb_build_object('is_active', v_old_status),
        jsonb_build_object('is_active', p_is_active),
        auth.uid(),
        now()
    );

    RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_invite_or_create_staff(
    p_email text,
    p_full_name text,
    p_role_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_clean_email TEXT;
    v_clean_name TEXT;
    v_target_user_id UUID;
    v_role_exists BOOLEAN;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    v_clean_email := LOWER(TRIM(p_email));
    v_clean_name := TRIM(p_full_name);

    IF LENGTH(v_clean_email) < 5 OR v_clean_email NOT LIKE '%@%' THEN
        RAISE EXCEPTION 'Invalid email address format.';
    END IF;

    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Full name must be at least 2 characters.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id AND is_active = true) INTO v_role_exists;
    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Role "%" does not exist or is inactive.', p_role_id;
    END IF;

    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE LOWER(email) = v_clean_email;

    IF v_target_user_id IS NOT NULL THEN
        INSERT INTO public.staff_profiles (id, email, full_name, is_active, updated_at)
        VALUES (v_target_user_id, v_clean_email, v_clean_name, true, now())
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            is_active = true,
            updated_at = now();

        DELETE FROM public.staff_role_assignments WHERE staff_id = v_target_user_id;
        INSERT INTO public.staff_role_assignments (staff_id, role_id, assigned_by)
        VALUES (v_target_user_id, p_role_id, auth.uid());

        DELETE FROM public.staff_invitations WHERE email = v_clean_email;

        INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
        VALUES (
            'staff_profiles',
            v_target_user_id::text,
            'PROVISION_ACTIVE',
            NULL,
            jsonb_build_object('email', v_clean_email, 'role_id', p_role_id),
            auth.uid(),
            now()
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'active',
            'user_id', v_target_user_id,
            'message', 'Staff profile provisioned and activated immediately.'
        );
    ELSE
        INSERT INTO public.staff_invitations (email, full_name, role_id, invited_by, updated_at)
        VALUES (v_clean_email, v_clean_name, p_role_id, auth.uid(), now())
        ON CONFLICT (email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role_id = EXCLUDED.role_id,
            updated_at = now();

        INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
        VALUES (
            'staff_invitations',
            v_clean_email,
            'INVITE_PENDING',
            NULL,
            jsonb_build_object('email', v_clean_email, 'role_id', p_role_id),
            auth.uid(),
            now()
        );

        RETURN jsonb_build_object(
            'success', true,
            'status', 'invited',
            'message', 'Pending staff invitation created. Account will link automatically upon sign in.'
        );
    END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_create_role(text, text, text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_role(text, text, text, text[], boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_role(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clone_role(text, text, text, text) TO authenticated, service_role;

COMMIT;
