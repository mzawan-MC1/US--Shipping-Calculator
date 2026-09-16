import { describe, it, expect, vi, beforeEach } from 'vitest';
import { staffService } from '../services/staffService';
import { supabase } from '../lib/supabase';

describe('Role Governance & Hardened Security (Phase 2B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('System Role Immutability', () => {
    it('prevents updating or renaming seeded system roles', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'System roles cannot be modified or renamed' },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(
        staffService.updateRole(
          'super_admin',
          'Renamed Admin',
          'Trying to modify system role',
          ['staff.manage'],
          true
        )
      ).rejects.toThrow(/System roles cannot be modified/i);

      expect(mockRpc).toHaveBeenCalledWith('admin_update_role', {
        p_role_id: 'super_admin',
        p_name: 'Renamed Admin',
        p_description: 'Trying to modify system role',
        p_permissions: ['staff.manage'],
        p_is_active: true,
      });
    });

    it('prevents deleting seeded system roles', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'System roles cannot be deleted' },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(staffService.deleteRole('sales_agent')).rejects.toThrow(
        /System roles cannot be deleted/i
      );

      expect(mockRpc).toHaveBeenCalledWith('admin_delete_role', {
        p_role_id: 'sales_agent',
      });
    });
  });

  describe('Custom Role Validation & Security', () => {
    it('rejects creation of roles with invalid names', async () => {
      await expect(
        staffService.createRole('A', 'Valid description', ['staff.manage'])
      ).rejects.toThrow(/at least 2 characters/i);
    });

    it('rejects invalid or non-existent permission IDs', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid permission IDs detected: [invalid.permission.id]' },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(
        staffService.createRole('Custom Role', 'Description', ['invalid.permission.id'])
      ).rejects.toThrow(/Invalid permission/i);
    });

    it('prevents privilege escalation when caller assigns permissions they do not hold', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message:
            'Privilege escalation rejected: caller cannot grant permissions they do not hold',
        },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(
        staffService.createRole('Manager Clone', 'Escalated role', ['system.settings'])
      ).rejects.toThrow(/Privilege escalation rejected/i);
    });

    it('rejects duplicate role names case-insensitively', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'A role with the name "Super Admin" already exists' },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(
        staffService.createRole('super admin', 'Attempted duplicate', ['staff.manage'])
      ).rejects.toThrow(/already exists/i);
    });

    it('prevents deletion of roles assigned to active staff members', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Cannot delete role: 2 staff member(s) are currently assigned to this role',
        },
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      await expect(staffService.deleteRole('custom_coordinator')).rejects.toThrow(/staff member/i);
    });
  });

  describe('Role Cloning', () => {
    it('clones an existing role successfully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { success: true, role_id: 'custom_sales_v2' },
        error: null,
      });
      vi.spyOn(supabase, 'rpc').mockImplementation(mockRpc as unknown as typeof supabase.rpc);

      const result = await staffService.cloneRole(
        'sales_agent',
        'custom_sales_v2',
        'Sales Coordinator V2',
        'Cloned sales role with adjusted permissions'
      );

      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('admin_clone_role', {
        p_source_role_id: 'sales_agent',
        p_new_role_id: 'custom_sales_v2',
        p_new_name: 'Sales Coordinator V2',
        p_new_description: 'Cloned sales role with adjusted permissions',
      });
    });
  });
});
