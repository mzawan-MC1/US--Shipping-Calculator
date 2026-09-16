import { supabase, isDemoMode } from '../lib/supabase';

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  createdAt: string;
}

export interface StaffInvitation {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  emailSent: boolean;
  resendCount: number;
  status: string;
  createdAt: string;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  assignedStaffCount?: number;
  permissions?: string[];
  createdAt?: string;
}

export interface SystemPermission {
  id: string;
  description: string;
  module: string;
}

export interface InviteResult {
  success: boolean;
  emailSent: boolean;
  message: string;
}

const DEMO_ROLES: SystemRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full unrestricted authority over all operations, staff, tariffs, and settings',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 1,
    permissions: [
      'audit.view',
      'cms.manage',
      'cms.view',
      'customers.manage',
      'customers.view',
      'dashboard.view',
      'enquiries.manage',
      'enquiries.view',
      'pricing.manage',
      'pricing.view',
      'quotations.manage',
      'quotations.view',
      'reports.view',
      'routes.manage',
      'routes.view',
      'settings.manage',
      'settings.view',
      'staff.manage',
      'staff.view',
    ],
  },
  {
    id: 'admin_manager',
    name: 'Operations Manager',
    description: 'Full management over quotations, routes, customers, and pricing tariffs',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: [
      'audit.view',
      'cms.manage',
      'cms.view',
      'customers.manage',
      'customers.view',
      'dashboard.view',
      'enquiries.manage',
      'enquiries.view',
      'pricing.manage',
      'pricing.view',
      'quotations.manage',
      'quotations.view',
      'reports.view',
      'routes.manage',
      'routes.view',
      'settings.view',
    ],
  },
  {
    id: 'quotation_officer',
    name: 'Quotation Officer',
    description:
      'Prepares and approves freight quotations, reviews tariff schedules, and manages customer pricing requests',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: [
      'dashboard.view',
      'enquiries.view',
      'enquiries.manage',
      'quotations.view',
      'quotations.manage',
      'customers.view',
      'customers.manage',
      'routes.view',
      'pricing.view',
    ],
  },
  {
    id: 'pricing_manager',
    name: 'Pricing & Tariffs Manager',
    description: 'Controls ocean freight, towing rules, and destination surcharge matrix',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: [
      'dashboard.view',
      'pricing.manage',
      'pricing.view',
      'quotations.view',
      'routes.manage',
      'routes.view',
      'settings.view',
    ],
  },
  {
    id: 'sales_agent',
    name: 'Sales Coordinator',
    description:
      'Handles inbound customer leads, quotation adjustments, and WhatsApp communication',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: [
      'customers.manage',
      'customers.view',
      'dashboard.view',
      'enquiries.manage',
      'enquiries.view',
      'quotations.manage',
      'quotations.view',
      'routes.view',
    ],
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    description: 'Manages website marketing notices, port descriptions, and announcements',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: ['cms.manage', 'cms.view', 'dashboard.view'],
  },
  {
    id: 'viewer',
    name: 'Auditor / Viewer',
    description: 'Read-only access across business data and reports',
    isSystem: true,
    isActive: true,
    assignedStaffCount: 0,
    permissions: [
      'customers.view',
      'dashboard.view',
      'enquiries.view',
      'pricing.view',
      'quotations.view',
      'reports.view',
      'routes.view',
    ],
  },
];

const DEMO_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'f2a884d9-27d4-48b7-b346-d25706db8846',
    email: 'shipping1cal@gmail.com',
    fullName: 'Super Admin',
    isActive: true,
    roleId: 'super_admin',
    roleName: 'Super Admin',
    createdAt: new Date().toISOString(),
  },
];

interface StaffDirectoryRow {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean | null;
  created_at: string;
  role_id: string | null;
  role_name: string | null;
  role_description: string | null;
  role_is_system: boolean | null;
  role_is_active: boolean | null;
}

interface StaffInvitationQueryResult {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  email_sent?: boolean;
  resend_count?: number;
  status?: string;
  created_at: string;
  roles: {
    id: string;
    name: string;
  } | null;
}

export const staffService = {
  async getRoles(): Promise<SystemRole[]> {
    if (isDemoMode) {
      return DEMO_ROLES;
    }

    try {
      // Query roles with permissions and staff counts
      const [rolesRes, permsRes, countsRes] = await Promise.all([
        supabase
          .from('roles')
          .select('id, name, description, is_system, is_active, created_at')
          .order('id'),
        supabase.from('role_permissions').select('role_id, permission_id'),
        supabase.from('staff_role_assignments').select('role_id'),
      ]);

      if (rolesRes.error || !rolesRes.data || rolesRes.data.length === 0) {
        return DEMO_ROLES;
      }

      // Group permissions by role_id
      const permsMap = new Map<string, string[]>();
      if (permsRes.data) {
        for (const rp of permsRes.data) {
          const list = permsMap.get(rp.role_id) || [];
          list.push(rp.permission_id);
          permsMap.set(rp.role_id, list);
        }
      }

      // Count staff assigned to each role
      const countsMap = new Map<string, number>();
      if (countsRes.data) {
        for (const row of countsRes.data) {
          countsMap.set(row.role_id, (countsMap.get(row.role_id) || 0) + 1);
        }
      }

      return rolesRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: Boolean(r.is_system),
        isActive: r.is_active !== false,
        createdAt: r.created_at,
        assignedStaffCount: countsMap.get(r.id) || 0,
        permissions: permsMap.get(r.id) || [],
      }));
    } catch {
      return DEMO_ROLES;
    }
  },

  async getAllPermissions(): Promise<SystemPermission[]> {
    if (isDemoMode) {
      return [
        {
          id: 'dashboard.view',
          description: 'View operational dashboard KPIs and pipeline summaries',
          module: 'dashboard',
        },
        {
          id: 'enquiries.view',
          description: 'View customer shipping enquiries and inbound leads',
          module: 'enquiries',
        },
        {
          id: 'enquiries.manage',
          description: 'Update status, assign staff, and edit enquiry details',
          module: 'enquiries',
        },
        {
          id: 'quotations.view',
          description: 'View calculated quotations and pricing snapshots',
          module: 'quotations',
        },
        {
          id: 'quotations.manage',
          description: 'Revise, adjust, and approve quotations for customers',
          module: 'quotations',
        },
        {
          id: 'customers.view',
          description: 'View customer directory and contact details',
          module: 'customers',
        },
        {
          id: 'customers.manage',
          description: 'Create and update customer profiles',
          module: 'customers',
        },
        {
          id: 'routes.view',
          description: 'View origins, destination ports, and transit schedules',
          module: 'routes',
        },
        {
          id: 'routes.manage',
          description: 'Create and configure shipping routes, ports, and transit days',
          module: 'routes',
        },
        {
          id: 'pricing.view',
          description: 'View ocean freight tariffs, towing brackets, and tax rules',
          module: 'pricing',
        },
        {
          id: 'pricing.manage',
          description: 'Update freight rates, towing rules, and surcharge matrix',
          module: 'pricing',
        },
        {
          id: 'staff.view',
          description: 'View internal staff accounts and assigned roles',
          module: 'staff',
        },
        {
          id: 'staff.manage',
          description: 'Invite staff and modify staff role assignments',
          module: 'staff',
        },
        {
          id: 'cms.view',
          description: 'View website content items and announcements',
          module: 'cms',
        },
        {
          id: 'cms.manage',
          description: 'Publish and edit website content and promotional banners',
          module: 'cms',
        },
        {
          id: 'reports.view',
          description: 'Generate and view financial and volume reporting',
          module: 'reports',
        },
        {
          id: 'settings.view',
          description: 'View system parameters and currency exchange rates',
          module: 'settings',
        },
        {
          id: 'settings.manage',
          description: 'Modify system settings, exchange rates, and business variables',
          module: 'settings',
        },
        {
          id: 'audit.view',
          description: 'Inspect immutable audit events and system modification logs',
          module: 'audit',
        },
      ];
    }

    const { data, error } = await supabase
      .from('permissions')
      .select('id, description')
      .order('id');

    if (error || !data) {
      console.warn('[StaffService] Could not load permissions list:', error);
      return [];
    }

    return data.map((p) => {
      const module = p.id.split('.')[0] || 'general';
      return {
        id: p.id,
        description: p.description || p.id,
        module,
      };
    });
  },

  async getStaffList(): Promise<StaffMember[]> {
    if (isDemoMode) {
      return DEMO_STAFF_MEMBERS;
    }

    // 1. Query staff_directory_view (disambiguated and security_invoker enforced)
    const { data: viewData, error: viewError } = await supabase
      .from('staff_directory_view')
      .select('*')
      .order('created_at', { ascending: true });

    if (!viewError && viewData && viewData.length > 0) {
      const rows = viewData as StaffDirectoryRow[];
      return rows.map((item) => ({
        id: item.id,
        email: item.email,
        fullName: item.full_name || 'Staff Member',
        isActive: Boolean(item.is_active),
        roleId: item.role_id || 'viewer',
        roleName: item.role_name || item.role_id || 'Staff',
        createdAt: item.created_at,
      }));
    }

    // 2. Fallback to disambiguated staff_profiles query
    const { data, error } = await supabase
      .from('staff_profiles')
      .select(
        `
        id,
        email,
        full_name,
        is_active,
        created_at,
        staff_role_assignments!staff_role_assignments_staff_id_fkey (
          role_id,
          roles (
            id,
            name
          )
        )
      `
      )
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('[StaffService] Error loading staff profiles:', error);
      throw new Error(
        'We were unable to retrieve the staff directory. Please refresh your session or try again.'
      );
    }

    interface FallbackRow {
      id: string;
      email: string;
      full_name: string | null;
      is_active: boolean | null;
      created_at: string;
      staff_role_assignments: Array<{
        role_id: string;
        roles: {
          id: string;
          name: string;
        } | null;
      }> | null;
    }

    const rows = data as unknown as FallbackRow[];

    return rows.map((item) => {
      const assignment = item.staff_role_assignments?.[0];
      const role = assignment?.roles;
      return {
        id: item.id,
        email: item.email,
        fullName: item.full_name || 'Staff Member',
        isActive: Boolean(item.is_active),
        roleId: assignment?.role_id || 'viewer',
        roleName: role?.name || assignment?.role_id || 'Staff',
        createdAt: item.created_at,
      };
    });
  },

  async getPendingInvitations(): Promise<StaffInvitation[]> {
    if (isDemoMode) {
      return [];
    }

    const { data, error } = await supabase
      .from('staff_invitations')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        email_sent,
        resend_count,
        status,
        created_at,
        roles (
          id,
          name
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[StaffService] Error loading pending invitations:', error);
      return [];
    }

    const rows = data as unknown as StaffInvitationQueryResult[];

    return rows.map((inv) => ({
      id: inv.id,
      email: inv.email,
      fullName: inv.full_name,
      roleId: inv.role_id,
      roleName: inv.roles?.name || inv.role_id,
      emailSent: Boolean(inv.email_sent),
      resendCount: inv.resend_count || 0,
      status: inv.status || 'pending',
      createdAt: inv.created_at,
    }));
  },

  async inviteStaff(email: string, fullName: string, roleId: string): Promise<InviteResult> {
    const trimmedEmail = email ? email.trim().toLowerCase() : '';
    const trimmedName = fullName ? fullName.trim() : '';

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      throw new Error('A valid email address is required.');
    }
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Full name must be at least 2 characters.');
    }

    const validSystemRoles = [
      'super_admin',
      'admin_manager',
      'quotation_officer',
      'pricing_manager',
      'sales_agent',
      'content_manager',
      'viewer',
    ];
    if (!validSystemRoles.includes(roleId) && !roleId.startsWith('custom_')) {
      throw new Error(`Invalid role: "${roleId}". Must be a valid system or custom role.`);
    }

    if (isDemoMode) {
      return {
        success: true,
        emailSent: false,
        message: 'Demo mode: Staff invitation registered locally.',
      };
    }

    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: {
        action: 'invite',
        email: trimmedEmail,
        full_name: trimmedName,
        role_id: roleId,
      },
    });

    if (error) {
      const contextErr = error as unknown as {
        context?: { json?: () => Promise<{ error?: string }> };
      };
      let message = error.message;
      if (contextErr?.context?.json) {
        try {
          const parsed = await contextErr.context.json();
          if (parsed?.error) message = parsed.error;
        } catch {
          // ignore
        }
      }
      throw new Error(message || 'Unable to complete staff invitation.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      emailSent: Boolean(data?.email_sent),
      message: data?.message || 'Staff invitation registered successfully.',
    };
  },

  async resendInvitation(email: string, invitationId?: string): Promise<InviteResult> {
    if (isDemoMode) {
      return {
        success: true,
        emailSent: false,
        message: 'Demo mode: Invitation resent locally.',
      };
    }

    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: {
        action: 'resend',
        email,
        invitation_id: invitationId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Unable to resend invitation.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      emailSent: Boolean(data?.email_sent),
      message: data?.message || 'Invitation resent successfully.',
    };
  },

  async updateStaffRole(staffId: string, roleId: string): Promise<{ success: boolean }> {
    const validSystemRoles = [
      'super_admin',
      'admin_manager',
      'quotation_officer',
      'pricing_manager',
      'sales_agent',
      'content_manager',
      'viewer',
    ];
    if (!validSystemRoles.includes(roleId) && !roleId.startsWith('custom_')) {
      throw new Error(`Invalid role: "${roleId}". Must be a valid system or custom role.`);
    }

    if (isDemoMode) {
      return { success: true };
    }

    const { error } = await supabase.rpc('admin_update_staff_role', {
      p_staff_id: staffId,
      p_role_id: roleId,
    });

    if (error) {
      throw new Error(error.message || 'Unable to update staff role.');
    }

    return { success: true };
  },

  async toggleStaffStatus(staffId: string, isActive: boolean): Promise<{ success: boolean }> {
    if (isDemoMode) {
      return { success: true };
    }

    const { error } = await supabase.rpc('admin_toggle_staff_status', {
      p_staff_id: staffId,
      p_is_active: isActive,
    });

    if (error) {
      throw new Error(error.message || 'Unable to toggle staff account status.');
    }

    return { success: true };
  },

  async deleteInvitation(invitationId: string): Promise<void> {
    if (isDemoMode) return;

    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: {
        action: 'revoke',
        invitation_id: invitationId,
      },
    });

    if (error) {
      // Fallback to database RLS delete
      const { error: dbError } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId);
      if (dbError) throw new Error(dbError.message || 'Unable to revoke invitation.');
      return;
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  },

  // Role Management Operations
  async createRole(
    id: string,
    name: string,
    description: string,
    permissions: string[]
  ): Promise<{ success: boolean; roleId: string }> {
    const cleanId = id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const cleanName = name.trim();

    if (!cleanId || cleanId.length < 3) {
      throw new Error(
        'Role identifier must be at least 3 characters (letters, numbers, underscores).'
      );
    }
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Role name must be at least 2 characters.');
    }

    if (isDemoMode) {
      return { success: true, roleId: cleanId };
    }

    const { data, error } = await supabase.rpc('admin_create_role', {
      p_id: cleanId,
      p_name: cleanName,
      p_description: description.trim(),
      p_permissions: permissions,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create role.');
    }

    const result = data as { success?: boolean; role_id?: string };
    return { success: true, roleId: result.role_id || cleanId };
  },

  async updateRole(
    roleId: string,
    name: string,
    description: string,
    permissions: string[],
    isActive: boolean
  ): Promise<{ success: boolean }> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Role name must be at least 2 characters.');
    }

    if (isDemoMode) {
      return { success: true };
    }

    const { error } = await supabase.rpc('admin_update_role', {
      p_role_id: roleId,
      p_name: cleanName,
      p_description: description.trim(),
      p_permissions: permissions,
      p_is_active: isActive,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update role.');
    }

    return { success: true };
  },

  async deleteRole(roleId: string): Promise<{ success: boolean }> {
    if (isDemoMode) {
      return { success: true };
    }

    const { error } = await supabase.rpc('admin_delete_role', {
      p_role_id: roleId,
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete role.');
    }

    return { success: true };
  },

  async cloneRole(
    sourceRoleId: string,
    newRoleId: string,
    newRoleName: string,
    newDescription?: string
  ): Promise<{ success: boolean; roleId: string }> {
    const cleanId = newRoleId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const cleanName = newRoleName.trim();

    if (!cleanId || cleanId.length < 3) {
      throw new Error('New role identifier must be at least 3 characters.');
    }
    if (!cleanName || cleanName.length < 2) {
      throw new Error('New role name must be at least 2 characters.');
    }

    if (isDemoMode) {
      return { success: true, roleId: cleanId };
    }

    const { data, error } = await supabase.rpc('admin_clone_role', {
      p_source_role_id: sourceRoleId,
      p_new_role_id: cleanId,
      p_new_role_name: cleanName,
      p_new_description: newDescription?.trim() || undefined,
    });

    if (error) {
      throw new Error(error.message || 'Failed to clone role.');
    }

    const result = data as { success?: boolean; role_id?: string };
    return { success: true, roleId: result.role_id || cleanId };
  },
};
