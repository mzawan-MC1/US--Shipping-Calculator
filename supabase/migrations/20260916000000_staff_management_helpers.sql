-- ==============================================================================
-- Migration: 20260916000000_staff_management_helpers.sql
-- Description: Phase 2B Staff Portal Administration and Enquiry Workflow Helpers
-- Author: Lead Full-Stack & UI/UX Engineer
-- Date: 2026-09-16
-- ==============================================================================

-- 1. Create staff_invitations table for pending staff invites
CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_staff_invitations_normalized_email UNIQUE (email)
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for staff_invitations
CREATE POLICY "Staff can view invitations"
    ON public.staff_invitations
    FOR SELECT
    TO authenticated
    USING (public.has_permission('staff.view'));

CREATE POLICY "Staff can insert invitations"
    ON public.staff_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_permission('staff.manage'));

CREATE POLICY "Staff can delete invitations"
    ON public.staff_invitations
    FOR DELETE
    TO authenticated
    USING (public.has_permission('staff.manage'));

-- 2. Function: admin_invite_or_create_staff
CREATE OR REPLACE FUNCTION public.admin_invite_or_create_staff(
    p_email TEXT,
    p_full_name TEXT,
    p_role_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_email TEXT;
    v_clean_name TEXT;
    v_target_user_id UUID;
    v_role_exists BOOLEAN;
BEGIN
    -- Verify caller holds staff.manage permission
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

    -- Validate role exists
    SELECT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) INTO v_role_exists;
    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Role % does not exist.', p_role_id;
    END IF;

    -- Check if user already exists in auth.users
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE LOWER(email) = v_clean_email;

    IF v_target_user_id IS NOT NULL THEN
        -- Immediately provision/activate staff profile
        INSERT INTO public.staff_profiles (id, email, full_name, is_active)
        VALUES (v_target_user_id, v_clean_email, v_clean_name, true)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            is_active = true;

        -- Reassign role
        DELETE FROM public.staff_role_assignments WHERE staff_id = v_target_user_id;
        INSERT INTO public.staff_role_assignments (staff_id, role_id, assigned_by)
        VALUES (v_target_user_id, p_role_id, auth.uid());

        -- Remove any pending invitation
        DELETE FROM public.staff_invitations WHERE email = v_clean_email;

        -- Log audit event
        INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
        VALUES ('staff_profile', v_target_user_id::text, 'PROVISION_ACTIVE', auth.uid(), jsonb_build_object(
            'email', v_clean_email,
            'role', p_role_id
        ));

        RETURN jsonb_build_object(
            'success', true,
            'status', 'active',
            'user_id', v_target_user_id,
            'message', 'Staff profile provisioned and activated immediately.'
        );
    ELSE
        -- Record in pending invitations
        INSERT INTO public.staff_invitations (email, full_name, role_id, invited_by)
        VALUES (v_clean_email, v_clean_name, p_role_id, auth.uid())
        ON CONFLICT (email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            role_id = EXCLUDED.role_id,
            created_at = now();

        -- Log audit event
        INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
        VALUES ('staff_invitation', v_clean_email, 'INVITE_PENDING', auth.uid(), jsonb_build_object(
            'email', v_clean_email,
            'role', p_role_id
        ));

        RETURN jsonb_build_object(
            'success', true,
            'status', 'invited',
            'message', 'Pending staff invitation created. Account will link automatically when user signs up.'
        );
    END IF;
END;
$$;

-- 3. Function: admin_update_staff_role
CREATE OR REPLACE FUNCTION public.admin_update_staff_role(
    p_staff_id UUID,
    p_role_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role_exists BOOLEAN;
    v_current_role TEXT;
    v_active_super_admins INT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) INTO v_role_exists;
    IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Role % does not exist.', p_role_id;
    END IF;

    -- If target is currently super_admin and changing to another role, verify other active super admins exist
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

    INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
    VALUES ('staff_role', p_staff_id::text, 'ROLE_UPDATED', auth.uid(), jsonb_build_object(
        'old_role', v_current_role,
        'new_role', p_role_id
    ));

    RETURN jsonb_build_object('success', true, 'role_id', p_role_id);
END;
$$;

-- 4. Function: admin_toggle_staff_status
CREATE OR REPLACE FUNCTION public.admin_toggle_staff_status(
    p_staff_id UUID,
    p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_role TEXT;
    v_other_super_admins INT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    -- Prevent deactivating oneself
    IF p_staff_id = auth.uid() AND NOT p_is_active THEN
        RAISE EXCEPTION 'Cannot deactivate your own staff account.';
    END IF;

    -- If target is super_admin and deactivating, ensure another active super admin exists
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
    SET is_active = p_is_active
    WHERE id = p_staff_id;

    INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
    VALUES ('staff_profile', p_staff_id::text, 'STATUS_TOGGLED', auth.uid(), jsonb_build_object(
        'is_active', p_is_active
    ));

    RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;

-- 5. Function: admin_update_enquiry_status
CREATE OR REPLACE FUNCTION public.admin_update_enquiry_status(
    p_enquiry_id UUID,
    p_new_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    IF NOT public.has_permission('enquiries.manage') THEN
        RAISE EXCEPTION 'Access denied: enquiries.manage permission required.';
    END IF;

    SELECT status INTO v_old_status
    FROM public.enquiries
    WHERE id = p_enquiry_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enquiry not found: %', p_enquiry_id;
    END IF;

    UPDATE public.enquiries
    SET status = p_new_status
    WHERE id = p_enquiry_id;

    INSERT INTO public.enquiry_status_history (enquiry_id, old_status, new_status, changed_by, notes)
    VALUES (p_enquiry_id, v_old_status, p_new_status, auth.uid(), p_notes);

    RETURN jsonb_build_object(
        'success', true,
        'enquiry_id', p_enquiry_id,
        'old_status', v_old_status,
        'new_status', p_new_status
    );
END;
$$;

-- 6. Trigger to automatically link pending invitations when an auth user confirms
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_link_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invite RECORD;
BEGIN
    SELECT * INTO v_invite
    FROM public.staff_invitations
    WHERE LOWER(email) = LOWER(NEW.email);

    IF FOUND THEN
        INSERT INTO public.staff_profiles (id, email, full_name, is_active)
        VALUES (NEW.id, NEW.email, v_invite.full_name, true)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            is_active = true;

        INSERT INTO public.staff_role_assignments (staff_id, role_id, assigned_by)
        VALUES (NEW.id, v_invite.role_id, v_invite.invited_by)
        ON CONFLICT (staff_id, role_id) DO NOTHING;

        DELETE FROM public.staff_invitations WHERE id = v_invite.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users if permissions allow (or gracefully handle)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created_link_staff ON auth.users;
    CREATE TRIGGER on_auth_user_created_link_staff
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_link_staff();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping auth.users trigger (managed by Supabase Auth): %', SQLERRM;
END $$;

-- 7. Secure Function Execution Grants
REVOKE ALL ON FUNCTION public.admin_invite_or_create_staff(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_invite_or_create_staff(TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_staff_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_role(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_toggle_staff_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_staff_status(UUID, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_enquiry_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_enquiry_status(UUID, TEXT, TEXT) TO authenticated, service_role;
