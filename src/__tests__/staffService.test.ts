import { describe, it, expect, vi, beforeEach } from 'vitest';
import { staffService } from '../services/staffService';
import { supabase } from '../lib/supabase';

describe('Staff Service & RBAC Governance (Phase 2B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Role Metadata & Inspection', () => {
    it('loads available system roles with complete metadata', async () => {
      const roles = await staffService.getRoles();
      expect(roles.length).toBeGreaterThanOrEqual(5);

      const superAdminRole = roles.find((r) => r.id === 'super_admin');
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole?.name).toBe('Super Admin');

      const salesRole = roles.find((r) => r.id === 'sales_agent');
      expect(salesRole).toBeDefined();
      expect(salesRole?.name).toBe('Sales Coordinator');

      const pricingRole = roles.find((r) => r.id === 'pricing_manager');
      expect(pricingRole).toBeDefined();
      expect(pricingRole?.name).toBe('Pricing & Tariffs Manager');
    });
  });

  describe('Input Validation Requirements', () => {
    it('rejects invalid or empty email addresses', async () => {
      await expect(staffService.inviteStaff('', 'John Doe', 'sales_agent')).rejects.toThrow(
        /valid email address is required/i
      );

      await expect(
        staffService.inviteStaff('notanemail', 'John Doe', 'sales_agent')
      ).rejects.toThrow(/valid email address is required/i);

      await expect(
        staffService.inviteStaff('missingdot@domain', 'John Doe', 'sales_agent')
      ).rejects.toThrow(/valid email address is required/i);
    });

    it('rejects names shorter than 2 characters', async () => {
      await expect(
        staffService.inviteStaff('john@example.com', 'J', 'sales_agent')
      ).rejects.toThrow(/full name must be at least 2 characters/i);

      await expect(
        staffService.inviteStaff('john@example.com', '  ', 'sales_agent')
      ).rejects.toThrow(/full name must be at least 2 characters/i);
    });

    it('rejects unknown or invalid role IDs on invitation', async () => {
      await expect(
        staffService.inviteStaff('john@example.com', 'John Doe', 'hacker_role')
      ).rejects.toThrow(/Invalid role/i);
    });

    it('rejects unknown or invalid role IDs on role update', async () => {
      await expect(
        staffService.updateStaffRole('any-staff-id', 'invalid_role_xyz')
      ).rejects.toThrow(/Invalid role/i);
    });
  });

  describe('Edge Function Dispatch & Response Handling', () => {
    let mockInvoke: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockInvoke = vi.fn();
      vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
        invoke: mockInvoke,
      } as unknown as typeof supabase.functions);
    });

    it('dispatches invitation via invite-staff Edge Function and handles email_sent: true', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          email_sent: true,
          message: 'Invitation email sent and recorded in staff directory.',
          staff_id: 'new-staff-uuid',
        },
        error: null,
      });

      const result = await staffService.inviteStaff(
        'newagent@fakheralamshipping.com',
        'Sarah Agent',
        'sales_agent'
      );

      expect(mockInvoke).toHaveBeenCalledWith('invite-staff', {
        body: {
          action: 'invite',
          email: 'newagent@fakheralamshipping.com',
          full_name: 'Sarah Agent',
          role_id: 'sales_agent',
        },
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(result.message).toContain('Invitation email sent');
    });

    it('handles SMTP unconfigured scenario (Record Only mode) gracefully', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          email_sent: false,
          message: 'Invitation recorded. Outbound SMTP is not configured.',
          staff_id: 'new-staff-uuid',
        },
        error: null,
      });

      const result = await staffService.inviteStaff(
        'agent2@fakheralamshipping.com',
        'Tariq Lead',
        'admin_manager'
      );

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('SMTP is not configured');
    });

    it('propagates Edge Function authorization denial (403 Forbidden)', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Forbidden: Insufficient privileges. Required: staff.manage',
          name: 'FunctionsHttpError',
          context: {
            json: async () => ({
              error: 'Forbidden: Insufficient privileges. Required: staff.manage',
            }),
          },
        } as unknown as Error,
      });

      await expect(
        staffService.inviteStaff('intruder@example.com', 'Intruder', 'viewer')
      ).rejects.toThrow(/staff\.manage/i);
    });

    it('propagates duplicate user conflict (409 Conflict)', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'A staff member or pending invitation already exists with this email.',
          name: 'FunctionsHttpError',
          context: {
            json: async () => ({
              error: 'A staff member or pending invitation already exists with this email.',
            }),
          },
        } as unknown as Error,
      });

      await expect(
        staffService.inviteStaff('shipping1cal@gmail.com', 'Super Admin', 'super_admin')
      ).rejects.toThrow(/already exists with this email/i);
    });

    it('dispatches resend invitation action via Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          email_sent: true,
          message: 'Invitation resent successfully.',
        },
        error: null,
      });

      const result = await staffService.resendInvitation('agent@example.com', 'inv-uuid-123');

      expect(mockInvoke).toHaveBeenCalledWith('invite-staff', {
        body: {
          action: 'resend',
          email: 'agent@example.com',
          invitation_id: 'inv-uuid-123',
        },
      });
      expect(result.success).toBe(true);
    });

    it('dispatches revoke invitation action via Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Invitation revoked.',
        },
        error: null,
      });

      await staffService.deleteInvitation('inv-uuid-123');

      expect(mockInvoke).toHaveBeenCalledWith('invite-staff', {
        body: {
          action: 'revoke',
          invitation_id: 'inv-uuid-123',
        },
      });
    });
  });
});
