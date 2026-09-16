-- ==============================================================================
-- Migration: 20260916050000_harden_governance_and_neutralize_data.sql
-- Description:
--   1. Neutralize unverified seeded CMS notices and company profile values.
--   2. Enforce system roles as strictly read-only (Super Admin immutable, all system roles non-editable).
--   3. Enforce strict permission validation on custom role create/update/clone (reject invalid IDs, reject privilege escalation).
--   4. Enforce case-insensitive uniqueness and dependency checks before role deletion.
-- ==============================================================================

-- 1. NEUTRALIZE UNVERIFIED CMS NOTICES & CONTACT DETAILS
-- Safely purge unverified marketing claims and unconfirmed schedule notices
DELETE FROM public.cms_notices;

-- Reset company_profile to verified baseline only (Sharjah Industrial Area 2, UAE)
UPDATE public.system_settings
SET value = jsonb_build_object(
    'company_name', 'Fakher Alam Used Cars Shipping',
    'company_name_ar', 'فاخر علم لشحن السيارات المستعملة',
    'headquarters_address', 'Industrial Area 2, Sharjah, UAE',
    'headquarters_address_ar', 'المنطقة الصناعية 2، الشارقة، الإمارات العربية المتحدة',
    'tax_trn', null,
    'support_email', null,
    'support_phone', null,
    'whatsapp_number', null
)
WHERE key = 'company_profile';

-- 2. HARDEN ROLE GOVERNANCE RPCs
DROP FUNCTION IF EXISTS public.admin_create_role(text, text, text[]);
DROP FUNCTION IF EXISTS public.admin_update_role(text, text, text, text[], boolean);
DROP FUNCTION IF EXISTS public.admin_delete_role(text);
DROP FUNCTION IF EXISTS public.admin_clone_role(text, text, text, text);

-- 2.1 CREATE ROLE (Custom roles only)
CREATE OR REPLACE FUNCTION public.admin_create_role(
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
    v_clean_name TEXT;
    v_clean_desc TEXT;
    v_clean_id TEXT;
    v_perm TEXT;
    v_caller_uid UUID;
    v_is_caller_super_admin BOOLEAN;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify active staff profile
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = v_caller_uid AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Active staff account required.';
    END IF;

    -- Verify staff.manage permission
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    v_clean_name := TRIM(p_name);
    v_clean_desc := TRIM(p_description);

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Role name must be at least 2 characters.';
    END IF;

    -- Generate identifier from name
    v_clean_id := lower(regexp_replace(v_clean_name, '[^a-zA-Z0-9]+', '_', 'g'));
    v_clean_id := trim(both '_' from v_clean_id);

    IF NOT (v_clean_id ~ '^[a-z0-9_]{2,64}$') THEN
        v_clean_id := 'role_' || substr(md5(random()::text), 1, 8);
    END IF;

    -- Check case-insensitive duplicate name or ID
    IF EXISTS (
        SELECT 1 FROM public.roles 
        WHERE lower(name) = lower(v_clean_name) OR lower(id) = lower(v_clean_id)
    ) THEN
        RAISE EXCEPTION 'A role with name "%" or identifier "%" already exists.', v_clean_name, v_clean_id;
    END IF;

    -- Check if caller is super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.staff_role_assignments 
        WHERE staff_id = v_caller_uid AND role_id = 'super_admin'
    ) INTO v_is_caller_super_admin;

    -- Validate every supplied permission
    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            -- 1. Existence check: reject entire request if permission does not exist
            IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE id = v_perm) THEN
                RAISE EXCEPTION 'Invalid permission ID: "%". Request rejected.', v_perm;
            END IF;

            -- 2. Privilege escalation check: caller cannot grant permissions they do not possess
            IF NOT v_is_caller_super_admin THEN
                IF NOT (v_perm = ANY(public.get_user_permissions(v_caller_uid))) THEN
                    RAISE EXCEPTION 'Privilege escalation prevented: Caller cannot grant permission "%" which they do not possess.', v_perm;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Insert new custom role (always is_system = false)
    INSERT INTO public.roles (id, name, description, is_system, is_active, created_at, updated_at)
    VALUES (v_clean_id, v_clean_name, v_clean_desc, false, true, now(), now());

    -- Atomically assign permissions
    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (v_clean_id, v_perm)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Audit event with complete permission set
    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        v_clean_id,
        'CREATE_ROLE',
        NULL,
        jsonb_build_object(
            'id', v_clean_id,
            'name', v_clean_name, 
            'description', v_clean_desc, 
            'is_system', false,
            'permissions', p_permissions
        ),
        v_caller_uid,
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', v_clean_id);
END;
$$;

-- 2.2 UPDATE ROLE (Custom roles only; system roles are strictly read-only)
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
    v_caller_uid UUID;
    v_is_caller_super_admin BOOLEAN;
    v_old_perms text[];
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify active staff profile
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = v_caller_uid AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Active staff account required.';
    END IF;

    -- Verify staff.manage permission
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_role FROM public.roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role "%" not found.', p_role_id;
    END IF;

    -- System roles are read-only; clone must be used
    IF v_role.is_system OR p_role_id = 'super_admin' THEN
        RAISE EXCEPTION 'System roles are read-only and cannot be modified. Clone this role to create a customized version.';
    END IF;

    v_clean_name := TRIM(p_name);
    v_clean_desc := TRIM(p_description);

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Role name must be at least 2 characters.';
    END IF;

    -- Check duplicate name (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.roles 
        WHERE lower(name) = lower(v_clean_name) AND id <> p_role_id
    ) THEN
        RAISE EXCEPTION 'Another role with name "%" already exists.', v_clean_name;
    END IF;

    -- Check if caller is super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.staff_role_assignments 
        WHERE staff_id = v_caller_uid AND role_id = 'super_admin'
    ) INTO v_is_caller_super_admin;

    -- Validate all supplied permissions
    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE id = v_perm) THEN
                RAISE EXCEPTION 'Invalid permission ID: "%". Request rejected.', v_perm;
            END IF;

            IF NOT v_is_caller_super_admin THEN
                IF NOT (v_perm = ANY(public.get_user_permissions(v_caller_uid))) THEN
                    RAISE EXCEPTION 'Privilege escalation prevented: Caller cannot grant permission "%" which they do not possess.', v_perm;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Collect old permissions for audit
    SELECT coalesce(array_agg(permission_id ORDER BY permission_id), ARRAY[]::text[])
    INTO v_old_perms
    FROM public.role_permissions
    WHERE role_id = p_role_id;

    -- Atomically update role metadata
    UPDATE public.roles
    SET name = v_clean_name,
        description = v_clean_desc,
        is_active = COALESCE(p_is_active, is_active),
        updated_at = now()
    WHERE id = p_role_id;

    -- Atomically replace permissions
    DELETE FROM public.role_permissions WHERE role_id = p_role_id;

    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
        FOREACH v_perm IN ARRAY p_permissions
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (p_role_id, v_perm)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Audit with old and new permissions
    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        p_role_id,
        'UPDATE_ROLE',
        jsonb_build_object(
            'name', v_role.name, 
            'description', v_role.description, 
            'is_active', v_role.is_active,
            'permissions', v_old_perms
        ),
        jsonb_build_object(
            'name', v_clean_name, 
            'description', v_clean_desc, 
            'is_active', COALESCE(p_is_active, v_role.is_active), 
            'permissions', p_permissions
        ),
        v_caller_uid,
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', p_role_id);
END;
$$;

-- 2.3 DELETE ROLE (Custom unused roles only)
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
    v_caller_uid UUID;
    v_old_perms text[];
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify active staff profile
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = v_caller_uid AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Active staff account required.';
    END IF;

    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_role FROM public.roles WHERE id = p_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role "%" not found.', p_role_id;
    END IF;

    IF v_role.is_system OR p_role_id = 'super_admin' THEN
        RAISE EXCEPTION 'System roles are read-only and cannot be deleted.';
    END IF;

    -- Verify no active or deactivated staff members are assigned
    SELECT count(*) INTO v_assigned_staff_count
    FROM public.staff_role_assignments
    WHERE role_id = p_role_id;

    IF v_assigned_staff_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role "%" because it is assigned to % staff member(s). Reassign them first.', p_role_id, v_assigned_staff_count;
    END IF;

    -- Verify no pending invitations reference this role
    SELECT count(*) INTO v_pending_invite_count
    FROM public.staff_invitations
    WHERE role_id = p_role_id;

    IF v_pending_invite_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role "%" because % pending invitation(s) use it. Revoke those invitations first.', p_role_id, v_pending_invite_count;
    END IF;

    SELECT coalesce(array_agg(permission_id ORDER BY permission_id), ARRAY[]::text[])
    INTO v_old_perms
    FROM public.role_permissions
    WHERE role_id = p_role_id;

    -- Atomically delete permissions and role
    DELETE FROM public.role_permissions WHERE role_id = p_role_id;
    DELETE FROM public.roles WHERE id = p_role_id;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        p_role_id,
        'DELETE_ROLE',
        jsonb_build_object(
            'id', p_role_id, 
            'name', v_role.name, 
            'description', v_role.description, 
            'permissions', v_old_perms
        ),
        NULL,
        v_caller_uid,
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', p_role_id);
END;
$$;

-- 2.4 CLONE ROLE
CREATE OR REPLACE FUNCTION public.admin_clone_role(
    p_source_role_id text,
    p_new_role_id text,
    p_new_name text,
    p_new_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_source RECORD;
    v_clean_id TEXT;
    v_clean_name TEXT;
    v_clean_desc TEXT;
    v_caller_uid UUID;
    v_is_caller_super_admin BOOLEAN;
    v_cloned_perms text[];
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify active staff profile
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_profiles 
        WHERE id = v_caller_uid AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Active staff account required.';
    END IF;

    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_source FROM public.roles WHERE id = p_source_role_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source role "%" not found.', p_source_role_id;
    END IF;

    v_clean_name := TRIM(p_new_name);
    v_clean_desc := TRIM(p_new_description);
    v_clean_id := lower(TRIM(p_new_role_id));

    IF v_clean_name IS NULL OR LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'New role name must be at least 2 characters.';
    END IF;

    IF NOT (v_clean_id ~ '^[a-z0-9_]{2,64}$') THEN
        RAISE EXCEPTION 'Role identifier must contain only lowercase letters, digits, and underscores (2-64 chars).';
    END IF;

    -- Duplicate check
    IF EXISTS (
        SELECT 1 FROM public.roles 
        WHERE lower(id) = lower(v_clean_id) OR lower(name) = lower(v_clean_name)
    ) THEN
        RAISE EXCEPTION 'A role with name "%" or identifier "%" already exists.', v_clean_name, v_clean_id;
    END IF;

    -- Check if caller is super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.staff_role_assignments 
        WHERE staff_id = v_caller_uid AND role_id = 'super_admin'
    ) INTO v_is_caller_super_admin;

    -- Privilege escalation check on cloned permissions
    IF NOT v_is_caller_super_admin THEN
        IF EXISTS (
            SELECT 1 FROM public.role_permissions rp
            WHERE rp.role_id = p_source_role_id
              AND NOT (rp.permission_id = ANY(public.get_user_permissions(v_caller_uid)))
        ) THEN
            RAISE EXCEPTION 'Privilege escalation prevented: Source role contains permissions you do not possess.';
        END IF;
    END IF;

    -- Insert cloned custom role (always is_system = false)
    INSERT INTO public.roles (id, name, description, is_system, is_active, created_at, updated_at)
    VALUES (v_clean_id, v_clean_name, v_clean_desc, false, true, now(), now());

    -- Copy permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_clean_id, permission_id
    FROM public.role_permissions
    WHERE role_id = p_source_role_id;

    SELECT coalesce(array_agg(permission_id ORDER BY permission_id), ARRAY[]::text[])
    INTO v_cloned_perms
    FROM public.role_permissions
    WHERE role_id = v_clean_id;

    INSERT INTO public.audit_events (entity_table, entity_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (
        'roles',
        v_clean_id,
        'CLONE_ROLE',
        jsonb_build_object('cloned_from', p_source_role_id),
        jsonb_build_object(
            'id', v_clean_id, 
            'name', v_clean_name, 
            'description', v_clean_desc, 
            'permissions', v_cloned_perms
        ),
        v_caller_uid,
        now()
    );

    RETURN jsonb_build_object('success', true, 'role_id', v_clean_id);
END;
$$;

-- 3. PERMISSIONS AND GRANTS
REVOKE ALL ON FUNCTION public.admin_create_role(text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_role(text, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_role(text, text, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_role(text, text, text, text[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_role(text, text, text, text[], boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_role(text, text, text, text[], boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_role(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_role(text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_clone_role(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_clone_role(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_clone_role(text, text, text, text) TO authenticated;
