import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../features/auth/AuthContext';
import {
  staffService,
  StaffMember,
  StaffInvitation,
  SystemRole,
  SystemPermission,
} from '../../services/staffService';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  UserX,
  UserCheck,
  KeyRound,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';

export const AdminStaffPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManageStaff = hasPermission('staff.manage');

  // Active Tab: 'staff' | 'roles'
  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<SystemPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('sales_agent');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status toggle state
  const [operatingStaffId, setOperatingStaffId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Role Modals state
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isCloneRoleOpen, setIsCloneRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);

  // Role Form State
  const [roleFormId, setRoleFormId] = useState('');
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDescription, setRoleFormDescription] = useState('');
  const [roleFormPermissions, setRoleFormPermissions] = useState<string[]>([]);
  const [roleFormIsActive, setRoleFormIsActive] = useState(true);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fetchedStaff, fetchedInvites, fetchedRoles, fetchedPerms] = await Promise.all([
        staffService.getStaffList(),
        staffService.getPendingInvitations(),
        staffService.getRoles(),
        staffService.getAllPermissions(),
      ]);
      setStaffList(fetchedStaff);
      setInvitations(fetchedInvites);
      setRoles(fetchedRoles);
      setAllPermissions(fetchedPerms);

      // Default invite role to first active role if current is invalid
      const activeRoles = fetchedRoles.filter((r) => r.isActive);
      if (activeRoles.length > 0 && !activeRoles.some((r) => r.id === inviteRole)) {
        setInviteRole(activeRoles[0].id);
      }
    } catch (err: unknown) {
      console.error('[AdminStaffPage] Error loading data:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load staff records';
      setActionError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [inviteRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionError(null);
    setActionSuccess(null);
    loadData();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!inviteEmail || !inviteEmail.includes('@')) {
      setActionError('Please provide a valid email address.');
      return;
    }
    if (!inviteName || inviteName.trim().length < 2) {
      setActionError('Full name must be at least 2 characters.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await staffService.inviteStaff(inviteEmail, inviteName, inviteRole);
      setActionSuccess(res.message || 'Staff invitation registered successfully.');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process staff invitation.';
      setActionError(msg);
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRoleChange = async (staffId: string, newRoleId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setOperatingStaffId(staffId);
    try {
      await staffService.updateStaffRole(staffId, newRoleId);
      setActionSuccess('Staff role updated successfully.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role.';
      setActionError(msg);
    } finally {
      setOperatingStaffId(null);
    }
  };

  const handleToggleStatus = async (staffMember: StaffMember) => {
    if (staffMember.id === user?.id && staffMember.isActive) {
      setActionError('You cannot deactivate your own active session.');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setOperatingStaffId(staffMember.id);
    try {
      await staffService.toggleStaffStatus(staffMember.id, !staffMember.isActive);
      setActionSuccess(
        `Staff account ${staffMember.isActive ? 'deactivated' : 'activated'} successfully.`
      );
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle account status.';
      setActionError(msg);
    } finally {
      setOperatingStaffId(null);
    }
  };

  const handleResendInvitation = async (email: string, invitationId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setResendingId(invitationId);
    try {
      const res = await staffService.resendInvitation(email, invitationId);
      setActionSuccess(res.message);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invitation.';
      setActionError(msg);
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to revoke this pending invitation?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await staffService.deleteInvitation(invitationId);
      setActionSuccess('Invitation revoked.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invitation.';
      setActionError(msg);
    }
  };

  // Role Management Handlers
  const openCreateRole = () => {
    setRoleFormId('');
    setRoleFormName('');
    setRoleFormDescription('');
    setRoleFormPermissions(['dashboard.view']);
    setRoleFormIsActive(true);
    setIsCreateRoleOpen(true);
  };

  const openEditRole = (role: SystemRole) => {
    setSelectedRole(role);
    setRoleFormId(role.id);
    setRoleFormName(role.name);
    setRoleFormDescription(role.description || '');
    setRoleFormPermissions(role.permissions || []);
    setRoleFormIsActive(role.isActive !== false);
    setIsEditRoleOpen(true);
  };

  const openCloneRole = (role: SystemRole) => {
    setSelectedRole(role);
    setRoleFormId(`${role.id}_copy`);
    setRoleFormName(`${role.name} (Copy)`);
    setRoleFormDescription(role.description || '');
    setRoleFormPermissions(role.permissions || []);
    setRoleFormIsActive(true);
    setIsCloneRoleOpen(true);
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRole(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await staffService.createRole(
        roleFormId,
        roleFormName,
        roleFormDescription,
        roleFormPermissions
      );
      setActionSuccess(`Role "${roleFormName}" created successfully.`);
      setIsCreateRoleOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create role.';
      setActionError(msg);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsSubmittingRole(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await staffService.updateRole(
        selectedRole.id,
        roleFormName,
        roleFormDescription,
        roleFormPermissions,
        roleFormIsActive
      );
      setActionSuccess(`Role "${roleFormName}" updated successfully.`);
      setIsEditRoleOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role.';
      setActionError(msg);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleCloneRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsSubmittingRole(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await staffService.cloneRole(selectedRole.id, roleFormId, roleFormName, roleFormDescription);
      setActionSuccess(`Role "${roleFormName}" created from "${selectedRole.name}".`);
      setIsCloneRoleOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clone role.';
      setActionError(msg);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (role: SystemRole) => {
    if (role.isSystem || role.id === 'super_admin') {
      setActionError('System roles are protected and cannot be deleted.');
      return;
    }
    if ((role.assignedStaffCount || 0) > 0) {
      setActionError(
        `Cannot delete role "${role.name}": ${role.assignedStaffCount} staff member(s) are assigned to it.`
      );
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete role "${role.name}"?`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      await staffService.deleteRole(role.id);
      setActionSuccess(`Role "${role.name}" removed successfully.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role.';
      setActionError(msg);
    }
  };

  const togglePermission = (permId: string) => {
    if (selectedRole?.id === 'super_admin') return; // Super admin keeps all
    setRoleFormPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const getRoleBadgeVariant = (roleId: string) => {
    switch (roleId) {
      case 'super_admin':
        return 'navy';
      case 'admin_manager':
        return 'orange';
      case 'pricing_manager':
        return 'info';
      case 'quotation_officer':
        return 'info';
      case 'sales_agent':
        return 'success';
      default:
        return 'default';
    }
  };

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce(
    (acc, perm) => {
      const mod = perm.module || 'general';
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {} as Record<string, SystemPermission[]>
  );

  const activeRolesForInvite = roles.filter((r) => r.isActive !== false);

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-600">
              Access Governance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              Active Security Layer
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-orange-500" />
            Staff Accounts & Security Roles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated team personnel, assign operational privileges, and customize
            security roles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold whitespace-nowrap"
          >
            Refresh
          </Button>

          {canManageStaff && activeTab === 'staff' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Staff
            </Button>
          )}

          {canManageStaff && activeTab === 'roles' && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateRole}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Custom Role
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <Alert variant="error" title="Operation Notice">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'staff'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-brand-orange-500 text-brand-navy-950'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Roles & Permissions ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <>
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Active Staff
                  </p>
                  <p className="text-2xl font-black text-brand-navy-950 mt-1">
                    {staffList.filter((s) => s.isActive).length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Accounts
                  </p>
                  <p className="text-2xl font-black text-brand-navy-950 mt-1">{staffList.length}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pending Invites
                  </p>
                  <p className="text-2xl font-black text-brand-navy-950 mt-1">
                    {invitations.length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Active Staff Directory Table */}
          <Card className="bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-brand-navy-950">Active Staff Directory</h3>
                <p className="text-xs text-slate-500">
                  Personnel with authorized access to operational, quotation, or financial
                  workflows.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 font-medium">Loading staff records...</p>
              </div>
            ) : staffList.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No staff members found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Invite your team members to grant operational access.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      {canManageStaff && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((member) => {
                      const isSelf = member.id === user?.id;
                      const isOperating = operatingStaffId === member.id;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-navy-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {member.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {member.fullName}
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 font-mono text-[11px]">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {canManageStaff ? (
                              <select
                                value={member.roleId}
                                disabled={isOperating}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 focus:border-brand-orange-500 cursor-pointer disabled:opacity-50"
                              >
                                {roles
                                  .filter((r) => r.isActive || r.id === member.roleId)
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name} {!r.isActive ? '(Inactive)' : ''}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <Badge variant={getRoleBadgeVariant(member.roleId)}>
                                {member.roleName}
                              </Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {member.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(member.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          {canManageStaff && (
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant={member.isActive ? 'outline' : 'secondary'}
                                size="sm"
                                disabled={isSelf || isOperating}
                                onClick={() => handleToggleStatus(member)}
                                className="text-[11px] py-1 px-2.5 font-bold"
                                title={
                                  isSelf
                                    ? 'Cannot deactivate your own active session'
                                    : member.isActive
                                      ? 'Deactivate account'
                                      : 'Activate account'
                                }
                              >
                                {member.isActive ? (
                                  <span className="text-rose-600 flex items-center gap-1">
                                    <UserX className="w-3 h-3" /> Deactivate
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" /> Activate
                                  </span>
                                )}
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Pending Invitations Table */}
          {invitations.length > 0 && (
            <Card className="bg-white border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-brand-navy-950 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-500" />
                    Pending Staff Invitations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authorized invitations awaiting registration or email confirmation.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Invited Email</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Designated Role</th>
                      <th className="py-3 px-4">Channel / Status</th>
                      <th className="py-3 px-4">Invited At</th>
                      {canManageStaff && <th className="py-3 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.email}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{inv.fullName}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getRoleBadgeVariant(inv.roleId)}>{inv.roleName}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {inv.emailSent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Mail className="w-3 h-3 text-emerald-600" />
                              Email Dispatched
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                              title="Outbound email service unconfigured; invitation recorded in directory."
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              Record Only (Pending Acceptance)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.createdAt).toLocaleString()}
                        </td>
                        {canManageStaff && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={resendingId === inv.id}
                                onClick={() => handleResendInvitation(inv.email, inv.id)}
                                className="text-[11px] py-0.5 px-2"
                              >
                                {resendingId === inv.id ? 'Sending...' : 'Resend'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteInvitation(inv.id)}
                                className="text-[11px] py-0.5 px-2 text-rose-600 hover:bg-rose-50"
                              >
                                Revoke
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <Card className="bg-white border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-brand-navy-950">System & Custom Roles</h3>
                <p className="text-xs text-slate-500">
                  Role configurations determine granular permissions across shipping quotations,
                  tariffs, routes, and customer directories.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Role Name & Key</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    {canManageStaff && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map((r) => {
                    const isSuper = r.id === 'super_admin';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{r.id}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                          {r.description || 'No description'}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.isSystem ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              System Base
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Custom Role
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {r.assignedStaffCount || 0} user{r.assignedStaffCount === 1 ? '' : 's'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-brand-navy-950">
                            <KeyRound className="w-3 h-3 text-brand-orange-500" />
                            {r.permissions?.length || 0} granted
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <Check className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        {canManageStaff && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditRole(r)}
                                className="text-[11px] py-1 px-2"
                                title="Edit Role & Permissions"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCloneRole(r)}
                                className="text-[11px] py-1 px-2 text-blue-600 hover:bg-blue-50"
                                title="Clone Role"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              {!r.isSystem && !isSuper && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={(r.assignedStaffCount || 0) > 0}
                                  onClick={() => handleDeleteRole(r)}
                                  className="text-[11px] py-1 px-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                  title={
                                    (r.assignedStaffCount || 0) > 0
                                      ? 'Cannot delete role with assigned staff'
                                      : 'Delete Role'
                                  }
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Staff Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Staff Member"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="e.g. sales@fakheralamshipping.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The user will sign in with this email. If they already have an account, their staff
              access will be enabled immediately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Tariq Mansoor"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Security Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 focus:border-brand-orange-500"
            >
              {activeRolesForInvite.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.description || 'Custom role'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isSubmittingInvite}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingInvite}
              className="font-bold"
            >
              {isSubmittingInvite ? 'Registering...' : 'Confirm & Send Invitation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        title="Create Custom Security Role"
      >
        <form onSubmit={handleCreateRoleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role Key (Unique Identifier) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. customs_specialist"
              value={roleFormId}
              onChange={(e) => setRoleFormId(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lowercase letters, numbers, and underscores only (e.g. terminal_coordinator).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role Display Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Customs Specialist"
              value={roleFormName}
              onChange={(e) => setRoleFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <Input
              type="text"
              placeholder="Brief description of operational responsibilities"
              value={roleFormDescription}
              onChange={(e) => setRoleFormDescription(e.target.value)}
            />
          </div>

          {/* Permissions Matrix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Granted Permissions ({roleFormPermissions.length} selected)
            </label>
            <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <div key={moduleName} className="space-y-1">
                  <div className="font-bold uppercase text-[10px] text-brand-orange-600 tracking-wider">
                    {moduleName}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {perms.map((p) => {
                      const isChecked = roleFormPermissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 rounded text-brand-orange-500 focus:ring-brand-orange-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.id}</span>
                            <span className="text-[11px] text-slate-500">{p.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateRoleOpen(false)}
              disabled={isSubmittingRole}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingRole}
              className="font-bold"
            >
              {isSubmittingRole ? 'Saving...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditRoleOpen}
        onClose={() => setIsEditRoleOpen(false)}
        title={`Edit Role: ${selectedRole?.name || ''}`}
      >
        <form onSubmit={handleEditRoleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role Display Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={roleFormName}
              onChange={(e) => setRoleFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <Input
              type="text"
              value={roleFormDescription}
              onChange={(e) => setRoleFormDescription(e.target.value)}
            />
          </div>

          {selectedRole?.id !== 'super_admin' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="roleFormIsActive"
                checked={roleFormIsActive}
                onChange={(e) => setRoleFormIsActive(e.target.checked)}
                className="rounded text-brand-orange-500 focus:ring-brand-orange-500"
              />
              <label
                htmlFor="roleFormIsActive"
                className="text-xs font-bold text-slate-700 cursor-pointer"
              >
                Role is Active for Assignment
              </label>
            </div>
          )}

          {/* Permissions Matrix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Granted Permissions ({roleFormPermissions.length} selected)
              {selectedRole?.id === 'super_admin' && (
                <span className="text-brand-orange-600 font-normal ms-2">
                  (Super Admin retains all permissions)
                </span>
              )}
            </label>
            <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <div key={moduleName} className="space-y-1">
                  <div className="font-bold uppercase text-[10px] text-brand-orange-600 tracking-wider">
                    {moduleName}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {perms.map((p) => {
                      const isChecked = roleFormPermissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={selectedRole?.id === 'super_admin'}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 rounded text-brand-orange-500 focus:ring-brand-orange-500 disabled:opacity-60"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.id}</span>
                            <span className="text-[11px] text-slate-500">{p.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditRoleOpen(false)}
              disabled={isSubmittingRole}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingRole}
              className="font-bold"
            >
              {isSubmittingRole ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clone Role Modal */}
      <Modal
        isOpen={isCloneRoleOpen}
        onClose={() => setIsCloneRoleOpen(false)}
        title={`Clone Role: ${selectedRole?.name || ''}`}
      >
        <form onSubmit={handleCloneRoleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Role Identifier <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={roleFormId}
              onChange={(e) => setRoleFormId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Role Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={roleFormName}
              onChange={(e) => setRoleFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <Input
              type="text"
              value={roleFormDescription}
              onChange={(e) => setRoleFormDescription(e.target.value)}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            This new role will inherit all {roleFormPermissions.length} permissions currently
            assigned to {selectedRole?.name}.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCloneRoleOpen(false)}
              disabled={isSubmittingRole}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingRole}
              className="font-bold"
            >
              {isSubmittingRole ? 'Cloning...' : 'Confirm & Create Clone'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
