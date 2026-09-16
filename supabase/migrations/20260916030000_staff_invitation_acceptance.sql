-- Migration: 20260916030000_staff_invitation_acceptance.sql
-- Description: Implement secure server-validated staff invitation acceptance

CREATE OR REPLACE FUNCTION public.accept_staff_invitation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS \$\$
DECLARE
    v_user_id uuid;
    v_user_email text;
    v_invite RECORD;
    v_existing_profile RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
    END IF;

    -- Securely extract email from auth.users (never trust client parameter)
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User account not found.';
    END IF;

    -- Check if already an active staff member
    SELECT * INTO v_existing_profile
    FROM public.staff_profiles
    WHERE id = v_user_id;

    IF v_existing_profile IS NOT NULL AND v_existing_profile.is_active = true THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_active', true,
            'user_id', v_user_id
        );
    END IF;

    -- Look up pending invitation strictly from protected staff_invitations
    -- Matching lowercase email
    SELECT * INTO v_invite
    FROM public.staff_invitations
    WHERE LOWER(email) = LOWER(v_user_email);

    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'No pending invitation found for email %', v_user_email;
    END IF;

    -- Authoritative role strictly from staff_invitations (ignoring user_metadata)
    INSERT INTO public.staff_profiles (id, email, full_name, is_active)
    VALUES (v_user_id, v_user_email, v_invite.full_name, true)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        is_active = true;

    -- Assign authoritative role
    INSERT INTO public.staff_role_assignments (staff_id, role_id, assigned_by)
    VALUES (v_user_id, v_invite.role_id, v_invite.invited_by)
    ON CONFLICT (staff_id, role_id) DO NOTHING;

    -- Remove pending invitation
    DELETE FROM public.staff_invitations WHERE id = v_invite.id;

    -- Audit log
    INSERT INTO public.audit_events (
        entity_table,
        entity_id,
        action,
        performed_by,
        new_data
    ) VALUES (
        'staff_profiles',
        v_user_id::text,
        'STAFF_INVITATION_ACCEPTED',
        v_user_id,
        jsonb_build_object(
            'email', v_user_email,
            'role_id', v_invite.role_id,
            'invited_by', v_invite.invited_by
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'role_id', v_invite.role_id,
        'full_name', v_invite.full_name
    );
END;
\$\$;

-- Revoke default public execute and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation() TO authenticated;
