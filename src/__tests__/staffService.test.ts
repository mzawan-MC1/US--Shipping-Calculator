import { describe, it, expect } from 'vitest';
import { staffService } from '../services/staffService';

describe('Staff Service & RBAC Governance (Phase 2B)', () => {
  it('loads available system roles with complete metadata', async () => {
    const roles = await staffService.getRoles();
    expect(roles.length).toBeGreaterThanOrEqual(5);

    const superAdminRole = roles.find((r) => r.id === 'super_admin');
    expect(superAdminRole).toBeDefined();
    expect(superAdminRole?.name).toBe('Super Admin');

    const salesRole = roles.find((r) => r.id === 'sales_agent');
    expect(salesRole).toBeDefined();
    expect(salesRole?.name).toBe('Sales Coordinator');
  });

  it('validates email and full name requirements before invitation', async () => {
    // Empty email
    await expect(staffService.inviteStaff('', 'John Doe', 'sales_agent')).rejects.toThrow();

    // Invalid email without @
    await expect(
      staffService.inviteStaff('notanemail', 'John Doe', 'sales_agent')
    ).rejects.toThrow();

    // Invalid name
    await expect(
      staffService.inviteStaff('john@example.com', 'J', 'sales_agent')
    ).rejects.toThrow();
  });

  it('validates role existence before assigning', async () => {
    await expect(staffService.updateStaffRole('any-id', 'invalid_role_xyz')).rejects.toThrow();
  });
});
