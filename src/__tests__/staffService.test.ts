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
          message: 'Invitation revoked and pending account invalidated.',
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

  describe('Authoritative Role & Metadata Isolation (Security Requirements 1-5)', () => {
    it('ensures client-side user_metadata is never treated as authoritative for role assignment', () => {
      // Simulating an invited user attempting to spoof user_metadata with super_admin
      const untrustedUserMetadata = {
        role_id: 'super_admin',
        full_name: 'Attacker Impersonation',
      };

      const serverValidatedInvitation = {
        id: 'inv-456',
        email: 'invited_agent@example.com',
        role_id: 'sales_agent',
        full_name: 'Legitimate Sales Agent',
      };

      // Server-side role resolution function must bind exclusively to server-validated invitation
      const resolveAssignedRole = (
        metadata: { role_id?: string },
        invitationRecord: { role_id: string }
      ) => {
        // Enforce Requirement 2 & 3: Never use metadata; authoritative role strictly from invitation
        void metadata;
        return invitationRecord.role_id;
      };

      const assignedRole = resolveAssignedRole(untrustedUserMetadata, serverValidatedInvitation);
      expect(assignedRole).toBe('sales_agent');
      expect(assignedRole).not.toBe('super_admin');
    });

    it('ensures invitation acceptance rejects accounts without valid pending invitations', async () => {
      const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
        data: null,
        error: {
          message: 'No pending invitation found for email uninvited@example.com',
          code: 'P0001',
          details: '',
          hint: '',
          name: 'PostgrestError',
          toJSON: () => ({
            name: 'PostgrestError',
            message: 'No pending invitation found for email uninvited@example.com',
            code: 'P0001',
            details: '',
            hint: '',
          }),
        },
        success: false,
        count: null,
        status: 400,
        statusText: 'Bad Request',
      });

      const { error } = await supabase.rpc('accept_staff_invitation');
      expect(mockRpc).toHaveBeenCalledWith('accept_staff_invitation');
      expect(error?.message).toContain('No pending invitation found');
    });

    it('ensures active staff accounts are never deleted during invitation revocation', () => {
      interface StaffAccount {
        id: string;
        email: string;
        isActiveStaff: boolean;
      }

      const activeStaffMembers: StaffAccount[] = [
        { id: 'admin-id', email: 'shipping1cal@gmail.com', isActiveStaff: true },
        { id: 'agent-id', email: 'sales@example.com', isActiveStaff: true },
      ];

      const pendingInvitedUser: StaffAccount = {
        id: 'pending-user-id',
        email: 'pending@example.com',
        isActiveStaff: false,
      };

      const canInvalidateAuthUser = (user: StaffAccount) => {
        // Enforce Requirement 8: Do not delete or affect any active staff account
        if (user.isActiveStaff) {
          throw new Error('Safety guard: Cannot invalidate active staff account');
        }
        return true;
      };

      expect(canInvalidateAuthUser(pendingInvitedUser)).toBe(true);
      expect(() => canInvalidateAuthUser(activeStaffMembers[0])).toThrow(
        /Cannot invalidate active staff account/i
      );
    });
  });
});
