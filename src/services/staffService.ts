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
  createdAt: string;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string | null;
}

const DEMO_ROLES: SystemRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full unrestricted authority over all operations, staff, tariffs, and settings',
  },
  {
    id: 'admin_manager',
    name: 'Operations Manager',
    description: 'Full management over quotations, routes, customers, and pricing tariffs',
  },
  {
    id: 'pricing_manager',
    name: 'Pricing & Tariffs Manager',
    description: 'Controls ocean freight, towing rules, and destination surcharge matrix',
  },
  {
    id: 'sales_agent',
    name: 'Sales Coordinator',
    description:
      'Handles inbound customer leads, quotation adjustments, and WhatsApp communication',
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    description: 'Manages website marketing notices, port descriptions, and announcements',
  },
  {
    id: 'viewer',
    name: 'Auditor / Viewer',
    description: 'Read-only access across business data and reports',
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

interface StaffProfileQueryResult {
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

interface StaffInvitationQueryResult {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
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

    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description')
      .order('id');

    if (error || !data || data.length === 0) {
      return DEMO_ROLES;
    }

    return data;
  },

  async getStaffList(): Promise<StaffMember[]> {
    if (isDemoMode) {
      return DEMO_STAFF_MEMBERS;
    }

    const { data, error } = await supabase
      .from('staff_profiles')
      .select(
        `
        id,
        email,
        full_name,
        is_active,
        created_at,
        staff_role_assignments (
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
      throw new Error(error?.message || 'Failed to load staff profiles');
    }

    const rows = data as unknown as StaffProfileQueryResult[];

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
      createdAt: inv.created_at,
    }));
  },

  async inviteStaff(
    email: string,
    fullName: string,
    roleId: string
  ): Promise<{ success: boolean; message?: string }> {
    if (isDemoMode) {
      return { success: true, message: 'Demo mode: Invitation created locally.' };
    }

    const { data, error } = await supabase.rpc('admin_invite_or_create_staff', {
      p_email: email,
      p_full_name: fullName,
      p_role_id: roleId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const res = data as { success: boolean; message?: string };
    return { success: res?.success, message: res?.message };
  },

  async updateStaffRole(staffId: string, roleId: string): Promise<{ success: boolean }> {
    if (isDemoMode) {
      return { success: true };
    }

    const { error } = await supabase.rpc('admin_update_staff_role', {
      p_staff_id: staffId,
      p_role_id: roleId,
    });

    if (error) {
      throw new Error(error.message);
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
      throw new Error(error.message);
    }

    return { success: true };
  },

  async deleteInvitation(invitationId: string): Promise<void> {
    if (isDemoMode) return;

    const { error } = await supabase.from('staff_invitations').delete().eq('id', invitationId);

    if (error) {
      throw new Error(error.message);
    }
  },
};
