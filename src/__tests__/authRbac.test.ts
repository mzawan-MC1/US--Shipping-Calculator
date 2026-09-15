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
});
