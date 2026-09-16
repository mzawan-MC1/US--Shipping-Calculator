-- Migration: 20260916020000_perf_index_hardening.sql
-- Description: Add covering indexes on staff_invitations foreign keys for optimal query performance

CREATE INDEX IF NOT EXISTS idx_fk_staff_invitations_invited_by ON public.staff_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_fk_staff_invitations_role_id ON public.staff_invitations (role_id);
