-- Migration: 20260919200000_fix_audit_events_action_check.sql
-- Description: Adds missing role-management and staff-management audit actions to audit_events_action_check constraint.
-- Resolves error: new row for relation "audit_events" violates check constraint "audit_events_action_check"

ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_action_check;

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
    action IN (
        -- Standard CRUD actions
        'create',
        'update',
        'delete',
        'execute',
        -- Role Management actions
        'CREATE_ROLE',
        'UPDATE_ROLE',
        'DELETE_ROLE',
        'CLONE_ROLE',
        -- Staff Management actions
        'ROLE_UPDATED',
        'STATUS_TOGGLED',
        'PROVISION_ACTIVE',
        'INVITE_PENDING',
        'INVITATION_RESENT',
        'INVITATION_REVOKED',
        'STAFF_INVITATION_ACCEPTED',
        'INVITATION_CREATED',
        'INVITATION_ACCEPTED'
    )
);
