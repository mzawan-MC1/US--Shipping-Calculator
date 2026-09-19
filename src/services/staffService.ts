import { supabase } from '../lib/supabase';

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

interface StaffDirectoryRow {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean | null;
  created_at: string;
  role_id: string | null;
  role_name: string | null;
  role_description: string | null;
  role_is_system?: boolean | null;
  role_is_active?: boolean | null;
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
    // Query roles with permissions and staff counts directly from authoritative live database
    const [rolesRes, permsRes, countsRes] = await Promise.all([
      supabase
        .from('roles')
        .select('id, name, description, is_system, is_active, created_at')
        .order('id'),
      supabase.from('role_permissions').select('role_id, permission_id'),
      supabase.from('staff_role_assignments').select('role_id'),
    ]);

    if (rolesRes.error) {
      throw new Error(rolesRes.error.message || 'Unable to load roles from database.');
    }
    if (!rolesRes.data) {
      return [];
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
  },

  async getAllPermissions(): Promise<SystemPermission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('id, description')
      .order('id');

    if (error) {
      throw new Error(error.message || 'Unable to load permissions list.');
    }
    if (!data) return [];

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
    // 1. Query staff_directory_view (disambiguated and security_invoker enforced)
    const { data: viewData, error: viewError } = await supabase
      .from('staff_directory_view')
      .select('*')
      .order('created_at', { ascending: true });

    if (!viewError && viewData && viewData.length > 0) {
      const rows = viewData as unknown as StaffDirectoryRow[];
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

    if (error) {
      console.warn('[StaffService] Error loading pending invitations:', error);
      throw new Error(error.message || 'Unable to load pending staff invitations.');
    }
    if (!data) return [];

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
    if (!validSystemRoles.includes(roleId)) {
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id, is_active')
        .eq('id', roleId)
        .maybeSingle();

      if (!roleRow || roleRow.is_active === false) {
        throw new Error(`Invalid role: "${roleId}". Must be a valid system or custom role.`);
      }
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
    if (!validSystemRoles.includes(roleId)) {
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id, is_active')
        .eq('id', roleId)
        .maybeSingle();

      if (!roleRow || roleRow.is_active === false) {
        throw new Error(`Invalid role: "${roleId}". Must be a valid system or custom role.`);
      }
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
    nameOrId: string,
    descOrName: string,
    permsOrDesc: string[] | string,
    optionalPerms?: string[]
  ): Promise<{ success: boolean; roleId: string }> {
    let roleId: string | undefined;
    let name: string;
    let description: string;
    let permissions: string[];

    if (Array.isArray(permsOrDesc)) {
      name = nameOrId;
      description = descOrName;
      permissions = permsOrDesc;
    } else {
      roleId = nameOrId;
      name = descOrName;
      description = permsOrDesc;
      permissions = optionalPerms || [];
    }

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Role name must be at least 2 characters.');
    }

    if (roleId && roleId.trim()) {
      const { data, error } = await supabase.rpc('admin_create_role', {
        p_id: roleId
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_'),
        p_name: cleanName,
        p_description: description.trim(),
        p_permissions: permissions,
      });

      if (error) {
        throw new Error(error.message || 'Failed to create role.');
      }

      const result = data as { success?: boolean; role_id?: string };
      return { success: true, roleId: result.role_id || '' };
    }

    const { data, error } = await supabase.rpc('admin_create_role', {
      p_name: cleanName,
      p_description: description.trim(),
      p_permissions: permissions,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create role.');
    }

    const result = data as { success?: boolean; role_id?: string };
    return { success: true, roleId: result.role_id || '' };
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

    const { data, error } = await supabase.rpc('admin_clone_role', {
      p_source_role_id: sourceRoleId,
      p_new_role_id: cleanId,
      p_new_name: cleanName,
      p_new_description: newDescription?.trim() || '',
    });

    if (error) {
      throw new Error(error.message || 'Failed to clone role.');
    }

    const result = data as { success?: boolean; role_id?: string };
    return { success: true, roleId: result.role_id || cleanId };
  },
};
