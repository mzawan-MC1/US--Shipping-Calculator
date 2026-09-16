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
  AlertTriangle,
  UserX,
  UserCheck,
} from 'lucide-react';

export const AdminStaffPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManageStaff = hasPermission('staff.manage');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
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

  const loadData = useCallback(async () => {
    try {
      const [fetchedStaff, fetchedInvites, fetchedRoles] = await Promise.all([
        staffService.getStaffList(),
        staffService.getPendingInvitations(),
        staffService.getRoles(),
      ]);
      setStaffList(fetchedStaff);
      setInvitations(fetchedInvites);
      setRoles(fetchedRoles);
    } catch (err: unknown) {
      console.error('[AdminStaffPage] Error loading data:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load staff records';
      setActionError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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
      setInviteRole('sales_agent');
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

  const getRoleBadgeVariant = (roleId: string) => {
    switch (roleId) {
      case 'super_admin':
        return 'navy';
      case 'admin_manager':
        return 'orange';
      case 'pricing_manager':
        return 'info';
      case 'sales_agent':
        return 'success';
      default:
        return 'default';
    }
  };

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
              RBAC Matrix Active
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-orange-500" />
            Staff Accounts & Permissions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated staff members, assign security roles, and invite operational
            personnel.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManageStaff && (
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
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <Alert variant="error" title="Operation Failed">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

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
              <p className="text-2xl font-black text-brand-navy-950 mt-1">{invitations.length}</p>
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
              Personnel with authorized access to operational, quotation, or financial workflows.
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
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
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
                  <th className="py-3 px-4">Invited At</th>
                  {canManageStaff && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.email}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{inv.fullName}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadgeVariant(inv.roleId)}>{inv.roleName}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.createdAt).toLocaleString()}
                    </td>
                    {canManageStaff && (
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvitation(inv.id)}
                          className="text-[11px] py-0.5 px-2 text-rose-600 hover:bg-rose-50"
                        >
                          Revoke
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Role Permissions Reference Card */}
      <Card className="p-4 sm:p-5 bg-slate-50 border border-slate-200">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Security Architecture Notice: Staff Registration Policy
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Public self-registration for staff is strictly disabled in PostgreSQL and Supabase Auth.
          All operational accounts must be invited or provisioned by an active Super Admin holding
          the{' '}
          <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono font-bold">
            staff.manage
          </code>{' '}
          permission. Role assignments immediately take effect on the next session refresh.
        </p>
      </Card>

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
              Assigned System Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange-500 focus:border-brand-orange-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.description}
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
    </div>
  );
};
