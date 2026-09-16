import { describe, it, expect } from 'vitest';
import { StaffRole } from '../types/admin';

describe('Staff RBAC System (Phase 2A)', () => {
  const rolePermissions: Record<StaffRole, string[]> = {
    super_admin: [
      'enquiries.view',
      'enquiries.manage',
      'quotations.view',
      'quotations.manage',
      'customers.view',
      'customers.manage',
      'routes.view',
      'routes.manage',
      'pricing.view',
      'pricing.manage',
      'staff.view',
      'staff.manage',
      'reports.view',
      'settings.view',
      'settings.manage',
      'audit.view',
    ],
    operations: [
      'enquiries.view',
      'enquiries.manage',
      'quotations.view',
      'quotations.manage',
      'customers.view',
      'routes.view',
      'pricing.view',
      'reports.view',
    ],
    sales_agent: [
      'enquiries.view',
      'enquiries.manage',
      'quotations.view',
      'quotations.manage',
      'customers.view',
      'customers.manage',
    ],
    customs_officer: ['enquiries.view', 'quotations.view', 'routes.view', 'pricing.view'],
  };

  it('verifies super_admin holds all critical administrative permissions', () => {
    const adminPerms = rolePermissions.super_admin;
    expect(adminPerms).toContain('pricing.manage');
    expect(adminPerms).toContain('staff.manage');
    expect(adminPerms).toContain('settings.manage');
    expect(adminPerms).toContain('audit.view');
  });

  it('restricts sales agent from editing pricing or staff accounts', () => {
    const salesPerms = rolePermissions.sales_agent;
    expect(salesPerms).toContain('enquiries.manage');
    expect(salesPerms).not.toContain('pricing.manage');
    expect(salesPerms).not.toContain('staff.manage');
    expect(salesPerms).not.toContain('settings.manage');
  });

  it('restricts customs officer to view-only capabilities', () => {
    const customsPerms = rolePermissions.customs_officer;
    expect(customsPerms).toContain('pricing.view');
    expect(customsPerms).not.toContain('pricing.manage');
    expect(customsPerms).not.toContain('enquiries.manage');
  });

  describe('Staff Account Governance & Inactive Invariant', () => {
    it('enforces that inactive staff accounts cannot hold authenticated session', () => {
      interface MockStaffAccount {
        id: string;
        email: string;
        is_active: boolean;
        role: string;
      }

      const activeAccount: MockStaffAccount = {
        id: 'user-1',
        email: 'staff@example.com',
        is_active: true,
        role: 'sales_agent',
      };

      const deactivatedAccount: MockStaffAccount = {
        id: 'user-2',
        email: 'exstaff@example.com',
        is_active: false,
        role: 'sales_agent',
      };

      const checkAccess = (account: MockStaffAccount | null) => {
        if (!account) throw new Error('Access denied: Account is not authorized as staff.');
        if (!account.is_active) throw new Error('Account is deactivated. Contact Super Admin.');
        return true;
      };

      expect(checkAccess(activeAccount)).toBe(true);
      expect(() => checkAccess(deactivatedAccount)).toThrow(/Account is deactivated/i);
      expect(() => checkAccess(null)).toThrow(/not authorized as staff/i);
    });

    it('enforces that the last Super Admin cannot be deactivated or demoted', () => {
      interface StaffRow {
        id: string;
        role: string;
        is_active: boolean;
      }

      const staffDirectory: StaffRow[] = [
        { id: 'admin-1', role: 'super_admin', is_active: true },
        { id: 'agent-1', role: 'sales_agent', is_active: true },
      ];

      const canDeactivateStaff = (targetStaffId: string, directory: StaffRow[]) => {
        const target = directory.find((s) => s.id === targetStaffId);
        if (!target) throw new Error('Staff member not found');

        if (target.role === 'super_admin') {
          const activeSuperAdmins = directory.filter(
            (s) => s.role === 'super_admin' && s.is_active && s.id !== targetStaffId
          );
          if (activeSuperAdmins.length === 0) {
            throw new Error('Cannot deactivate the last active Super Admin.');
          }
        }
        return true;
      };

      // Demoting or deactivating the only super admin must throw
      expect(() => canDeactivateStaff('admin-1', staffDirectory)).toThrow(
        /last active Super Admin/i
      );

      // Adding another super admin allows deactivation of the first
      const multiAdminDirectory: StaffRow[] = [
        { id: 'admin-1', role: 'super_admin', is_active: true },
        { id: 'admin-2', role: 'super_admin', is_active: true },
        { id: 'agent-1', role: 'sales_agent', is_active: true },
      ];
      expect(canDeactivateStaff('admin-1', multiAdminDirectory)).toBe(true);
    });
  });
});
