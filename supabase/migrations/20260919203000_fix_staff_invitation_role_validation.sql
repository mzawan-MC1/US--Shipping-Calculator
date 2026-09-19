-- Migration: 20260919203000_fix_staff_invitation_role_validation.sql
-- Description: Fix staff invitation RPC to accept any active custom or system role from public.roles,
-- and ensure staff_invitations has updated_at column for schema integrity.

-- 1. Ensure staff_invitations has updated_at column
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Update admin_invite_or_create_staff RPC
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
    -- Verify caller has staff.manage permission
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

    -- Authoritative role validation: Must exist in public.roles and be active
    SELECT EXISTS (
        SELECT 1 FROM public.roles 
        WHERE id = p_role_id AND is_active = true
    ) INTO v_role_exists;

    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Invalid role: "%". Must be a valid system or custom role.', p_role_id;
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

-- 3. Update admin_update_staff_role RPC to match strict error message
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

    SELECT EXISTS (
        SELECT 1 FROM public.roles 
        WHERE id = p_role_id AND is_active = true
    ) INTO v_role_exists;

    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Invalid role: "%". Must be a valid system or custom role.', p_role_id;
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

REVOKE ALL ON FUNCTION public.admin_invite_or_create_staff(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_invite_or_create_staff(text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_staff_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_role(uuid, text) TO authenticated, service_role;
