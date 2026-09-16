-- ==============================================================================
-- Migration: 20260916010000_staff_invitation_hardening.sql
-- Description: Hardening staff invitation tracking, resend, revoke, and email delivery status
-- Author: Lead Full-Stack & UI/UX Engineer
-- Date: 2026-09-16
-- ==============================================================================

-- 1. Add delivery tracking columns to staff_invitations
ALTER TABLE public.staff_invitations
    ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS resend_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 2. Secure function to resend staff invitation
CREATE OR REPLACE FUNCTION public.admin_resend_staff_invitation(p_invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invite RECORD;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT * INTO v_invite
    FROM public.staff_invitations
    WHERE id = p_invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff invitation not found.';
    END IF;

    UPDATE public.staff_invitations
    SET resend_count = resend_count + 1,
        last_resent_at = now()
    WHERE id = p_invitation_id;

    INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
    VALUES ('staff_invitation', p_invitation_id::text, 'INVITATION_RESENT', auth.uid(), jsonb_build_object(
        'email', v_invite.email,
        'resend_count', v_invite.resend_count + 1
    ));

    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', p_invitation_id,
        'email', v_invite.email,
        'resend_count', v_invite.resend_count + 1
    );
END;
$$;

-- 3. Secure function to revoke staff invitation
CREATE OR REPLACE FUNCTION public.admin_revoke_staff_invitation(p_invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF NOT public.has_permission('staff.manage') THEN
        RAISE EXCEPTION 'Access denied: staff.manage permission required.';
    END IF;

    SELECT email INTO v_email
    FROM public.staff_invitations
    WHERE id = p_invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff invitation not found.';
    END IF;

    DELETE FROM public.staff_invitations WHERE id = p_invitation_id;

    INSERT INTO public.audit_events (entity_type, entity_id, action, performed_by, metadata)
    VALUES ('staff_invitation', p_invitation_id::text, 'INVITATION_REVOKED', auth.uid(), jsonb_build_object(
        'email', v_email
    ));

    RETURN jsonb_build_object('success', true, 'revoked_email', v_email);
END;
$$;

-- 4. Secure grants
REVOKE ALL ON FUNCTION public.admin_resend_staff_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resend_staff_invitation(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_revoke_staff_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_staff_invitation(UUID) TO authenticated, service_role;
